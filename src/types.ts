export type Level = 'junior' | 'senior';

export interface PostFrontmatter {
  id: string;
  slug: string;
  question: string;
  language: string;
  level: Level;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  frontmatter: PostFrontmatter;
  bodyHtml: string;
}
