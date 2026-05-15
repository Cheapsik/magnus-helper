/** Notacja i adnotacja dla @3d-dice/dice-box-threejs (wizualnie d6 przy d3, d100+d10 przy d%). */

function pickD6ShowingD3(value1to3: number): number {
  const lo = 2 * value1to3 - 1;
  const hi = 2 * value1to3;
  return Math.random() < 0.5 ? lo : hi;
}

/** Wartości ścianek dla wymuszenia wyniku 1–100 (para d100 + d10 w bibliotece). */
export function percentileDiePairForRoll(roll: number): [tens: number, ones: number] {
  if (roll === 100) return [0, 0];
  const tens = Math.floor((roll - 1) / 10) * 10;
  let ones = roll % 10;
  if (ones === 0) ones = 10;
  return [tens, ones];
}

export function buildDiceBoxRollNotation(
  count: number,
  sides: number,
  results: number[],
): { notation: string; annotation?: string } {
  if (results.length !== count) {
    throw new Error("buildDiceBoxRollNotation: results length must match count");
  }

  if (sides === 3) {
    const d6 = results.map(pickD6ShowingD3);
    return {
      notation: `${count}d6@${d6.join(",")}`,
      annotation: `Pokazuję k6 — wynik k3: ${results.join(", ")}`,
    };
  }

  if (sides === 100) {
    const chunks: string[] = [];
    const preds: string[] = [];
    for (const r of results) {
      const [t, o] = percentileDiePairForRoll(r);
      chunks.push("1d100+1d10");
      preds.push(String(t), String(o));
    }
    return {
      notation: `${chunks.join("+")}@${preds.join(",")}`,
      annotation: results.length === 1 ? `d% = ${results[0]}` : `d% = ${results.join(" + ")}`,
    };
  }

  return {
    notation: `${count}d${sides}@${results.join(",")}`,
  };
}
