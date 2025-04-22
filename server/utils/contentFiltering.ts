/**
 * Content Quality Analysis Module
 * Provides utilities for analyzing and filtering WordPress content based on quality metrics
 */

/**
 * Interface for content quality analysis results
 */
export interface ContentQualityMetrics {
  wordCount: number;
  textToHtmlRatio: number;
  hasImages: boolean;
  hasEmbeds: boolean;
  isLowValue: boolean;
  pageType?: string | null;
}

/**
 * Interface for filtering options
 */
export interface FilteringOptions {
  filterLowValueContent: boolean;
  minWordCount: number;
  minTextToHtmlRatio: number;
  excludeEmbedOnlyPosts: boolean;
  excludeDraftPosts: boolean;
  excludeNoImages: boolean;
  excludeTagPages: boolean;
  excludeArchivePages: boolean;
  excludeAuthorPages: boolean;
  excludePaginatedPages: boolean;
}

/**
 * Count words in a string
 */
export function countWords(text: string): number {
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
export function calculateTextToHtmlRatio(html: string): number {
  if (!html || html.length === 0) return 0;
  
  const textContent = html.replace(/<[^>]*>/g, '').trim();
  return textContent.length / html.length;
}

/**
 * Check if content has images (img tags)
 */
export function hasImages(html: string): boolean {
  return /<img[^>]*>/i.test(html);
}

/**
 * Check if content seems to be primarily embeds (iframes, embeds, etc.)
 */
export function isEmbedHeavy(html: string): boolean {
  const embedRegex = /<(iframe|embed|object)[^>]*>/gi;
  const embedMatches = html.match(embedRegex) || [];
  const contentLength = html.length;
  
  // If the content is short and has embeds
  return embedMatches.length > 0 && contentLength < 1000;
}

/**
 * Check if the post is a system-generated page like tag, archive, author, or paginated page
 */
export function isSystemGeneratedPage(post: any): { isSystemPage: boolean; pageType: string | null } {
  const postType = post['wp:post_type'] || '';
  const postName = post['wp:post_name'] || '';
  const postTitle = post.title || '';
  const postLink = post.link || '';
  
  // Check for tag or category page
  if (postType === 'page' && (
      postTitle.toLowerCase().includes('tag:') || 
      postTitle.toLowerCase().includes('category:') ||
      postName.includes('tag-') || 
      postName.includes('category-'))) {
    return { isSystemPage: true, pageType: 'tag' };
  }
  
  // Check for archive page
  if (postType === 'page' && (
      postTitle.toLowerCase().includes('archive') || 
      postName.includes('archive') || 
      postLink.includes('/20') && (postLink.includes('/0') || postLink.includes('/1')))) {
    return { isSystemPage: true, pageType: 'archive' };
  }
  
  // Check for author page
  if (postType === 'page' && (
      postTitle.toLowerCase().includes('author:') || 
      postName.includes('author-') || 
      postLink.includes('/author/'))) {
    return { isSystemPage: true, pageType: 'author' };
  }
  
  // Check for paginated duplicate
  if (postLink.includes('/page/') || 
      postName.includes('-page-') || 
      postName.match(/-\d+$/) || 
      postTitle.match(/Page \d+/i)) {
    return { isSystemPage: true, pageType: 'paginated' };
  }
  
  return { isSystemPage: false, pageType: null };
}

/**
 * Analyze content quality based on various metrics
 */
export function analyzeContentQuality(html: string, options: FilteringOptions, post: any = null): ContentQualityMetrics {
  const wordCount = countWords(html);
  const textToHtmlRatio = calculateTextToHtmlRatio(html);
  const contentHasImages = hasImages(html);
  const isEmbedContent = isEmbedHeavy(html);
  
  // Check if this is a system-generated page
  let isSystemPage = false;
  let pageType = null;
  
  if (post) {
    const systemPageCheck = isSystemGeneratedPage(post);
    isSystemPage = systemPageCheck.isSystemPage;
    pageType = systemPageCheck.pageType;
  }
  
  // Determine if this is low-value content based on options
  let isLowValue = 
    (wordCount < options.minWordCount) || 
    (textToHtmlRatio < options.minTextToHtmlRatio) ||
    (options.excludeEmbedOnlyPosts && isEmbedContent) ||
    (options.excludeNoImages && !contentHasImages);
  
  // Add system page checks
  if (isSystemPage && (
      (pageType === 'tag' && options.excludeTagPages) ||
      (pageType === 'archive' && options.excludeArchivePages) ||
      (pageType === 'author' && options.excludeAuthorPages) ||
      (pageType === 'paginated' && options.excludePaginatedPages)
     )) {
    isLowValue = true;
  }
  
  return {
    wordCount,
    textToHtmlRatio,
    hasImages: contentHasImages,
    hasEmbeds: isEmbedContent,
    isLowValue,
    pageType: isSystemPage ? pageType : null
  };
}

/**
 * Determine if a WordPress post should be processed based on quality and filtering options
 */
export function shouldProcessPost(post: any, htmlContent: string, options: FilteringOptions): {
  shouldProcess: boolean;
  qualityMetrics: ContentQualityMetrics | null;
  skipReason?: string;
} {
  if (!options.filterLowValueContent) {
    return { shouldProcess: true, qualityMetrics: null };
  }
  
  const qualityMetrics = analyzeContentQuality(htmlContent, options, post);
  
  if (qualityMetrics.isLowValue) {
    const systemPageCheck = isSystemGeneratedPage(post);
    
    if (systemPageCheck.isSystemPage) {
      return { 
        shouldProcess: false, 
        qualityMetrics,
        skipReason: `system-generated ${systemPageCheck.pageType} page`
      };
    } else {
      return { 
        shouldProcess: false, 
        qualityMetrics,
        skipReason: `low-value content (words: ${qualityMetrics.wordCount}, ratio: ${qualityMetrics.textToHtmlRatio.toFixed(2)})`
      };
    }
  }
  
  // Check for draft posts separately
  if (options.excludeDraftPosts && post['wp:status'] === 'draft') {
    return { 
      shouldProcess: false, 
      qualityMetrics,
      skipReason: 'draft post'
    };
  }
  
  return { shouldProcess: true, qualityMetrics };
}