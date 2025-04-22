import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import sax from "sax";
import { createWriteStream, unlink } from "fs";
import { insertConversionSchema, conversionOptionsSchema, insertMarkdownPostSchema } from "@shared/schema";
import path from "path";
import JSZip from "jszip";
import { Readable } from "stream";
import TurndownService from "turndown";
import { pipeline } from "stream/promises";
import fs from "fs/promises";
import { createReadStream } from "fs";
import { createGunzip } from "zlib";
import os from "os";

// Setup file upload with multer
const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (req, file, cb) => {
      cb(null, `wordpress-${Date.now()}-${file.originalname}`);
    }
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/xml' || 
        file.mimetype === 'text/xml' || 
        file.originalname.endsWith('.xml') ||
        file.originalname.endsWith('.xml.gz')) {
      cb(null, true);
    } else {
      cb(new Error('Only XML files are allowed'));
    }
  }
});

// Initialize turndown service for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

// Add rules for WordPress specific elements
turndownService.addRule('wpImage', {
  filter: (node: any): boolean => {
    if (!node || node.nodeName !== 'IMG') return false;
    const imgClass = node.getAttribute ? node.getAttribute('class') : null;
    const imgSrc = node.getAttribute ? node.getAttribute('src') : null;
    return (imgClass?.includes('wp-image') || imgSrc?.includes('wp-content')) || false;
  },
  replacement: (content: string, node: any): string => {
    const alt = node.getAttribute ? node.getAttribute('alt') || '' : '';
    const src = node.getAttribute ? node.getAttribute('src') || '' : '';
    return `![${alt}](${src})`;
  }
});

