// null means no workflow → all transitions allowed
export type AllowedTransitions = Record<string, string[]> | null;

export function isTransitionAllowed(
  allowedTransitions: AllowedTransitions,
  fromStatusId: string,
  toStatusId: string
): boolean {
  if (!allowedTransitions) return true;
  return allowedTransitions[fromStatusId]?.includes(toStatusId) ?? false;
}
