import { CATEGORIES } from "@/constants/domain";
import type { Request } from "@/types/domain";

export function requestDisplayName(request: Pick<Request, "category" | "description">) {
  const categoryLabel = CATEGORIES.find((c) => c.value === request.category)?.label ?? request.category;
  const description = String(request.description || "").trim().replace(/\s+/g, " ");
  if (!description) return categoryLabel;

  const shortDescription = description.length > 56 ? `${description.slice(0, 56).trimEnd()}…` : description;
  return `${categoryLabel}: ${shortDescription}`;
}
