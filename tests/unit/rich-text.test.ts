import { describe, it, expect } from "vitest";
import { isRichTextEmpty } from "@/lib/rich-text";

describe("isRichTextEmpty", () => {
  it("returns true for empty string", () => {
    expect(isRichTextEmpty("")).toBe(true);
  });

  it("returns true for Tiptap empty paragraph", () => {
    expect(isRichTextEmpty("<p></p>")).toBe(true);
  });

  it("returns true for paragraph with only whitespace", () => {
    expect(isRichTextEmpty("<p>   </p>")).toBe(true);
  });

  it("returns true for break-only content", () => {
    expect(isRichTextEmpty("<p><br></p>")).toBe(true);
  });

  it("returns false for paragraph with text", () => {
    expect(isRichTextEmpty("<p>Hello world</p>")).toBe(false);
  });

  it("returns false for bold text", () => {
    expect(isRichTextEmpty("<p><strong>Bold</strong></p>")).toBe(false);
  });

  it("returns false for list with content", () => {
    expect(isRichTextEmpty("<ul><li>Item</li></ul>")).toBe(false);
  });
});
