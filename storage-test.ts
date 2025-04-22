// Simple test storage implementation
type Conversion = {
  id: number;
  filename: string;
  status: string;
  totalPosts: number;
  processedPosts: number;
  options: any;
  createdAt: string;
};

type MarkdownPost = {
  id: number;
  conversionId: number;
  title: string;
  slug: string;
  content: string;
  date: string;
  metadata: {
    author: string;
    categories: string[];
    tags: string[];
    status?: string;
    type?: string;
    [key: string]: any;
  };
};

type InsertConversion = Omit<Conversion, 'id'>;
type InsertMarkdownPost = Omit<MarkdownPost, 'id'>;

export interface IStorage {
  createConversion(conversion: InsertConversion): Promise<Conversion>;
  getConversion(id: number): Promise<Conversion | undefined>;
  updateConversionProgress(id: number, processed: number, total: number): Promise<Conversion>;
  updateConversionStatus(id: number, status: string): Promise<Conversion>;
  createMarkdownPost(post: InsertMarkdownPost): Promise<MarkdownPost>;
  getMarkdownPosts(conversionId: number): Promise<MarkdownPost[]>;
  getMarkdownPost(id: number): Promise<MarkdownPost | undefined>;
}

export class MemStorage implements IStorage {
  private conversions: Map<number, Conversion>;
  private markdownPosts: Map<number, MarkdownPost>;
  private nextConversionId: number;
  private nextPostId: number;

  constructor() {
    this.conversions = new Map();
    this.markdownPosts = new Map();
    this.nextConversionId = 1;
    this.nextPostId = 1;
  }

  async createConversion(conversion: InsertConversion): Promise<Conversion> {
    const id = this.nextConversionId++;
    const newConversion: Conversion = { ...conversion, id };
    this.conversions.set(id, newConversion);
    return newConversion;
  }

  async getConversion(id: number): Promise<Conversion | undefined> {
    return this.conversions.get(id);
  }

  async updateConversionProgress(id: number, processed: number, total: number): Promise<Conversion> {
    const conversion = this.conversions.get(id);
    if (!conversion) {
      throw new Error(`Conversion with id ${id} not found`);
    }

    const updatedConversion: Conversion = {
      ...conversion,
      processedPosts: processed,
      totalPosts: total
    };

    this.conversions.set(id, updatedConversion);
    return updatedConversion;
  }

  async updateConversionStatus(id: number, status: string): Promise<Conversion> {
    const conversion = this.conversions.get(id);
    if (!conversion) {
      throw new Error(`Conversion with id ${id} not found`);
    }

    const updatedConversion: Conversion = {
      ...conversion,
      status
    };

    this.conversions.set(id, updatedConversion);
    return updatedConversion;
  }

  async createMarkdownPost(post: InsertMarkdownPost): Promise<MarkdownPost> {
    const id = this.nextPostId++;
    const newPost: MarkdownPost = { ...post, id };
    this.markdownPosts.set(id, newPost);
    return newPost;
  }

  async getMarkdownPosts(conversionId: number): Promise<MarkdownPost[]> {
    return Array.from(this.markdownPosts.values())
      .filter(post => post.conversionId === conversionId);
  }

  async getMarkdownPost(id: number): Promise<MarkdownPost | undefined> {
    return this.markdownPosts.get(id);
  }
}

export const storage = new MemStorage();
