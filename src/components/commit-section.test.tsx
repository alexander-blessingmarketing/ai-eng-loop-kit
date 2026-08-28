import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommitSection } from "./commit-section";

describe("CommitSection", () => {
  it("zeigt einen Leerzustand, wenn es keine Commits gibt (AC-9)", () => {
    render(<CommitSection commits={[]} />);
    expect(screen.getByText("Noch keine Commits in diesem Repo.")).toBeInTheDocument();
  });

  it("zeigt Titel-Zeile und Autor oder Platzhalter (AC-1, EC-1)", () => {
    render(
      <CommitSection
        commits={[
          { sha: "a", titleLine: "Fix bug", authorName: "Ada Lovelace", date: new Date().toISOString() },
          { sha: "b", titleLine: "No author info", authorName: null, date: new Date().toISOString() },
        ]}
      />
    );
    expect(screen.getByText("Fix bug")).toBeInTheDocument();
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
    expect(screen.getByText(/Unbekannt/)).toBeInTheDocument();
  });
});
