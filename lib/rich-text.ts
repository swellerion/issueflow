/**
 * Returns true when an HTML string produced by Tiptap is semantically empty
 * (i.e. contains no visible text after stripping tags and whitespace).
 */
export function isRichTextEmpty(html: string): boolean {
  if (!html) return true;
  // Strip all HTML tags and check for remaining text content
  const text = html.replace(/<[^>]*>/g, "").trim();
  return text.length === 0;
}
