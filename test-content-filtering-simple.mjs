/**
 * Comprehensive test script to verify content filtering functionality
 */

import { 
  countWords, 
  hasImages, 
  isEmbedHeavy,
  calculateTextToHtmlRatio,
  isSystemGeneratedPage,
  analyzeContentQuality,
  shouldProcessPost
} from './dist/server/utils/test-content-filtering.js';

// Test HTML samples
const sampleHTML = {
  simple: '<p>Hello world</p>',
  withImages: '<p>Some text</p><img src="example.jpg" alt="Example" />',
  withEmbeds: '<p>Check this out:</p><iframe src="https://example.com"></iframe>',
  longContent: `
    <h1>This is a lengthy article</h1>
    <p>This article has many words and should be considered high-value content based on word count. We need to make sure it exceeds the minimum word count threshold of 300 words.</p>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam a justo vel velit fermentum lobortis. Fusce sed ligula vel nunc posuere facilisis. Nam auctor velit sit amet magna feugiat, vitae ultrices magna maximus. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Donec gravida sagittis odio, a pellentesque metus luctus non. Nullam vel lacus ut justo convallis pulvinar.</p>
    <p>Maecenas euismod magna vel mi volutpat, vel suscipit nunc tincidunt. Vivamus nec sapien vitae sapien viverra venenatis. Donec malesuada, libero in sagittis commodo, sem orci congue libero, vel gravida massa odio eget velit. Cras quis enim eget nisi semper sodales. Integer volutpat tincidunt ex, eu consequat odio ultrices eu. Aenean vitae neque id felis posuere sollicitudin.</p>
    <p>Curabitur efficitur mauris vel orci congue, a faucibus turpis dictum. Fusce lacinia, odio vel congue maximus, libero libero dignissim turpis, a lacinia lectus mi eu dolor. Donec nec risus ac nulla venenatis tempus. Nulla facilisi. Sed vel lectus id neque bibendum malesuada. Phasellus vulputate magna ut turpis sollicitudin, nec tincidunt risus faucibus.</p>
    <p>Sed feugiat dolor eu mi porttitor, at tincidunt risus tincidunt. Nulla facilisi. Phasellus non efficitur nunc. Sed eu magna quis nulla pretium hendrerit. Integer convallis, eros vel sagittis viverra, nulla eros tincidunt dolor, vel lacinia enim nisl vel lorem. Nullam auctor risus vel magna cursus, vel ultricies velit imperdiet.</p>
    <p>Suspendisse potenti. Donec vel magna non magna dapibus ultrices. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Integer at mauris euismod, sollicitudin nunc vel, lobortis odio. Morbi euismod eros vel finibus commodo. Integer vel eros at magna congue fermentum.</p>
    <p>Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Praesent pharetra lectus in tellus pretium, eget consequat mi viverra. Ut consectetur nisi vel lectus tempus, at volutpat sapien eleifend. Ut consectetur felis eget mi convallis, eget dignissim mauris pharetra.</p>
    <img src="example1.jpg" alt="Example 1" />
    <img src="example2.jpg" alt="Example 2" />
  `,
  lowValueContent: '<p>Just a few words.</p>'
};

// Sample WordPress post objects
const samplePosts = {
  normal: {
    title: 'Regular Post',
    slug: 'regular-post',
    'wp:status': 'publish'
  },
  draft: {
    title: 'Draft Post',
    slug: 'draft-post',
    'wp:status': 'draft'
  },
  tagPage: {
    title: 'Tag: WordPress',
    slug: 'tag-wordpress',
    'wp:status': 'publish'
  },
  archivePage: {
    title: 'Archive: January 2023',
    slug: 'archive-2023-01',
    'wp:status': 'publish'
  },
  authorPage: {
    title: 'Author: John Doe',
    slug: 'author-john',
    'wp:status': 'publish'
  },
  paginatedPage: {
    title: 'Blog - Page 2',
    slug: 'blog-page-2',
    'wp:status': 'publish'
  }
};

// Default filtering options
const defaultOptions = {
  filterLowValueContent: true,
  minWordCount: 300,
  minTextToHtmlRatio: 0.15,
  excludeEmbedOnlyPosts: true,
  excludeDraftPosts: true,
  excludeNoImages: false,
  excludeTagPages: true,
  excludeArchivePages: true,
  excludeAuthorPages: true,
  excludePaginatedPages: true
};

