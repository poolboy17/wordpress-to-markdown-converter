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
    let inPostMeta = false;
    let currentMetaKey = '';
    let currentMetaValue = '';
    
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
      }
    };
    
    parser.onclosetag = async (tagName) => {
      if (tagName === 'wp:postmeta' && inPostMeta && currentPost) {
        inPostMeta = false;
        // Add the meta field to the post's custom fields
        if (currentMetaKey && currentMetaValue) {
          currentPost.metadata.custom_fields[currentMetaKey] = currentMetaValue;
        }
      } else if (tagName === 'wp:meta_key' && inPostMeta) {
        currentMetaKey = currentContent.trim();
        console.log("Meta key:", currentMetaKey);
      } else if (tagName === 'wp:meta_value' && inPostMeta) {
        currentMetaValue = currentContent;
        console.log("Meta value:", currentMetaValue);
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
        
        // Process categories and tags
        const categories = [];
        const tags = [];
        const custom_fields = currentPost.metadata.custom_fields || {};
        
        // Debug the categories structure
        console.log("Categories object:", JSON.stringify(currentPost.categories, null, 2));
        
        if (currentPost.categories && Array.isArray(currentPost.categories)) {
          // Remove the _lastItem property which is not an array item
          const filteredCategories = currentPost.categories.filter(item => 
            typeof item === 'object' && item !== null && !('_lastItem' in item));
          
          filteredCategories.forEach(cat => {
            if (cat._domain === 'category') {
              categories.push(cat._cdata || cat);
            } else if (cat._domain === 'post_tag') {
              tags.push(cat._cdata || cat);
            }
          });
        }
        
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
              categories: categories.length ? categories : (currentPost.categories || []),
              tags: tags.length ? tags : (currentPost['wp:post_tag'] || []),
              status: currentPost['wp:status'] || 'publish',
              type: currentPost['wp:post_type'] || 'post',
              custom_fields: currentPost.metadata.custom_fields || {},
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
    
    let currentCategoryDomain = '';
    let currentCategoryNicename = '';
    
    parser.onattribute = (attr) => {
      if (inItem && currentTag === 'category') {
        // We'll store these temporarily until we get the CDATA content
        if (attr.name === 'domain') {
          currentCategoryDomain = attr.value;
        } else if (attr.name === 'nicename') {
          currentCategoryNicename = attr.value;
        }
      }
    };
    
    parser.ontext = (text) => {
      // Update current content for later use
      currentContent = text;
      
      if (inPostMeta) {
        if (currentTag === 'wp:meta_key') {
          currentMetaKey = text;
        } else if (currentTag === 'wp:meta_value') {
          currentMetaValue = text;
        }
        return;
      }
      
      if (inItem && currentPost && currentTag) {
        if (currentTag === 'category') {
          // Handle categories separately as they can appear multiple times
          if (!currentPost.categories) {
            currentPost.categories = [];
          }
          
          // Create a category item with the current domain info
          const categoryItem = {
            domain: currentCategoryDomain,
            nicename: currentCategoryNicename,
            name: text.trim()
          };
          
          // Add the category to the list
          currentPost.categories.push(categoryItem);
          
          // Reset the domain and nicename for the next category
          currentCategoryDomain = '';
          currentCategoryNicename = '';
          return;
        }
        
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
        } else if (currentTag === 'category') {
          // For CDATA in categories
          if (!currentPost.categories) {
            currentPost.categories = [];
          }
          
          // Update the last category item with the CDATA content
          if (currentPost.categories.length > 0) {
            const lastIndex = currentPost.categories.length - 1;
            currentPost.categories[lastIndex]._cdata = text;
          } else {
            // If no category item exists yet, create one
            const categoryItem = {
              ...currentPost.categories._lastItem,
              _cdata: text
            };
            currentPost.categories.push(categoryItem);
          }
        }
      }
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