import { describe, expect, it } from "vitest";
import { plural } from "./utils";

describe("plural", () => {
  it.each([[0, "many"], [1, "one"], [2, "few"], [4, "few"], [5, "many"], [12, "many"], [14, "many"], [22, "few"], [25, "many"]])(
    "%i → %s",
    (n, form) => expect(plural(n, "one", "few", "many")).toBe(form),
  );
});
