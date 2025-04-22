/**
 * Format a file size in bytes to a human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

/**
 * Convert HTML to Markdown (basic conversion, server handles complete conversion)
 */
export function convertHtmlToMarkdown(html: string): string {
  // This is a very basic conversion just for the frontend
  // The actual conversion is handled by the backend
  
  // Replace headings
  let markdown = html.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  
  // Replace paragraphs
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  
  // Replace strong/bold
  markdown = markdown.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**');
  
  // Replace em/italic
  markdown = markdown.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*');
  
  // Replace links
  markdown = markdown.replace(/<a[^>]*href="(.*?)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Replace lists
  markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gis, '$1\n');
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  
  // Replace blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1\n\n');
  
  // Replace code blocks
  markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n');
  
  // Replace inline code
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  
  // Replace images
  markdown = markdown.replace(/<img[^>]*src="(.*?)"[^>]*alt="(.*?)"[^>]*>/gi, '![$2]($1)');
  
  // Replace breaks
  markdown = markdown.replace(/<br[^>]*>/gi, '\n');
  
  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]*>/g, '');
  
  // Fix multiple line breaks
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  
  return markdown;
}

/**
 * Create a slug from a string
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/&/g, '-and-')   // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-');  // Replace multiple - with single -
}
