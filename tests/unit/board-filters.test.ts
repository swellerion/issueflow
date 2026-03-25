import { describe, it, expect } from "vitest";
import { filterIssues, hasActiveFilters, EMPTY_FILTERS } from "@/lib/board-filters";

const user1 = { id: "u1", username: "alice" };
const user2 = { id: "u2", username: "bob" };
const type1 = { id: "t1", name: "Bug" };
const type2 = { id: "t2", name: "Feature" };

const issues = [
  { id: "1", identifier: "PROJ-1", title: "Fix login bug", statusId: "s1", assignee: user1, issueType: type1, linksTo: [] },
  { id: "2", identifier: "PROJ-2", title: "Add dark mode",  statusId: "s2", assignee: user2, issueType: type2, linksTo: [] },
  { id: "3", identifier: "PROJ-3", title: "Update readme",  statusId: "s1", assignee: null,  issueType: null,  linksTo: [] },
];

describe("filterIssues", () => {
  it("returns all issues when no filters active", () => {
    expect(filterIssues(issues, EMPTY_FILTERS)).toHaveLength(3);
  });

  it("filters by search on title", () => {
    const result = filterIssues(issues, { ...EMPTY_FILTERS, search: "login" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by search on identifier", () => {
    const result = filterIssues(issues, { ...EMPTY_FILTERS, search: "proj-2" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("search is case-insensitive", () => {
    expect(filterIssues(issues, { ...EMPTY_FILTERS, search: "LOGIN" })).toHaveLength(1);
    expect(filterIssues(issues, { ...EMPTY_FILTERS, search: "PROJ-1" })).toHaveLength(1);
  });

  it("filters by assignee id", () => {
    const result = filterIssues(issues, { ...EMPTY_FILTERS, assigneeId: "u1" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters for unassigned issues", () => {
    const result = filterIssues(issues, { ...EMPTY_FILTERS, assigneeId: "__unassigned__" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("filters by issue type", () => {
    const result = filterIssues(issues, { ...EMPTY_FILTERS, issueTypeId: "t1" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("excludes issues with null issueType when filtering by type", () => {
    const result = filterIssues(issues, { ...EMPTY_FILTERS, issueTypeId: "t2" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("combines search and assignee filters", () => {
    const result = filterIssues(issues, { search: "bug", assigneeId: "u1", issueTypeId: null });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("returns empty when no issues match", () => {
    expect(filterIssues(issues, { ...EMPTY_FILTERS, search: "xyz-not-found" })).toHaveLength(0);
  });
});

describe("hasActiveFilters", () => {
  it("returns false for empty filters", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("returns true when search is set", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, search: "foo" })).toBe(true);
  });

  it("returns true when assigneeId is set", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, assigneeId: "u1" })).toBe(true);
  });

  it("returns true when issueTypeId is set", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, issueTypeId: "t1" })).toBe(true);
  });
});
