"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";

type Props = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
};

export function RichTextEditor({ content, onChange, placeholder, className, autoFocus }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "Write something…" }),
    ],
    content,
    autofocus: autoFocus ? "end" : false,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "rich-text-content focus:outline-none min-h-[80px]",
      },
    },
  });

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-within:ring-1 focus-within:ring-ring",
        className
      )}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
