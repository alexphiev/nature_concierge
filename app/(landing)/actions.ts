"use server";

import { z } from "zod";
import { findPlaces } from "@/src/search/search-service";
import type { SearchResult } from "@/src/search/types";

const SearchInput = z
  .object({
    text: z
      .string()
      .trim()
      .max(300)
      .transform((text) => text || null),
    shortcutIds: z.array(z.string().max(50)).max(20),
  })
  .refine((input) => input.text !== null || input.shortcutIds.length > 0);

export async function searchPlaces(input: { text: string; shortcutIds: string[] }): Promise<SearchResult> {
  const parsed = SearchInput.safeParse(input);
  if (!parsed.success) return { status: "error" };
  return findPlaces(parsed.data);
}
