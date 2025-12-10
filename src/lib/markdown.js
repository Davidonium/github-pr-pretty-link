/**
 * Converts markdown-style links to HTML anchor tags
 * @param {string} text - Text with markdown links like [text](url)
 * @returns {string} - Text with HTML links like <a href="url">text</a>
 */
export function markdownLinksToHtml(text) {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
