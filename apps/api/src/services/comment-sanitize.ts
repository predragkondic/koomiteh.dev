import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'p',
  'a',
  'strong',
  'em',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'blockquote',
  'br',
];

const ALLOWED_ATTR = ['href', 'class', 'target', 'rel'];

export function sanitizeCommentMd(bodyMd: string): string {
  const html = marked.parse(bodyMd, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
