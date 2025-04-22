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
import { 
  shouldProcessPost, 
  ContentQualityMetrics,
  FilteringOptions 
} from "./utils/contentFiltering.js";

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
  app.post('/api/upload', upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          status: 'fail',
          message: 'No file uploaded',
          timestamp: new Date().toISOString()
        });
      }

      // Parse options
      let options;
      try {
        options = conversionOptionsSchema.parse(req.body.options ? JSON.parse(req.body.options) : {});
      } catch (parseError: any) {
        console.error('Error parsing conversion options:', parseError);
        return res.status(400).json({
          status: 'fail',
          message: 'Invalid conversion options',
          data: { error: parseError.message },
          timestamp: new Date().toISOString()
        });
      }

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
      res.status(201).json({ 
        status: 'success',
        conversionId: conversion.id, 
        message: 'Conversion started successfully',
        timestamp: new Date().toISOString()
      });

      // Start processing the file in the background
      processXmlFile(req.file.path, conversion.id, options)
        .catch(err => {
          console.error('Error processing XML file:', err);
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          storage.updateConversionStatus(conversion.id, 'failed');
          
          // Add error details to the conversion record
          // Note: In a real implementation, you might want to add an 'errorDetails' field to the Conversion type
          // This is a simplified approach for demonstration purposes
          storage.updateConversionProgress(conversion.id, 0, 0)
            .catch(updateErr => {
              console.error('Error updating conversion after failure:', updateErr);
            });
        });
    } catch (error) {
      console.error('Error uploading file:', error);
      next(error); // Pass to global error handler
    }
  });

  // Route to get conversion progress
  app.get('/api/conversions/:id/progress', async (req, res, next) => {
    try {
      const conversionId = parseInt(req.params.id);
      
      // Check if ID is valid
      if (isNaN(conversionId)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Invalid conversion ID',
          timestamp: new Date().toISOString()
        });
      }
      
      const conversion = await storage.getConversion(conversionId);

      if (!conversion) {
        return res.status(404).json({
          status: 'fail',
          message: 'Conversion not found',
          timestamp: new Date().toISOString()
        });
      }

      const processedPosts = conversion.processedPosts || 0;
      const totalPosts = conversion.totalPosts || 0;
      
      res.json({
        status: 'success',
        data: {
          conversionStatus: conversion.status,
          processed: processedPosts,
          total: totalPosts,
          percentage: totalPosts > 0 
            ? Math.round((processedPosts / totalPosts) * 100) 
            : 0
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting conversion progress:', error);
      next(error);
    }
  });

  // Route to get all posts for a conversion
  app.get('/api/conversions/:id/posts', async (req, res, next) => {
    try {
      const conversionId = parseInt(req.params.id);
      
      // Check if ID is valid
      if (isNaN(conversionId)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Invalid conversion ID',
          timestamp: new Date().toISOString()
        });
      }
      
      const conversion = await storage.getConversion(conversionId);
      
      // Check if conversion exists
      if (!conversion) {
        return res.status(404).json({
          status: 'fail',
          message: 'Conversion not found',
          timestamp: new Date().toISOString()
        });
      }
      
      const posts = await storage.getMarkdownPosts(conversionId);

      // If conversion is complete but no posts found, it might indicate an issue
      if (conversion.status === 'completed' && posts.length === 0) {
        return res.status(200).json({
          status: 'success',
          data: [],
          message: 'No posts were found or all posts were filtered out',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        status: 'success',
        data: posts,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting posts:', error);
      next(error);
    }
  });

  // Route to get a specific post
  app.get('/api/posts/:id', async (req, res, next) => {
    try {
      const postId = parseInt(req.params.id);
      
      // Check if ID is valid
      if (isNaN(postId)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Invalid post ID',
          timestamp: new Date().toISOString()
        });
      }
      
      const post = await storage.getMarkdownPost(postId);

      if (!post) {
        return res.status(404).json({
          status: 'fail',
          message: 'Post not found',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        status: 'success',
        data: post,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting post:', error);
      next(error);
    }
  });

  // Route to download all posts as a zip file
  app.get('/api/conversions/:id/download', async (req, res, next) => {
    try {
      const conversionId = parseInt(req.params.id);
      
      // Check if ID is valid
      if (isNaN(conversionId)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Invalid conversion ID',
          timestamp: new Date().toISOString()
        });
      }
      
      const conversion = await storage.getConversion(conversionId);
      
      // Check if conversion exists
      if (!conversion) {
        return res.status(404).json({
          status: 'fail',
          message: 'Conversion not found',
          timestamp: new Date().toISOString()
        });
      }

      // Check if conversion is completed
      if (conversion.status !== 'completed') {
        return res.status(400).json({
          status: 'fail',
          message: `Cannot download: conversion is in '${conversion.status}' status`,
          timestamp: new Date().toISOString()
        });
      }
      
      const posts = await storage.getMarkdownPosts(conversionId);
      
      // Check if there are any posts to download
      if (!posts || posts.length === 0) {
        return res.status(404).json({
          status: 'fail',
          message: 'No posts found for this conversion',
          timestamp: new Date().toISOString()
        });
      }

      // Create a zip file
      const zip = new JSZip();
      
      // Add a README file with information about the conversion
      const readmeContent = `# WordPress to Markdown Conversion
      
Converted from: ${conversion.filename}
Date: ${new Date(conversion.createdAt).toLocaleString()}
Posts: ${posts.length}

## Conversion Options
${Object.entries(conversion.options as Record<string, any>)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

---
Generated by WordPress to Markdown Converter
`;
      
      zip.file('README.md', readmeContent);

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

      try {
        // Generate the zip file
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

        // Set headers for download
        const safeFilename = conversion.filename.replace(/[^a-z0-9\.]/gi, '-').toLowerCase().replace('.xml', '');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.md.zip"`);
        res.setHeader('Content-Type', 'application/zip');
        
        // Send the zip file
        res.send(zipBuffer);
      } catch (zipError) {
        console.error('Error generating zip file:', zipError);
        return res.status(500).json({
          status: 'error',
          message: 'Failed to generate zip file',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error downloading posts:', error);
      next(error);
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
        
        // Use the separated content filtering module
        const filteringResult = shouldProcessPost(
          currentPost, 
          htmlContent, 
          options as FilteringOptions
        );
        
        const shouldProcess = filteringResult.shouldProcess;
        const qualityMetrics = filteringResult.qualityMetrics;
        
        // Log skipped content
        if (!shouldProcess && filteringResult.skipReason) {
          console.log(`Skipping ${filteringResult.skipReason}: "${currentPost.title}"`);
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

// Import content filtering utilities from the dedicated module
// This functions have been relocated to server/utils/contentFiltering.ts