// Handle shortcodes
turndownService.addRule('wpShortcode', {
  filter: (node: any): boolean => {
    if (!node || node.nodeName !== '#text') return false;
    const content = node.textContent || '';
    return /\[.+?\]/.test(content);
  },
  replacement: (content: string): string => {
    // Just preserve shortcodes in markdown
    return content;
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // Route to upload a WordPress XML file
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Parse options
      const options = conversionOptionsSchema.parse(req.body.options ? JSON.parse(req.body.options) : {});

      // Create a new conversion record
      const conversion = await storage.createConversion({
        filename: req.file.originalname,
        status: 'processing',
        totalPosts: 0,
        processedPosts: 0,
        options,
        createdAt: new Date().toISOString(),
      });

      // Return the conversion ID immediately so the client can start polling for progress
      res.status(201).json({ conversionId: conversion.id });

      // Start processing the file in the background
      processXmlFile(req.file.path, conversion.id, options)
        .catch(err => {
          console.error('Error processing XML file:', err);
          storage.updateConversionStatus(conversion.id, 'failed');
        });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  });

  // Route to get conversion progress
  app.get('/api/conversions/:id/progress', async (req, res) => {
    try {
      const conversionId = parseInt(req.params.id);
      const conversion = await storage.getConversion(conversionId);

      if (!conversion) {
        return res.status(404).json({ message: 'Conversion not found' });
      }

      const processedPosts = conversion.processedPosts || 0;
      const totalPosts = conversion.totalPosts || 0;
      
      res.json({
        status: conversion.status,
        processed: processedPosts,
        total: totalPosts,
        percentage: totalPosts > 0 
          ? Math.round((processedPosts / totalPosts) * 100) 
          : 0
      });
    } catch (error) {
      console.error('Error getting conversion progress:', error);
      res.status(500).json({ message: 'Failed to get conversion progress' });
    }
  });

  // Route to get all posts for a conversion
  app.get('/api/conversions/:id/posts', async (req, res) => {
    try {
      const conversionId = parseInt(req.params.id);
      const posts = await storage.getMarkdownPosts(conversionId);

      res.json(posts);
    } catch (error) {
      console.error('Error getting posts:', error);
      res.status(500).json({ message: 'Failed to get posts' });
    }
  });

  // Route to get a specific post
  app.get('/api/posts/:id', async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getMarkdownPost(postId);

      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      res.json(post);
    } catch (error) {
      console.error('Error getting post:', error);
      res.status(500).json({ message: 'Failed to get post' });
    }
  });

  // Route to download all posts as a zip file
  app.get('/api/conversions/:id/download', async (req, res) => {
    try {
      const conversionId = parseInt(req.params.id);
      const conversion = await storage.getConversion(conversionId);
      const posts = await storage.getMarkdownPosts(conversionId);

      if (!conversion) {
        return res.status(404).json({ message: 'Conversion not found' });
      }

      // Create a zip file
      const zip = new JSZip();

      // Add each post to the zip
      for (const post of posts) {
        let filename = '';
        
        if ((conversion.options as any)?.splitFiles) {
          // Create a safe filename from the post title
          const safeTitle = post.slug.replace(/[^a-z0-9]/gi, '-').toLowerCase();
          filename = `${safeTitle}.md`;
        } else {
          filename = `posts/${post.id}.md`;
        }

        // Format the markdown content with metadata as frontmatter if requested
        let content = '';
        if ((conversion.options as any)?.includeMetadata) {
          content += '---\n';
          content += `title: "${post.title}"\n`;
          content += `date: "${post.date}"\n`;
          
          // Add other metadata from the metadata object
          for (const [key, value] of Object.entries(post.metadata as Record<string, any>)) {
            if (typeof value === 'string') {
              content += `${key}: "${value}"\n`;
            } else if (Array.isArray(value)) {
              content += `${key}: [${value.map(v => `"${v}"`).join(', ')}]\n`;
            }
          }
          
          content += '---\n\n';
        }

        content += post.content;
        zip.file(filename, content);
      }

      // Generate the zip file
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

      // Set headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${conversion.filename.replace('.xml', '')}.md.zip"`);
      res.setHeader('Content-Type', 'application/zip');
      
      // Send the zip file
      res.send(zipBuffer);
    } catch (error) {
      console.error('Error downloading posts:', error);
      res.status(500).json({ message: 'Failed to download posts' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Function to process the XML file
async function processXmlFile(filePath: string, conversionId: number, options: any) {
  try {
    const isGzipped = filePath.endsWith('.gz');
    const parser = sax.parser(true, { trim: true, normalize: true });
    
    let currentPost: any = null;
    let currentTag = '';
    let currentContent = '';
    let inItem = false;
    let inPostMeta = false;
    let currentMetaKey = '';
    let currentMetaValue = '';
    let currentCategory: any = null;
    let postCount = 0;
    let processedCount = 0;
    
    // First pass: count the total number of posts
    await countPosts(filePath, isGzipped)
      .then(count => {
        postCount = count;
        return storage.updateConversionProgress(conversionId, 0, count);
      });
    
    // Set up event handlers for the SAX parser
    parser.onopentag = (node) => {
      currentTag = node.name;
      
      if (node.name === 'item') {
        inItem = true;
        currentPost = {
          title: '',
          content: '',
          date: '',
          slug: '',
          metadata: {
            author: '',
            categories: [],
            tags: [],
            custom_fields: {}
          }
        };
      } else if (node.name === 'wp:postmeta') {
        inPostMeta = true;
        currentMetaKey = '';
        currentMetaValue = '';
      } else if (node.name === 'category' && inItem) {
        // Initialize a new category with attributes
        currentCategory = {
          domain: node.attributes.domain,
          nicename: node.attributes.nicename,
          name: ''
        };
      }
    };
    
    parser.onclosetag = async (tagName) => {
      if (tagName === 'wp:postmeta' && inPostMeta && currentPost) {
        inPostMeta = false;
        // Add the meta field to the post's custom fields
        if (currentMetaKey && currentMetaValue) {
          currentPost.metadata.custom_fields[currentMetaKey] = currentMetaValue;
        }
      } else if (tagName === 'category' && inItem && currentPost && currentCategory) {
        // Add the completed category to the post
        if (currentCategory.domain === 'category') {
          currentPost.metadata.categories.push(currentCategory.name);
        } else if (currentCategory.domain === 'post_tag') {
          currentPost.metadata.tags.push(currentCategory.name);
        }
        currentCategory = null;
      } else if (tagName === 'item' && inItem && currentPost && 
          currentPost.title && 
          (currentPost.content || currentPost['content:encoded'])) {
        
        // Get the content from the appropriate field
        const htmlContent = currentPost['content:encoded'] || currentPost.content;
        
        // Check content quality if filtering is enabled
        let shouldProcess = true;
        let qualityMetrics: ContentQualityMetrics | null = null;
        
        if ((options as any).filterLowValueContent) {
          qualityMetrics = analyzeContentQuality(htmlContent, options);
          
          // Skip low-value content
          if (qualityMetrics.isLowValue) {
            shouldProcess = false;
            console.log(`Skipping low-value content: "${currentPost.title}" (words: ${qualityMetrics.wordCount}, ratio: ${qualityMetrics.textToHtmlRatio.toFixed(2)})`);
          }
          
          // Skip draft posts if option is enabled
          if ((options as any).excludeDraftPosts && currentPost['wp:status'] === 'draft') {
            shouldProcess = false;
            console.log(`Skipping draft post: "${currentPost.title}"`);
          }
        }
        
        if (shouldProcess) {
          // Convert HTML to Markdown
          let markdownContent = turndownService.turndown(htmlContent);
          
          // Create the markdown post
          try {
            // Add quality metrics to the metadata if available
            const contentMetadata: any = {
              author: currentPost['dc:creator'] || '',
              categories: currentPost.metadata.categories,
              tags: currentPost.metadata.tags,
              status: currentPost['wp:status'] || 'publish',
              type: currentPost['wp:post_type'] || 'post',
              custom_fields: currentPost.metadata.custom_fields,
              excerpt: currentPost['excerpt:encoded'] || ''
            };
            
            // Add quality metrics if available
            if (qualityMetrics) {
              contentMetadata.contentQuality = {
                wordCount: qualityMetrics.wordCount,
                textToHtmlRatio: qualityMetrics.textToHtmlRatio,
                hasImages: qualityMetrics.hasImages,
                hasEmbeds: qualityMetrics.hasEmbeds
              };
            }
            
            await storage.createMarkdownPost({
              conversionId,
              title: currentPost.title,
              content: markdownContent,
              date: currentPost.pubDate || currentPost['wp:post_date'] || new Date().toISOString(),
              slug: currentPost['wp:post_name'] || slugify(currentPost.title),
              metadata: contentMetadata
            });
          } catch (err) {
            console.error('Error creating markdown post:', err);
          }
        }
        
        processedCount++;
        
        // Update progress every 5 posts
        if (processedCount % 5 === 0) {
          await storage.updateConversionProgress(conversionId, processedCount, postCount);
        }
        
        inItem = false;
        currentPost = null;
      }
      
      currentTag = '';
      currentContent = '';
    };
    
    parser.ontext = (text) => {
      // Handle post meta text
      if (inPostMeta) {
        if (currentTag === 'wp:meta_key') {
          currentMetaKey = text.trim();
        } else if (currentTag === 'wp:meta_value') {
          currentMetaValue = text;
        }
        return;
      }
      
      // Handle regular text content
      if (inItem && currentPost && currentTag) {
        if (!currentPost[currentTag]) {
          currentPost[currentTag] = text;
        } else if (Array.isArray(currentPost[currentTag])) {
          currentPost[currentTag].push(text);
        } else {
          currentPost[currentTag] += text;
        }
      }
    };
    
    parser.oncdata = (text) => {
      if (inPostMeta && currentTag === 'wp:meta_value') {
        currentMetaValue = text;
        return;
      }
      
      if (inItem && currentPost) {
        if (currentTag === 'content:encoded') {
          if (!currentPost[currentTag]) {
            currentPost[currentTag] = text;
          } else {
            currentPost[currentTag] += text;
          }
        } else if (currentTag === 'excerpt:encoded') {
          currentPost[currentTag] = text;
        } else if (currentTag === 'dc:creator') {
          currentPost[currentTag] = text;
        } else if (currentTag === 'category' && currentCategory) {
          // Set the category name from CDATA
          currentCategory.name = text;
        }
      }
    };
    
    // Create read stream
    let fileStream = createReadStream(filePath);
    
    // If file is gzipped, add gunzip transform
    await new Promise<void>((resolve, reject) => {
      parser.onend = () => resolve();
      parser.onerror = (err) => reject(err);
      
      if (isGzipped) {
        const gunzip = createGunzip();
        fileStream.pipe(gunzip).pipe(parser as any);
      } else {
        fileStream.pipe(parser as any);
      }
    });
    
    // Update final progress
    await storage.updateConversionProgress(conversionId, processedCount, postCount);
    await storage.updateConversionStatus(conversionId, 'completed');
    
    // Clean up the temporary file
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error processing XML file:', error);
    await storage.updateConversionStatus(conversionId, 'failed');
    
    // Attempt to clean up the temporary file
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      console.error('Error deleting temporary file:', unlinkError);
    }
  }
}

// Utility function to count posts in XML file
async function countPosts(filePath: string, isGzipped: boolean): Promise<number> {
  return new Promise((resolve, reject) => {
    let count = 0;
    const parser = sax.parser(true, { trim: true });
    
    parser.onopentag = (node) => {
      if (node.name === 'item') {
        count++;
      }
    };
    
    parser.onerror = (err) => {
      reject(err);
    };
    
    parser.onend = () => {
      resolve(count);
    };
    
    const fileStream = createReadStream(filePath);
    
    if (isGzipped) {
      const gunzip = createGunzip();
      fileStream.pipe(gunzip).pipe(parser as any);
    } else {
      fileStream.pipe(parser as any);
    }
  });
}

// Utility function to create a slug from a title
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/&/g, '-and-')   // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-');  // Replace multiple - with single -
}

// Content quality analysis utilities
interface ContentQualityMetrics {
  wordCount: number;
  textToHtmlRatio: number;
  hasImages: boolean;
  hasEmbeds: boolean;
  isLowValue: boolean;
}

/**
 * Count words in a string
 */
function countWords(text: string): number {
  // Remove HTML tags first
  const cleanText = text.replace(/<[^>]*>/g, ' ');
  // Replace non-word characters with spaces
  const words = cleanText.replace(/[^\w\s]/g, ' ').trim().split(/\s+/);
  return words.filter(word => word.length > 0).length;
}

/**
 * Calculate text to HTML ratio
 * A higher ratio means more actual content vs. HTML markup
 */
function calculateTextToHtmlRatio(html: string): number {
  if (!html || html.length === 0) return 0;
  
  const textContent = html.replace(/<[^>]*>/g, '').trim();
  return textContent.length / html.length;
}

/**
 * Check if content has images (img tags)
 */
function hasImages(html: string): boolean {
  return /<img[^>]*>/i.test(html);
}

/**
 * Check if content seems to be primarily embeds (iframes, embeds, etc.)
 */
function isEmbedHeavy(html: string): boolean {
  const embedRegex = /<(iframe|embed|object)[^>]*>/gi;
  const embedMatches = html.match(embedRegex) || [];
  const contentLength = html.length;
  
  // If the content is short and has embeds
  return embedMatches.length > 0 && contentLength < 1000;
}

/**
 * Analyze content quality based on various metrics
 */
function analyzeContentQuality(html: string, options: any): ContentQualityMetrics {
  const wordCount = countWords(html);
  const textToHtmlRatio = calculateTextToHtmlRatio(html);
  const contentHasImages = hasImages(html);
  const isEmbedContent = isEmbedHeavy(html);
  
  // Determine if this is low-value content based on options
  const isLowValue = 
    (wordCount < options.minWordCount) || 
    (textToHtmlRatio < options.minTextToHtmlRatio) ||
    (options.excludeEmbedOnlyPosts && isEmbedContent) ||
    (options.excludeNoImages && !contentHasImages);
  
  return {
    wordCount,
    textToHtmlRatio,
    hasImages: contentHasImages,
    hasEmbeds: isEmbedContent,
    isLowValue
  };
}
