import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RepoCard } from "./repo-card";
import type { Repo } from "@/lib/github/types";

function makeRepo(overrides: Partial<Repo> = {}): Repo {
  return {
    id: 1,
    name: "my-repo",
    fullName: "octocat/my-repo",
    visibility: "public",
    language: "TypeScript",
    openPRCount: 3,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("RepoCard", () => {
  it("zeigt Name, Sichtbarkeit, Sprache und PR-Zahl (AC-2)", () => {
    render(<RepoCard repo={makeRepo({ visibility: "private", openPRCount: 5 })} />);

    expect(screen.getByText("my-repo")).toBeInTheDocument();
    expect(screen.getByText("privat")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("zeigt einen Platzhalter, wenn keine Sprache erkannt wurde (EC-2)", () => {
    render(<RepoCard repo={makeRepo({ language: null })} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("verlinkt zur Detailroute des Repos (AC-7)", () => {
    render(<RepoCard repo={makeRepo({ fullName: "octocat/my-repo" })} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/repos/octocat/my-repo");
  });
});
