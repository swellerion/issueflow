export type StatusCategory = "TODO" | "IN_PROGRESS" | "DONE";

export const STATUS_CATEGORIES = [
  { value: "TODO" as const,        label: "To Do",       color: "#64748b", bg: "#f1f5f9", text: "#0f172a" },
  { value: "IN_PROGRESS" as const, label: "In Progress", color: "#d97706", bg: "#fef3c7", text: "#451a03" },
  { value: "DONE" as const,        label: "Done",        color: "#16a34a", bg: "#dcfce7", text: "#052e16" },
] as const;

export function getCategoryMeta(cat: StatusCategory) {
  return STATUS_CATEGORIES.find((c) => c.value === cat) ?? STATUS_CATEGORIES[0];
}

export const CATEGORY_VALUES = STATUS_CATEGORIES.map((c) => c.value);

export function isValidCategory(v: unknown): v is StatusCategory {
  return typeof v === "string" && (CATEGORY_VALUES as string[]).includes(v);
}
