"use server";

import { searchAll } from "@/lib/search/queries";

export async function searchAllAction(q: string) {
  return searchAll(q);
}
