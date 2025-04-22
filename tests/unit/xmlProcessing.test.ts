import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import { FilteringOptions, shouldProcessPost } from '../../server/utils/contentFiltering.js';

describe('WordPress XML Content Filtering Integration', () => {
  let xmlData: any;
  const sampleXmlPath = path.join(__dirname, '../fixtures/sample-wordpress-content.xml');
  
  beforeAll(async () => {
    // Read and parse the sample XML file
    const xmlContent = fs.readFileSync(sampleXmlPath, 'utf-8');
    xmlData = await parseStringPromise(xmlContent, {
      explicitArray: false,
      mergeAttrs: true
    });
  });
  
  test('Sample XML file exists and can be parsed', () => {
    expect(fs.existsSync(sampleXmlPath)).toBe(true);
    expect(xmlData).toBeTruthy();
    expect(xmlData.rss.channel.item).toBeTruthy();
  });
  
  test('Filters out low-value content correctly from WordPress XML', () => {
    const filterOptions: FilteringOptions = {
      filterLowValueContent: true,
      minWordCount: 700,
      minTextToHtmlRatio: 0.5,
      excludeEmbedOnlyPosts: true,
      excludeDraftPosts: true,
      excludeNoImages: false,
      excludeTagPages: true,
      excludeArchivePages: true,
      excludeAuthorPages: true,
      excludePaginatedPages: true
    };
    
    // Test with filter enabled
    const items = Array.isArray(xmlData.rss.channel.item) 
      ? xmlData.rss.channel.item 
      : [xmlData.rss.channel.item];
    
    // Convert items to our WordPress post format
    const posts = items.map((item: any) => {
      return {
        title: item.title,
        'wp:post_type': item['wp:post_type'],
        'wp:post_name': item['wp:post_name'],
        'wp:status': item['wp:status'],
        'content:encoded': item['content:encoded'],
        link: item.link
      };
    });
    
    // Run filter tests
    const processingResults = posts.map(post => {
      const htmlContent = post['content:encoded'] || '';
      return {
        post,
        result: shouldProcessPost(post, htmlContent, filterOptions)
      };
    });
    
    // Verify filtering behavior for different content types
    const highQualityPosts = processingResults.filter(r => r.result.shouldProcess);
    const filteredPosts = processingResults.filter(r => !r.result.shouldProcess);
    const filteredDrafts = filteredPosts.filter(r => r.post['wp:status'] === 'draft');
    const filteredSystemPages = filteredPosts.filter(
      r => r.result.skipReason?.includes('system-generated')
    );
    
    // Verification that filtering works correctly
    expect(highQualityPosts.length).toBeGreaterThan(0); // Some posts should pass
    expect(filteredPosts.length).toBeGreaterThan(0); // Some posts should be filtered
    expect(filteredDrafts.length).toBeGreaterThan(0); // Draft posts should be filtered
    expect(filteredSystemPages.length).toBeGreaterThan(0); // System pages should be filtered
    
    // When filtering is disabled, all posts should be processed
    const noFilterOptions = { ...filterOptions, filterLowValueContent: false };
    const noFilterResults = posts.map(post => {
      const htmlContent = post['content:encoded'] || '';
      return shouldProcessPost(post, htmlContent, noFilterOptions).shouldProcess;
    });
    
    // All posts should be processed when filtering is disabled
    expect(noFilterResults.every(result => result === true)).toBe(true);
  });
});