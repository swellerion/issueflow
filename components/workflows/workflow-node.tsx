"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getCategoryMeta, type StatusCategory } from "@/lib/status-category";

export type WorkflowNodeData = {
  name: string;
  color: string;
  category: StatusCategory;
};

function WorkflowNodeComponent({ data, selected }: NodeProps) {
  const { name, color, category } = data as WorkflowNodeData;
  const cat = getCategoryMeta(category);

  return (
    <div
      className={`px-3 py-1.5 rounded-md border-2 shadow-sm min-w-[110px] text-center transition-shadow ${
        selected ? "shadow-md" : ""
      }`}
      style={{
        borderColor: color,
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
      title="Double-click to edit"
    >
      <Handle id="top"    type="source" position={Position.Top}    className="!bg-muted-foreground" />
      <Handle id="left"   type="source" position={Position.Left}   className="!bg-muted-foreground" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="!bg-muted-foreground" />
      <Handle id="right"  type="source" position={Position.Right}  className="!bg-muted-foreground" />
      <div className="flex items-center gap-1.5 justify-center mb-1">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs font-semibold truncate max-w-[120px]" style={{ color: "var(--foreground)" }}>{name}</span>
      </div>
      <span
        className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none"
        style={{ backgroundColor: cat.bg, color: cat.text }}
      >
        {cat.label}
      </span>
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);
