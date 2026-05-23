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

  it('forces target="_blank" rel="noopener" on anchors', () => {
    const html = sanitizeCommentMd('See [docs](https://example.com).');
    expect(html).toMatch(/<a [^>]*href="https:\/\/example\.com"/);
    expect(html).toMatch(/<a [^>]*target="_blank"/);
    expect(html).toMatch(/<a [^>]*rel="[^"]*noopener[^"]*"/);
  });

  it('strips event-handler attributes from allowed tags', () => {
    const raw =
      '<a href="https://example.com" onclick="alert(1)" onmouseover="alert(2)">x</a>';
    const html = sanitizeCommentMd(raw);
    expect(html).not.toMatch(/onclick/i);
    expect(html).not.toMatch(/onmouseover/i);
    expect(html).toMatch(/href="https:\/\/example\.com"/);
  });

  it('preserves fenced code blocks with language class, unhighlighted', () => {
    const md = ['```ts', 'const x: number = 1;', '```'].join('\n');
    const html = sanitizeCommentMd(md);
    expect(html).toMatch(/<pre>/);
    expect(html).toMatch(/<code [^>]*class="language-ts"/);
    expect(html).toContain('const x: number = 1;');
    expect(html).not.toMatch(/<span/);
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
