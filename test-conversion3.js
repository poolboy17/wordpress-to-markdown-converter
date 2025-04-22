import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MemStorage } from './storage-test.js';
import sax from 'sax';
import TurndownService from 'turndown';

// Calculate __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a storage instance for testing
const storage = new MemStorage();

// Initialize turndown service for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

// Add rules for WordPress specific elements
turndownService.addRule('wpImage', {
  filter: (node) => {
    return node.nodeName === 'IMG' && 
      (node.getAttribute('class')?.includes('wp-image') || node.getAttribute('src')?.includes('wp-content'));
  },
  replacement: (content, node) => {
    const alt = node.getAttribute('alt') || '';
    const src = node.getAttribute('src') || '';
    return `![${alt}](${src})`;
  }
});

// Handle shortcodes
turndownService.addRule('wpShortcode', {
  filter: (node) => {
    if (node.nodeName !== '#text') return false;
    const content = node.textContent || '';
    return /\[.+?\]/.test(content);
  },
  replacement: (content) => {
    // Just preserve shortcodes in markdown
    return content;
  }
});

// Function to create a slug from a title
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/&/g, '-and-')   // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-');  // Replace multiple - with single -
}

async function runTest() {
  console.log('Starting conversion test...');
  
  // Path to test file
  const testFilePath = path.join(__dirname, 'test-wordpress-export.xml');
  
  // Check if file exists
  if (!fs.existsSync(testFilePath)) {
    console.error('Test file not found:', testFilePath);
    return;
  }
  
  console.log('Test file found, starting conversion...');
  
  try {
    // Create a new conversion record
    const conversion = await storage.createConversion({
      filename: 'test-wordpress-export.xml',
      status: 'processing',
      totalPosts: 0,
      processedPosts: 0,
      options: {
        preserveImages: true,
        processShortcodes: true,
        includeMetadata: true,
        splitFiles: true
      },
      createdAt: new Date().toISOString(),
    });
    
    console.log(`Created conversion with ID: ${conversion.id}`);
    
    // Parse the XML file
    const xmlData = fs.readFileSync(testFilePath, 'utf8');
    const parser = sax.parser(true, { trim: true, normalize: true });
    
    let currentPost = null;
    let currentTag = '';
    let currentContent = '';
    let inItem = false;
    let inPostMeta = false;
    let currentMetaKey = '';
    let currentMetaValue = '';
    let currentCategory = null;
    let postCount = 0;
    let processedCount = 0;
    
    // Count posts in the XML
    const match = xmlData.match(/<item>/g);
    if (match) {
      postCount = match.length;
      console.log(`Found ${postCount} posts in XML file`);
      await storage.updateConversionProgress(conversion.id, 0, postCount);
    }
    
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
    
    parser.ontext = (text) => {
      // Store current text content
      currentContent = text;
      
      if (inPostMeta) {
        if (currentTag === 'wp:meta_key') {
          currentMetaKey = text.trim();
        } else if (currentTag === 'wp:meta_value') {
          currentMetaValue = text;
        }
        return;
      }
      
      if (inItem && currentPost && currentTag) {
        // For regular text content
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
        
        // Convert HTML to Markdown
        let markdownContent = turndownService.turndown(htmlContent);
        
        console.log(`\nConverting post: ${currentPost.title}`);
        console.log(`Original HTML length: ${htmlContent.length}`);
        console.log(`Converted Markdown length: ${markdownContent.length}`);
        
        // Debug metadata
        console.log("Categories:", currentPost.metadata.categories);
        console.log("Tags:", currentPost.metadata.tags);
        console.log("Custom fields:", currentPost.metadata.custom_fields);
        
        // Create the markdown post
        try {
          const post = await storage.createMarkdownPost({
            conversionId: conversion.id,
            title: currentPost.title,
            content: markdownContent,
            date: currentPost.pubDate || currentPost['wp:post_date'] || new Date().toISOString(),
            slug: currentPost['wp:post_name'] || slugify(currentPost.title),
            metadata: {
              author: currentPost['dc:creator'] || '',
              categories: currentPost.metadata.categories,
              tags: currentPost.metadata.tags,
              status: currentPost['wp:status'] || 'publish',
              type: currentPost['wp:post_type'] || 'post',
              custom_fields: currentPost.metadata.custom_fields,
              excerpt: currentPost['excerpt:encoded'] || ''
            }
          });
          
          console.log(`Created markdown post with ID: ${post.id}`);
          console.log(`Title: ${post.title}`);
          console.log(`Slug: ${post.slug}`);
          console.log(`Date: ${post.date}`);
          console.log(`Metadata: ${JSON.stringify(post.metadata, null, 2)}`);
          console.log(`First 150 chars of content: ${post.content.substring(0, 150)}...`);
          
          processedCount++;
          await storage.updateConversionProgress(conversion.id, processedCount, postCount);
        } catch (err) {
          console.error('Error creating markdown post:', err);
        }
        
        inItem = false;
        currentPost = null;
      }
      
      currentTag = '';
      currentContent = '';
    };
    
    // Parse the XML
    parser.write(xmlData).close();
    
    // Update final progress
    await storage.updateConversionProgress(conversion.id, processedCount, postCount);
    await storage.updateConversionStatus(conversion.id, 'completed');
    
    console.log(`\nConversion completed! Processed ${processedCount} posts.`);
    
    // Get all posts to verify
    const posts = await storage.getMarkdownPosts(conversion.id);
    console.log(`\nRetrieved ${posts.length} posts for conversion ID ${conversion.id}`);
    
    // Log all posts' full content
    if (posts.length > 0) {
      for (let i = 0; i < posts.length; i++) {
        console.log(`\nPost ${i+1} full markdown content:`);
        console.log('-'.repeat(80));
        console.log(posts[i].content);
        console.log('-'.repeat(80));
      }
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error in conversion test:', error);
  }
}

// Run the test
runTest();