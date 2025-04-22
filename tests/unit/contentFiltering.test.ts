import {
  countWords,
  calculateTextToHtmlRatio,
  hasImages,
  isEmbedHeavy,
  isSystemGeneratedPage,
  analyzeContentQuality,
  shouldProcessPost,
  FilteringOptions
} from '../../server/utils/contentFiltering';

// Define sample filtering options for tests
const baseFilteringOptions: FilteringOptions = {
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

// Setup test samples
const sampleHTML = {
  highQuality: `
    <p>This is a high-quality article with over 700 words of rich content and a good text-to-HTML ratio.</p>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. Maecenas feugiat magna vitae justo feugiat, in porta sapien facilisis. Donec euismod magna sit amet tellus sagittis, a iaculis odio eleifend. Vestibulum pretium metus vel tortor bibendum, ac congue felis ullamcorper.</p>
    <img src="example.jpg" alt="Example image" />
    <p>Curabitur non ultricies felis. Proin fermentum massa sit amet tellus faucibus efficitur. Suspendisse potenti. Cras consectetur libero in orci facilisis, in consequat augue egestas. Mauris elementum arcu nisl, sed pulvinar dui bibendum quis. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Cras accumsan ligula at purus ultrices venenatis.</p>
    ${'<p>Lorem ipsum dolor sit amet</p>'.repeat(50)}
  `,
  lowWordCount: `
    <p>This is a short post with only a few words.</p>
    <p>It doesn't contain much valuable content.</p>
    <p>The word count is well below 700.</p>
  `,
  embedHeavy: `
    <p>Check out this video:</p>
    <iframe width="560" height="315" src="https://www.youtube.com/embed/example" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    <p>Wasn't that great?</p>
  `,
  poorRatio: `
    <div class="wrapper">
      <div class="container">
        <div class="row">
          <div class="col-12">
            <div class="card">
              <div class="card-body">
                <h2 class="card-title">Poor HTML to Text Ratio</h2>
                <p>This content has very few words but lots of HTML markup.</p>
                ${'<div class="empty-div"></div>'.repeat(20)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  noImages: `
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
    <p>Nulla facilisi. Maecenas feugiat magna vitae justo feugiat, in porta sapien facilisis.</p>
    ${'<p>Lorem ipsum dolor sit amet</p>'.repeat(50)}
  `
};

const samplePosts = {
  regularPost: {
    'wp:post_type': 'post',
    'wp:post_name': 'regular-post',
    'wp:status': 'publish',
    title: 'Regular Post',
    link: 'https://example.com/regular-post'
  },
  draftPost: {
    'wp:post_type': 'post',
    'wp:post_name': 'draft-post',
    'wp:status': 'draft',
    title: 'Draft Post',
    link: 'https://example.com/draft-post'
  },
  tagPage: {
    'wp:post_type': 'page',
    'wp:post_name': 'tag-example',
    title: 'Tag: Example',
    link: 'https://example.com/tag/example'
  },
  archivePage: {
    'wp:post_type': 'page',
    'wp:post_name': 'archive-2023',
    title: 'Archive: 2023',
    link: 'https://example.com/2023'
  },
  authorPage: {
    'wp:post_type': 'page',
    'wp:post_name': 'author-admin',
    title: 'Author: Admin',
    link: 'https://example.com/author/admin'
  },
  paginatedPage: {
    'wp:post_type': 'post',
    'wp:post_name': 'example-post-page-2',
    title: 'Example Post Page 2',
    link: 'https://example.com/example-post/page/2'
  }
};

describe('Content Filtering Utilities', () => {
  describe('countWords', () => {
    test('should count words correctly ignoring HTML tags', () => {
      expect(countWords('<p>Hello world</p>')).toBe(2);
      expect(countWords('<div><h1>Test</h1><p>One two three</p></div>')).toBe(4);
      expect(countWords(sampleHTML.highQuality)).toBeGreaterThan(700);
      expect(countWords(sampleHTML.lowWordCount)).toBeLessThan(20);
    });
  });

  describe('calculateTextToHtmlRatio', () => {
    test('should calculate text to HTML ratio correctly', () => {
      expect(calculateTextToHtmlRatio('<p>Hello</p>')).toBeGreaterThan(0.3);
      expect(calculateTextToHtmlRatio(sampleHTML.poorRatio)).toBeLessThan(0.2);
    });

    test('should handle empty content', () => {
      expect(calculateTextToHtmlRatio('')).toBe(0);
    });
  });

  describe('hasImages', () => {
    test('should detect images in HTML', () => {
      expect(hasImages('<img src="example.jpg" />')).toBe(true);
      expect(hasImages('<p>No image here</p>')).toBe(false);
      expect(hasImages(sampleHTML.highQuality)).toBe(true);
      expect(hasImages(sampleHTML.noImages)).toBe(false);
    });
  });

  describe('isEmbedHeavy', () => {
    test('should detect embed-heavy content', () => {
      expect(isEmbedHeavy('<iframe src="example.com"></iframe>')).toBe(true);
      expect(isEmbedHeavy('<p>No embed here</p>')).toBe(false);
      expect(isEmbedHeavy(sampleHTML.embedHeavy)).toBe(true);
    });
  });

  describe('isSystemGeneratedPage', () => {
    test('should detect tag pages', () => {
      const result = isSystemGeneratedPage(samplePosts.tagPage);
      expect(result.isSystemPage).toBe(true);
      expect(result.pageType).toBe('tag');
    });

    test('should detect archive pages', () => {
      const result = isSystemGeneratedPage(samplePosts.archivePage);
      expect(result.isSystemPage).toBe(true);
      expect(result.pageType).toBe('archive');
    });

    test('should detect author pages', () => {
      const result = isSystemGeneratedPage(samplePosts.authorPage);
      expect(result.isSystemPage).toBe(true);
      expect(result.pageType).toBe('author');
    });

    test('should detect paginated pages', () => {
      const result = isSystemGeneratedPage(samplePosts.paginatedPage);
      expect(result.isSystemPage).toBe(true);
      expect(result.pageType).toBe('paginated');
    });

    test('should identify regular posts correctly', () => {
      const result = isSystemGeneratedPage(samplePosts.regularPost);
      expect(result.isSystemPage).toBe(false);
      expect(result.pageType).toBe(null);
    });
  });

  describe('analyzeContentQuality', () => {
    test('should analyze high-quality content correctly', () => {
      const result = analyzeContentQuality(sampleHTML.highQuality, baseFilteringOptions);
      expect(result.wordCount).toBeGreaterThan(700);
      expect(result.hasImages).toBe(true);
      expect(result.isLowValue).toBe(false);
    });

    test('should identify low word count content as low value', () => {
      const result = analyzeContentQuality(sampleHTML.lowWordCount, baseFilteringOptions);
      expect(result.wordCount).toBeLessThan(700);
      expect(result.isLowValue).toBe(true);
    });

    test('should identify embed-heavy content as low value when option is enabled', () => {
      const result = analyzeContentQuality(sampleHTML.embedHeavy, baseFilteringOptions);
      expect(result.hasEmbeds).toBe(true);
      expect(result.isLowValue).toBe(true);
    });

    test('should not flag embed-heavy content when option is disabled', () => {
      const options = { ...baseFilteringOptions, excludeEmbedOnlyPosts: false };
      const result = analyzeContentQuality(sampleHTML.embedHeavy, options);
      expect(result.hasEmbeds).toBe(true);
      expect(result.isLowValue).toBe(true); // It's still low value due to low word count
    });

    test('should identify poor text-to-HTML ratio content as low value', () => {
      const result = analyzeContentQuality(sampleHTML.poorRatio, baseFilteringOptions);
      expect(result.textToHtmlRatio).toBeLessThan(0.5);
      expect(result.isLowValue).toBe(true);
    });

    test('should handle no-image content based on configuration', () => {
      // With excludeNoImages = false
      let result = analyzeContentQuality(sampleHTML.noImages, baseFilteringOptions);
      expect(result.hasImages).toBe(false);
      // Should not be low value solely due to lack of images
      expect(result.isLowValue).toBe(false);

      // With excludeNoImages = true
      const options = { ...baseFilteringOptions, excludeNoImages: true };
      result = analyzeContentQuality(sampleHTML.noImages, options);
      expect(result.hasImages).toBe(false);
      expect(result.isLowValue).toBe(true);
    });

    test('should identify system-generated pages as low value', () => {
      // Test with a tag page
      const result = analyzeContentQuality(
        sampleHTML.highQuality, // Good content but a system page
        baseFilteringOptions,
        samplePosts.tagPage
      );
      expect(result.isLowValue).toBe(true);
      expect(result.pageType).toBe('tag');
    });
  });

  describe('shouldProcessPost', () => {
    test('should process high-quality regular posts', () => {
      const result = shouldProcessPost(
        samplePosts.regularPost,
        sampleHTML.highQuality,
        baseFilteringOptions
      );
      expect(result.shouldProcess).toBe(true);
      expect(result.qualityMetrics?.isLowValue).toBe(false);
    });

    test('should not process low word count posts', () => {
      const result = shouldProcessPost(
        samplePosts.regularPost,
        sampleHTML.lowWordCount,
        baseFilteringOptions
      );
      expect(result.shouldProcess).toBe(false);
      expect(result.skipReason).toContain('low-value content');
    });

    test('should not process draft posts when that option is enabled', () => {
      const result = shouldProcessPost(
        samplePosts.draftPost,
        sampleHTML.highQuality, // Even with good content
        baseFilteringOptions
      );
      expect(result.shouldProcess).toBe(false);
      expect(result.skipReason).toBe('draft post');
    });

    test('should process draft posts when that option is disabled', () => {
      const options = { ...baseFilteringOptions, excludeDraftPosts: false };
      const result = shouldProcessPost(
        samplePosts.draftPost,
        sampleHTML.highQuality,
        options
      );
      expect(result.shouldProcess).toBe(true);
    });

    test('should not process system-generated pages', () => {
      // Test tag page
      let result = shouldProcessPost(
        samplePosts.tagPage,
        sampleHTML.highQuality, // Even with good content
        baseFilteringOptions
      );
      expect(result.shouldProcess).toBe(false);
      expect(result.skipReason).toContain('system-generated tag page');

      // Test archive page
      result = shouldProcessPost(
        samplePosts.archivePage,
        sampleHTML.highQuality,
        baseFilteringOptions
      );
      expect(result.shouldProcess).toBe(false);
      expect(result.skipReason).toContain('system-generated archive page');

      // Test author page
      result = shouldProcessPost(
        samplePosts.authorPage,
        sampleHTML.highQuality,
        baseFilteringOptions
      );
      expect(result.shouldProcess).toBe(false);
      expect(result.skipReason).toContain('system-generated author page');

      // Test paginated page
      result = shouldProcessPost(
        samplePosts.paginatedPage,
        sampleHTML.highQuality,
        baseFilteringOptions
      );
      expect(result.shouldProcess).toBe(false);
      expect(result.skipReason).toContain('system-generated paginated page');
    });

    test('should process everything when filtering is disabled', () => {
      const options = { ...baseFilteringOptions, filterLowValueContent: false };
      
      // Low word count
      let result = shouldProcessPost(
        samplePosts.regularPost,
        sampleHTML.lowWordCount,
        options
      );
      expect(result.shouldProcess).toBe(true);
      expect(result.qualityMetrics).toBe(null);
      
      // Draft post
      result = shouldProcessPost(
        samplePosts.draftPost,
        sampleHTML.highQuality,
        options
      );
      expect(result.shouldProcess).toBe(true);
      
      // Tag page
      result = shouldProcessPost(
        samplePosts.tagPage,
        sampleHTML.highQuality,
        options
      );
      expect(result.shouldProcess).toBe(true);
    });
  });
});