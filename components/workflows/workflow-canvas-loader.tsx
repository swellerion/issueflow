"use client";

import dynamic from "next/dynamic";

const WorkflowCanvas = dynamic(
  () => import("@/components/workflows/workflow-canvas").then((m) => m.WorkflowCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading canvas…
      </div>
    ),
  }
);

export { WorkflowCanvas };
