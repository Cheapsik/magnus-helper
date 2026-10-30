import { z } from "zod";

/** A campaign's data has to fit in the browser's copy (localStorage holds about 5 MB). */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Reads a JSON file the GM picked; the error message is meant for a toast. */
export async function readJsonFile<T>(file: File, schema: z.ZodType<T>): Promise<T> {
  if (file.size > MAX_FILE_BYTES) throw new Error("Plik jest za duży (maks. 5 MB)");
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("To nie jest poprawny plik JSON");
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`Nieprawidłowy plik (${issue.path.join(".") || "całość"}): ${issue.message}`);
  }
  return result.data;
}

/** Imported entries replace ones with the same id in place; new ones go at the end. */
export function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const byId = new Map(incoming.map((item) => [item.id, item]));
  const currentIds = new Set(current.map((item) => item.id));
  return [...current.map((item) => byId.get(item.id) ?? item), ...[...byId.values()].filter((item) => !currentIds.has(item.id))];
}
