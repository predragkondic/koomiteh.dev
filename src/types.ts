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

export interface ManifestLanguage {
  id: string;
  displayName: string;
  count: number;
}

export interface Manifest {
  languages: ManifestLanguage[];
  totalCount: number;
  builtAt: string;
}

export type SearchIndexJson = unknown;
