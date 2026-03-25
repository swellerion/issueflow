import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";

type Props = {
  html: string;
  className?: string;
};

export function RichTextViewer({ html, className }: Props) {
  const clean = DOMPurify.sanitize(html);
  return (
    <div
      className={cn("rich-text-content text-sm", className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
