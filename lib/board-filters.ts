export type BoardFilters = {
  search: string;
  assigneeId: string | null; // "__unassigned__" for no assignee
  issueTypeId: string | null;
};

export const EMPTY_FILTERS: BoardFilters = {
  search: "",
  assigneeId: null,
  issueTypeId: null,
};

export function hasActiveFilters(filters: BoardFilters): boolean {
  return !!(filters.search || filters.assigneeId || filters.issueTypeId);
}

type FilterableIssue = {
  title: string;
  identifier: string;
  assignee: { id: string } | null;
  issueType?: { id: string } | null;
};

export function filterIssues<T extends FilterableIssue>(issues: T[], filters: BoardFilters): T[] {
  const search = filters.search.toLowerCase().trim();
  return issues.filter((issue) => {
    if (
      search &&
      !issue.title.toLowerCase().includes(search) &&
      !issue.identifier.toLowerCase().includes(search)
    ) {
      return false;
    }
    if (filters.assigneeId !== null) {
      if (filters.assigneeId === "__unassigned__") {
        if (issue.assignee !== null) return false;
      } else {
        if (issue.assignee?.id !== filters.assigneeId) return false;
      }
    }
    if (filters.issueTypeId !== null && issue.issueType?.id !== filters.issueTypeId) {
      return false;
    }
    return true;
  });
}