// Run tests
console.log('========== BASIC CONTENT ANALYSIS ==========');

console.log('\nTest: countWords');
console.log('Simple HTML:', countWords(sampleHTML.simple));
console.log('With images:', countWords(sampleHTML.withImages));
console.log('With embeds:', countWords(sampleHTML.withEmbeds));
console.log('Long content:', countWords(sampleHTML.longContent));

console.log('\nTest: hasImages');
console.log('Simple HTML:', hasImages(sampleHTML.simple));
console.log('With images:', hasImages(sampleHTML.withImages));
console.log('With embeds:', hasImages(sampleHTML.withEmbeds));
console.log('Long content:', hasImages(sampleHTML.longContent));

console.log('\nTest: isEmbedHeavy');
console.log('Simple HTML:', isEmbedHeavy(sampleHTML.simple));
console.log('With images:', isEmbedHeavy(sampleHTML.withImages));
console.log('With embeds:', isEmbedHeavy(sampleHTML.withEmbeds));

console.log('\nTest: calculateTextToHtmlRatio');
console.log('Simple HTML:', calculateTextToHtmlRatio(sampleHTML.simple).toFixed(2));
console.log('With images:', calculateTextToHtmlRatio(sampleHTML.withImages).toFixed(2));
console.log('With embeds:', calculateTextToHtmlRatio(sampleHTML.withEmbeds).toFixed(2));
console.log('Long content:', calculateTextToHtmlRatio(sampleHTML.longContent).toFixed(2));

console.log('\n========== SYSTEM PAGE DETECTION ==========');
console.log('\nTest: isSystemGeneratedPage');
Object.entries(samplePosts).forEach(([type, post]) => {
  const result = isSystemGeneratedPage(post);
  console.log(`${type}:`, result);
});

console.log('\n========== CONTENT QUALITY ANALYSIS ==========');
console.log('\nTest: analyzeContentQuality');
console.log('Simple HTML:', analyzeContentQuality(sampleHTML.simple, defaultOptions));
console.log('With images:', analyzeContentQuality(sampleHTML.withImages, defaultOptions));
console.log('With embeds:', analyzeContentQuality(sampleHTML.withEmbeds, defaultOptions));
console.log('Long content:', analyzeContentQuality(sampleHTML.longContent, defaultOptions));
console.log('Low value content:', analyzeContentQuality(sampleHTML.lowValueContent, defaultOptions));

console.log('\n========== CONTENT FILTERING DECISIONS ==========');
console.log('\nTest: shouldProcessPost');

// Test combinations of posts and content
const testCases = [
  { post: samplePosts.normal, html: sampleHTML.longContent, label: 'Normal post with long content' },
  { post: samplePosts.normal, html: sampleHTML.lowValueContent, label: 'Normal post with low value content' },
  { post: samplePosts.draft, html: sampleHTML.longContent, label: 'Draft post with long content' },
  { post: samplePosts.tagPage, html: sampleHTML.longContent, label: 'Tag page with long content' },
  { post: samplePosts.normal, html: sampleHTML.withEmbeds, label: 'Normal post with embeds' }
];

testCases.forEach(({ post, html, label }) => {
  const result = shouldProcessPost(post, html, defaultOptions);
  console.log(`\n${label}:`);
  console.log('  Should process:', result.shouldProcess);
  console.log('  Skip reason:', result.skipReason || 'None');
  console.log('  Quality metrics:', result.qualityMetrics ? 
    `Word count: ${result.qualityMetrics.wordCount}, ` +
    `Text/HTML: ${result.qualityMetrics.textToHtmlRatio.toFixed(2)}, ` +
    `Has images: ${result.qualityMetrics.hasImages}, ` +
    `Is low value: ${result.qualityMetrics.isLowValue}` 
    : 'None');
});

// Test with filtering disabled
console.log('\nTest with filtering disabled:');
const noFilteringOptions = { ...defaultOptions, filterLowValueContent: false };
const noFilterResult = shouldProcessPost(samplePosts.tagPage, sampleHTML.lowValueContent, noFilteringOptions);
console.log('  Should process:', noFilterResult.shouldProcess);
console.log('  Skip reason:', noFilterResult.skipReason || 'None');