import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PullRequestSection } from "./pull-request-section";
import type { PullRequestSummary } from "@/lib/github/types";

function makePR(overrides: Partial<PullRequestSummary> = {}): PullRequestSummary {
  return {
    id: 1,
    number: 1,
    title: "Add feature",
    authorLogin: "octocat",
    updatedAt: new Date().toISOString(),
    state: "open",
    ...overrides,
  };
}

describe("PullRequestSection", () => {
  it("zeigt einen Leerzustand, wenn es keine offenen PRs gibt (AC-8)", () => {
    render(<PullRequestSection openPRs={[]} closedPRs={[]} />);
    expect(screen.getByText("Keine offenen Pull Requests.")).toBeInTheDocument();
  });

  it("zeigt offene und geschlossene PRs getrennt (AC-2, AC-3)", () => {
    render(
      <PullRequestSection
        openPRs={[makePR({ id: 1, title: "Open PR" })]}
        closedPRs={[makePR({ id: 2, title: "Closed PR", state: "closed" })]}
      />
    );
    expect(screen.getByText(/Open PR/)).toBeInTheDocument();
    expect(screen.getByText(/Closed PR/)).toBeInTheDocument();
    expect(screen.getByText("Zuletzt geschlossen")).toBeInTheDocument();
  });
});
