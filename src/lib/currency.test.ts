import { describe, expect, it } from "vitest";
import type { Denomination } from "./campaignSystem";
import { currencyIssues, formatMoney, splitMoney, toSmallest } from "./currency";

const coins: Denomination[] = [
  { id: "c", name: "Miedź", short: "md", rate: 1 },
  { id: "g", name: "Złoto", short: "zł", rate: 100 },
  { id: "s", name: "Srebro", short: "sr", rate: 10 },
];

describe("formatMoney", () => {
  it("breaks an amount into denominations, highest first", () => {
    expect(formatMoney(1234, coins)).toBe("12 zł 3 sr 4 md");
  });

  it("omits denominations with nothing in them", () => {
    expect(formatMoney(1204, coins)).toBe("12 zł 4 md");
    expect(formatMoney(300, coins)).toBe("3 zł");
  });

  it("prints zero in the smallest denomination", () => {
    expect(formatMoney(0, coins)).toBe("0 md");
  });

  it("prints the raw number when the campaign has no currency", () => {
    expect(formatMoney(1234, [])).toBe("1234");
  });

  it("prefixes a negative amount with a minus sign", () => {
    expect(formatMoney(-15, coins)).toBe("-1 sr 5 md");
  });

  it("rounds a fractional amount to a whole smallest coin", () => {
    expect(formatMoney(12.6, coins)).toBe("1 sr 3 md");
  });

  it("shows a remainder no denomination can hold as a plain number", () => {
    const noBase: Denomination[] = [{ id: "a", name: "A", short: "a", rate: 5 }];
    expect(formatMoney(12, noBase)).toBe("2 a 2");
  });
});

describe("toSmallest", () => {
  it("sums counts per denomination id by their rates", () => {
    expect(toSmallest({ g: 2, s: 3, c: 4 }, coins)).toBe(234);
  });

  it("ignores ids the currency does not know and treats missing ones as zero", () => {
    expect(toSmallest({ s: 1, gone: 50 }, coins)).toBe(10);
  });
});

describe("splitMoney", () => {
  it("returns the count of every denomination, zeros included", () => {
    expect(splitMoney(1204, coins)).toEqual({ g: 12, s: 0, c: 4 });
  });
});

describe("currencyIssues", () => {
  it("is quiet for a well-formed currency or no currency at all", () => {
    expect(currencyIssues(coins)).toEqual([]);
    expect(currencyIssues([])).toEqual([]);
  });

  it("asks for a denomination worth 1", () => {
    expect(currencyIssues([{ id: "a", name: "A", short: "a", rate: 10 }])).toEqual([
      "Żaden nominał nie ma przelicznika 1 — najmniejszy nominał musi mieć 1.",
    ]);
  });

  it("reports duplicated rates", () => {
    const issues = currencyIssues([...coins, { id: "x", name: "X", short: "x", rate: 10 }]);
    expect(issues).toEqual(["Kilka nominałów ma ten sam przelicznik: 10."]);
  });

  it("reports a rate that is not a whole number of at least 1", () => {
    const issues = currencyIssues([...coins, { id: "x", name: "Kruszec", short: "x", rate: 2.5 }]);
    expect(issues).toEqual(["Przelicznik nominału „Kruszec” musi być liczbą całkowitą ≥ 1."]);
  });
});
