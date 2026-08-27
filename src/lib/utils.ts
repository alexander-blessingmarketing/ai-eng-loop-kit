import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0];
}

export function getInitials(text: string | null | undefined, max = 2): string {
  if (!text) return "?";
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, max)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
