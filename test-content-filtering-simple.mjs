/**
 * Simple test script to verify content filtering functionality
 */

import { countWords, hasImages, isEmbedHeavy } from './dist/server/utils/contentFiltering.js';

// Test HTML samples
const sampleHTML = {
  simple: '<p>Hello world</p>',
  withImages: '<p>Some text</p><img src="example.jpg" alt="Example" />',
  withEmbeds: '<p>Check this out:</p><iframe src="https://example.com"></iframe>'
};

// Test basic functions
console.log('Test: countWords');
console.log('Simple HTML:', countWords(sampleHTML.simple));
console.log('With images:', countWords(sampleHTML.withImages));
console.log('With embeds:', countWords(sampleHTML.withEmbeds));

console.log('\nTest: hasImages');
console.log('Simple HTML:', hasImages(sampleHTML.simple));
console.log('With images:', hasImages(sampleHTML.withImages));
console.log('With embeds:', hasImages(sampleHTML.withEmbeds));

console.log('\nTest: isEmbedHeavy');
console.log('Simple HTML:', isEmbedHeavy(sampleHTML.simple));
console.log('With images:', isEmbedHeavy(sampleHTML.withImages));
console.log('With embeds:', isEmbedHeavy(sampleHTML.withEmbeds));