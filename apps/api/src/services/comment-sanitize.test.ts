import { describe, expect, it } from 'vitest';
import { sanitizeCommentMd } from './comment-sanitize.js';

describe('sanitizeCommentMd whitelist', () => {
  it('preserves allowed inline and block tags', () => {
    const md = [
      'A paragraph with **strong** and *em* and `code`.',
      '',
      '> A blockquote.',
      '',
      '- one',
      '- two',
      '',
      '1. first',
      '2. second',
    ].join('\n');
    const html = sanitizeCommentMd(md);
    expect(html).toMatch(/<p>/);
    expect(html).toMatch(/<strong>/);
    expect(html).toMatch(/<em>/);
    expect(html).toMatch(/<code>/);
    expect(html).toMatch(/<blockquote>/);
    expect(html).toMatch(/<ul>/);
    expect(html).toMatch(/<ol>/);
    expect(html).toMatch(/<li>/);
  });

  it('strips <img>, <iframe>, and <style>', () => {
    const md = [
      'Hello',
      '',
      '<img src="x" onerror="alert(1)" />',
      '<iframe src="evil"></iframe>',
      '<style>body{display:none}</style>',
    ].join('\n');
    const html = sanitizeCommentMd(md);
    expect(html).not.toMatch(/<img/i);
    expect(html).not.toMatch(/<iframe/i);
    expect(html).not.toMatch(/<style/i);
    expect(html).toMatch(/Hello/);
  });
});
