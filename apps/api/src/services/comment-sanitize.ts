import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeCommentMd(bodyMd: string): string {
  const html = marked.parse(bodyMd, { async: false }) as string;
  return DOMPurify.sanitize(html);
}
