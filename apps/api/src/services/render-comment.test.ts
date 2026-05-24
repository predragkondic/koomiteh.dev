import { describe, expect, it } from 'vitest';
import { renderCommentBody } from '@koomiteh/shared';

describe('renderCommentBody', () => {
  it('wraps a plain-text line in a single <p>', () => {
    expect(renderCommentBody('Hello world')).toBe('<p>Hello world</p>');
  });

  it('renders a fenced code block with language as <pre><code class="language-X">', () => {
    const md = '```ts\nconst x = 1;\n```';
    expect(renderCommentBody(md)).toBe(
      '<pre><code class="language-ts">const x = 1;</code></pre>',
    );
  });

  it('renders a fenced code block without language as <pre><code> (no class)', () => {
    const md = '```\nconst x = 1;\n```';
    expect(renderCommentBody(md)).toBe(
      '<pre><code>const x = 1;</code></pre>',
    );
  });

  it('wraps backtick-delimited inline spans in <code>', () => {
    expect(renderCommentBody('Use `queueMicrotask` here')).toBe(
      '<p>Use <code>queueMicrotask</code> here</p>',
    );
  });

  it('splits a blank-line-separated input into multiple <p>', () => {
    expect(renderCommentBody('First paragraph.\n\nSecond paragraph.')).toBe(
      '<p>First paragraph.</p><p>Second paragraph.</p>',
    );
  });

  it('converts a single newline inside a paragraph to <br>', () => {
    expect(renderCommentBody('Line one\nLine two')).toBe(
      '<p>Line one<br>Line two</p>',
    );
  });

  it('HTML-escapes raw tags in plain text so XSS payloads render literally', () => {
    expect(renderCommentBody('<script>alert(1)</script>')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
    );
  });

  it('HTML-escapes content inside fenced code blocks', () => {
    expect(renderCommentBody('```\n<script>alert(1)</script>\n```')).toBe(
      '<pre><code>&lt;script&gt;alert(1)&lt;/script&gt;</code></pre>',
    );
  });

  it('HTML-escapes content inside inline code spans', () => {
    expect(renderCommentBody('Try `<script>` here')).toBe(
      '<p>Try <code>&lt;script&gt;</code> here</p>',
    );
  });

  it('escapes ampersands and quotes too', () => {
    expect(renderCommentBody('Tom & Jerry said "hi"')).toBe(
      '<p>Tom &amp; Jerry said &quot;hi&quot;</p>',
    );
  });

  it('renders markdown bold/italic syntax literally (no formatting)', () => {
    expect(renderCommentBody('**bold** and *italic* stay text')).toBe(
      '<p>**bold** and *italic* stay text</p>',
    );
  });

  it('renders markdown link syntax literally (no anchor emitted)', () => {
    expect(renderCommentBody('See [docs](https://example.com).')).toBe(
      '<p>See [docs](https://example.com).</p>',
    );
  });

  it('renders blockquote/heading/list markers as literal text', () => {
    expect(renderCommentBody('> quote\n# heading\n- item')).toBe(
      '<p>&gt; quote<br># heading<br>- item</p>',
    );
  });

  it('combines a paragraph and a fenced code block in order', () => {
    const md = 'Look at this:\n\n```ts\nconst x = 1;\n```';
    expect(renderCommentBody(md)).toBe(
      '<p>Look at this:</p><pre><code class="language-ts">const x = 1;</code></pre>',
    );
  });
});
