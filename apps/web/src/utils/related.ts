import type { PostFrontmatter } from '@/types';

export function relatedByTags(
  index: readonly PostFrontmatter[],
  currentId: string,
  currentTags: readonly string[],
  limit = 5,
): PostFrontmatter[] {
  if (currentTags.length === 0) return [];
  const tagSet = new Set(currentTags);
  const scored: { post: PostFrontmatter; score: number }[] = [];
  for (const p of index) {
    if (p.id === currentId) continue;
    let score = 0;
    for (const t of p.tags) if (tagSet.has(t)) score++;
    if (score > 0) scored.push({ post: p, score });
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.post.updatedAt !== b.post.updatedAt)
      return a.post.updatedAt < b.post.updatedAt ? 1 : -1;
    return a.post.id < b.post.id ? -1 : 1;
  });
  return scored.slice(0, limit).map((s) => s.post);
}
