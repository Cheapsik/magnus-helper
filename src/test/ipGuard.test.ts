import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Magnus ships no rules, names or art of any published game (CONTEXT.md). This
 * guard fails the build when a third party's trademark or terminology creeps
 * into what we ship or document. The list is IP_CLEANUP_PLAN.md §4.2, minus
 * ordinary words that would only cause false alarms.
 */
const DENYLIST = [
  // brands and licensors
  "warhammer", "wfrp", "whfrp", "games workshop", "age of sigmar", "black library", "mordheim", "blood bowl",
  "necromunda", "space marine", "thousand sons", "forge world", "cubicle 7", "fantasy flight",
  "wizards of the coast", "player's handbook", "dungeon master's guide", "monster manual", "kosmit", "westfall",
  // gods and cults
  "sigmar", "ulryk", "ulric", "shallya", "ranald", "myrmidia", "khaine", "grungni", "valaya", "khorne", "nurgle",
  "tzeentch", "slaanesh", "manann",
  // geography
  "reikland", "altdorf", "middenheim", "talabheim", "marienburg", "ubersreik", "averland", "stirland", "ostermark",
  "middenland", "nordland", "wissenland", "talabecland", "drakwald", "kislev", "bretonia", "tilea", "estalia",
  // mechanics and terminology
  "punkty przeznaczenia", "punkty obłędu", "schemat rozwoju", "krzepa", "ogłada", "wiatry magii", "splatanie magii",
  "skaven", "złot\\w+ koron\\w*", "srebrn\\w+ szyling\\w*", "mosiężn\\w+ pens\\w*",
];

const PATTERN = new RegExp(`\\b(?:${DENYLIST.join("|")})`, "i");

const ROOT = process.cwd();
const SCANNED = ["src", "public", "docs", "index.html"];
const TEXT = /\.(ts|tsx|css|html|json|md|txt|svg|js)$/;
const SELF = join(ROOT, "src", "test", "ipGuard.test.ts");

function* files(path: string): Generator<string> {
  if (statSync(path).isDirectory()) {
    for (const entry of readdirSync(path)) yield* files(join(path, entry));
  } else if (TEXT.test(path) && path !== SELF) {
    yield path;
  }
}

describe("IP guard", () => {
  it("finds no third-party trademarks or game terminology in what we ship or document", () => {
    const hits: string[] = [];
    for (const target of SCANNED) {
      for (const file of files(join(ROOT, target))) {
        readFileSync(file, "utf8")
          .split("\n")
          .forEach((line, index) => {
            const match = PATTERN.exec(line);
            if (match) hits.push(`${relative(ROOT, file)}:${index + 1} → ${match[0]}`);
          });
      }
    }
    expect(hits).toEqual([]);
  });
});
