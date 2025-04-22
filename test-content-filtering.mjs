// Simple test script for content filtering module
import { countWords, calculateTextToHtmlRatio, hasImages, isEmbedHeavy, isSystemGeneratedPage, analyzeContentQuality, shouldProcessPost } from './server/utils/contentFiltering.js';

console.log('=== Testing Content Filtering Module ===');

// Test countWords
console.log('\nTesting countWords:');
console.log(`countWords('<p>Hello World</p>') => ${countWords('<p>Hello World</p>')}`);
console.log(`countWords('<div><h1>Test</h1><p>One two three</p></div>') => ${countWords('<div><h1>Test</h1><p>One two three</p></div>')}`);

// Test textToHtmlRatio
console.log('\nTesting calculateTextToHtmlRatio:');
console.log(`calculateTextToHtmlRatio('<p>Hello</p>') => ${calculateTextToHtmlRatio('<p>Hello</p>')}`);
console.log(`calculateTextToHtmlRatio('<div class="wrapper"><div class="container"><p>Small text</p></div></div>') => ${calculateTextToHtmlRatio('<div class="wrapper"><div class="container"><p>Small text</p></div></div>')}`);

// Test hasImages
console.log('\nTesting hasImages:');
console.log(`hasImages('<img src="example.jpg" />') => ${hasImages('<img src="example.jpg" />')}`);
console.log(`hasImages('<p>No image here</p>') => ${hasImages('<p>No image here</p>')}`);

// Test isEmbedHeavy
console.log('\nTesting isEmbedHeavy:');
console.log(`isEmbedHeavy('<iframe src="example.com"></iframe>') => ${isEmbedHeavy('<iframe src="example.com"></iframe>')}`);
console.log(`isEmbedHeavy('<p>No embed here</p>') => ${isEmbedHeavy('<p>No embed here</p>')}`);

// Test isSystemGeneratedPage
console.log('\nTesting isSystemGeneratedPage:');
const tagPage = {
  'wp:post_type': 'page',
  'wp:post_name': 'tag-example',
  title: 'Tag: Example',
  link: 'https://example.com/tag/example'
};
console.log('Tag page check:', isSystemGeneratedPage(tagPage));

const regularPost = {
  'wp:post_type': 'post',
  'wp:post_name': 'regular-post',
  title: 'Regular Post',
  link: 'https://example.com/regular-post'
};
console.log('Regular post check:', isSystemGeneratedPage(regularPost));

// Test analyzeContentQuality
console.log('\nTesting analyzeContentQuality:');

// Mock filtering options
const options = {
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

// High quality content
const highQualityHTML = `
  <p>This is a high-quality article with rich content and a good text-to-HTML ratio.</p>
  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi.</p>
  <img src="example.jpg" alt="Example image" />
  <p>Curabitur non ultricies felis. Proin fermentum massa sit amet tellus.</p>
  ${`<p>Lorem ipsum dolor sit amet</p>`.repeat(50)}
`;
console.log('High quality content analysis:', analyzeContentQuality(highQualityHTML, options));

// Low quality content
const lowQualityHTML = `
  <p>This is a short post with only a few words.</p>
  <p>It doesn't contain much valuable content.</p>
`;
console.log('Low quality content analysis:', analyzeContentQuality(lowQualityHTML, options));

// Test shouldProcessPost
console.log('\nTesting shouldProcessPost:');

console.log('Should process high quality post:', shouldProcessPost(regularPost, highQualityHTML, options));
console.log('Should process low quality post:', shouldProcessPost(regularPost, lowQualityHTML, options));
console.log('Should process tag page with good content:', shouldProcessPost(tagPage, highQualityHTML, options));

// Test with filtering disabled
console.log('\nTesting with filtering disabled:');
const noFilterOptions = { ...options, filterLowValueContent: false };
console.log('Should process low quality post (filtering disabled):', shouldProcessPost(regularPost, lowQualityHTML, noFilterOptions));
console.log('Should process tag page (filtering disabled):', shouldProcessPost(tagPage, highQualityHTML, noFilterOptions));