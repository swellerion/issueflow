import dynamic from "next/dynamic";
import { Textarea } from "@/components/ui/textarea";

export const RichTextEditorDynamic = dynamic(
  () => import("./rich-text-editor").then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => <Textarea rows={4} disabled placeholder="Loading editor…" />,
  }
);
