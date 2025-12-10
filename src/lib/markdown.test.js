import { test, expect } from "vitest";
import { markdownLinksToHtml, escapeHtml } from "./markdown";

test("markdownLinksToHtml converts simple markdown link", () => {
  const input = "[text](https://example.com)";
  const output = markdownLinksToHtml(input);
  expect(output).toBe('<a href="https://example.com">text</a>');
});

test("markdownLinksToHtml converts multiple links", () => {
  const input = "[link1](url1) some text [link2](url2)";
  const output = markdownLinksToHtml(input);
  expect(output).toBe('<a href="url1">link1</a> some text <a href="url2">link2</a>');
});

test("markdownLinksToHtml preserves text without links", () => {
  const input = "just plain text";
  const output = markdownLinksToHtml(input);
  expect(output).toBe("just plain text");
});

test("markdownLinksToHtml handles link with special characters in text", () => {
  const input = "[org/repo#123](https://github.com/org/repo/pull/123)";
  const output = markdownLinksToHtml(input);
  expect(output).toBe('<a href="https://github.com/org/repo/pull/123">org/repo#123</a>');
});

test("markdownLinksToHtml handles complex text around links", () => {
  const input = "Check [this PR](url) - it fixes the issue";
  const output = markdownLinksToHtml(input);
  expect(output).toBe('Check <a href="url">this PR</a> - it fixes the issue');
});

test("escapeHtml escapes special characters", () => {
  const input = '<script>alert("XSS")</script>';
  const output = escapeHtml(input);
  expect(output).toBe("&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;");
});

test("escapeHtml handles ampersands", () => {
  const input = "A & B";
  const output = escapeHtml(input);
  expect(output).toBe("A &amp; B");
});

test("escapeHtml preserves safe text", () => {
  const input = "Safe text 123";
  const output = escapeHtml(input);
  expect(output).toBe("Safe text 123");
});

test("markdownLinksToHtml with multiple links in PR format", () => {
  const input = "[org/repo#1](url1) - Fix, [org/repo#2](url2) - Another";
  const output = markdownLinksToHtml(input);
  expect(output).toBe(
    '<a href="url1">org/repo#1</a> - Fix, <a href="url2">org/repo#2</a> - Another',
  );
});
