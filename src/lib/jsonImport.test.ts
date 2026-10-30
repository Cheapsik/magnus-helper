import { describe, expect, it } from "vitest";
import { mergeById, readJsonFile } from "./jsonImport";
import { lootItemsFileSchema } from "./lootDb";
import { randomTablesFileSchema } from "./randomTables";

// jsdom's File has no text(); browsers do.
const rawFile = (text: string) => ({ size: text.length, text: async () => text }) as File;
const file = (content: unknown) => rawFile(JSON.stringify(content));

describe("readJsonFile", () => {
  it("takes an item file exactly as the base stores it", async () => {
    const items = [{ id: "eq-1", name: "Miecz", type: "broń", rankName: "Pospolity", description: "", price: 200, tags: ["Mat: stal"] }];
    expect(await readJsonFile(file(items), lootItemsFileSchema)).toEqual(items);
  });

  it("keeps table conditions and entry metadata", async () => {
    const tables = [{ id: "t1", name: "Pogoda", folder: "", dice: "", text: "1 Deszcz", entryMeta: { "1 Deszcz": { weight: 2 } } }];
    expect(await readJsonFile(file(tables), randomTablesFileSchema)).toEqual(tables);
  });

  it("names what is wrong", async () => {
    await expect(readJsonFile(file([{ id: "eq-1", name: "Miecz" }]), lootItemsFileSchema)).rejects.toThrow(/0\.type/);
    await expect(readJsonFile(rawFile("{"), lootItemsFileSchema)).rejects.toThrow("To nie jest poprawny plik JSON");
  });
});

describe("mergeById", () => {
  it("replaces entries with the same id in place and appends new ones", () => {
    const merged = mergeById(
      [{ id: "a", v: 1 }, { id: "b", v: 1 }],
      [{ id: "b", v: 2 }, { id: "c", v: 2 }],
    );
    expect(merged).toEqual([{ id: "a", v: 1 }, { id: "b", v: 2 }, { id: "c", v: 2 }]);
  });
});
