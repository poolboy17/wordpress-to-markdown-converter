// Simple test storage implementation for the conversion test

export class MemStorage {
  constructor() {
    this.conversions = new Map();
    this.markdownPosts = new Map();
    this.nextConversionId = 1;
    this.nextPostId = 1;
  }

  async createConversion(conversion) {
    const id = this.nextConversionId++;
    const newConversion = { ...conversion, id };
    this.conversions.set(id, newConversion);
    return newConversion;
  }

  async getConversion(id) {
    return this.conversions.get(id);
  }

  async updateConversionProgress(id, processed, total) {
    const conversion = this.conversions.get(id);
    if (!conversion) {
      throw new Error(`Conversion with id ${id} not found`);
    }

    const updatedConversion = {
      ...conversion,
      processedPosts: processed,
      totalPosts: total
    };

    this.conversions.set(id, updatedConversion);
    return updatedConversion;
  }

  async updateConversionStatus(id, status) {
    const conversion = this.conversions.get(id);
    if (!conversion) {
      throw new Error(`Conversion with id ${id} not found`);
    }

    const updatedConversion = {
      ...conversion,
      status
    };

    this.conversions.set(id, updatedConversion);
    return updatedConversion;
  }

  async createMarkdownPost(post) {
    const id = this.nextPostId++;
    const newPost = { ...post, id };
    this.markdownPosts.set(id, newPost);
    return newPost;
  }

  async getMarkdownPosts(conversionId) {
    return Array.from(this.markdownPosts.values())
      .filter(post => post.conversionId === conversionId);
  }

  async getMarkdownPost(id) {
    return this.markdownPosts.get(id);
  }
}