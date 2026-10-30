import type { CardValues, CardTypeDef, FieldDef } from "@/lib/cardSchema";
import { isCurrentMaxValue, isTableValue, visibleFields } from "@/lib/cardSchema";

/**
 * Evaluates a computed field's formula against a card's values.
 *
 * Syntax (kept deliberately simple — no user-facing parser errors to design):
 *   {fieldId}           → the number value of that field
 *   {fieldId.current}   → currentMax field's current value
 *   {fieldId.max}       → currentMax field's max value
 *   {fieldId:rowId.colId} → a table cell (fixed-row tables only)
 *
 * Operators: + - * / ( ) and integer/decimal literals.
 * floor() and ceil() wrap a sub-expression.
 * Unknown refs resolve to 0 so a formula never crashes.
 */

type Token =
  | { kind: "num"; value: number }
  | { kind: "op"; value: string }
  | { kind: "fn"; value: string };

const REF_RE = /\{([^}]+)\}/g;

function resolveRef(path: string, values: CardValues): number {
  const parts = path.trim().split(/[.:]/);
  const fieldId = parts[0];
  const value = values[fieldId];
  if (value === undefined) return 0;

  if (isCurrentMaxValue(value)) {
    const sub = parts[1];
    if (sub === "current") return typeof value.current === "number" ? value.current : 0;
    if (sub === "max") return typeof value.max === "number" ? value.max : 0;
    return typeof value.current === "number" ? value.current : 0;
  }

  if (isTableValue(value)) {
    const rowId = parts[1];
    const colId = parts[2];
    if (!rowId || !colId) return 0;
    const row = value.rows.find((r) => r.id === rowId);
    if (!row) return 0;
    const cell = row.cells[colId];
    if (typeof cell === "number") return cell;
    if (typeof cell === "string") { const n = Number(cell); return Number.isFinite(n) ? n : 0; }
    return 0;
  }

  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") { const n = Number(value); return Number.isFinite(n) ? n : 0; }
  if (typeof value === "boolean") return value ? 1 : 0;
  return 0;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    if (/\s/.test(expr[i])) { i++; continue; }
    if ("+-*/()".includes(expr[i])) { tokens.push({ kind: "op", value: expr[i] }); i++; continue; }
    if (/\d/.test(expr[i]) || (expr[i] === "." && i + 1 < expr.length && /\d/.test(expr[i + 1]))) {
      let num = "";
      while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === ".")) { num += expr[i]; i++; }
      tokens.push({ kind: "num", value: Number(num) });
      continue;
    }
    if (/[a-z]/i.test(expr[i])) {
      let word = "";
      while (i < expr.length && /[a-z]/i.test(expr[i])) { word += expr[i]; i++; }
      tokens.push({ kind: "fn", value: word.toLowerCase() });
      continue;
    }
    i++;
  }
  return tokens;
}

function evaluate(tokens: Token[]): number {
  let pos = 0;

  function parseExpr(): number {
    let result = parseTerm();
    while (pos < tokens.length && tokens[pos].kind === "op" && (tokens[pos].value === "+" || tokens[pos].value === "-")) {
      const op = tokens[pos++].value;
      const right = parseTerm();
      result = op === "+" ? result + right : result - right;
    }
    return result;
  }

  function parseTerm(): number {
    let result = parseUnary();
    while (pos < tokens.length && tokens[pos].kind === "op" && (tokens[pos].value === "*" || tokens[pos].value === "/")) {
      const op = tokens[pos++].value;
      const right = parseUnary();
      result = op === "*" ? result * right : right !== 0 ? result / right : 0;
    }
    return result;
  }

  function parseUnary(): number {
    if (pos < tokens.length && tokens[pos].kind === "op" && tokens[pos].value === "-") {
      pos++;
      return -parseAtom();
    }
    if (pos < tokens.length && tokens[pos].kind === "op" && tokens[pos].value === "+") {
      pos++;
    }
    return parseAtom();
  }

  function parseAtom(): number {
    if (pos >= tokens.length) return 0;
    const t = tokens[pos];
    if (t.kind === "num") { pos++; return t.value; }
    if (t.kind === "fn") {
      const fn = t.value;
      pos++;
      if (pos < tokens.length && tokens[pos].kind === "op" && tokens[pos].value === "(") {
        pos++;
        const inner = parseExpr();
        if (pos < tokens.length && tokens[pos].kind === "op" && tokens[pos].value === ")") pos++;
        if (fn === "floor") return Math.floor(inner);
        if (fn === "ceil") return Math.ceil(inner);
        if (fn === "abs") return Math.abs(inner);
        if (fn === "min" || fn === "max") return inner;
        return inner;
      }
      return 0;
    }
    if (t.kind === "op" && t.value === "(") {
      pos++;
      const inner = parseExpr();
      if (pos < tokens.length && tokens[pos].kind === "op" && tokens[pos].value === ")") pos++;
      return inner;
    }
    pos++;
    return 0;
  }

  const result = parseExpr();
  return Number.isFinite(result) ? result : 0;
}

export function evaluateFormula(formula: string, values: CardValues): number {
  const substituted = formula.replace(REF_RE, (_, path: string) => String(resolveRef(path, values)));
  const tokens = tokenize(substituted);
  return evaluate(tokens);
}

/** All field ids referenced in a formula. */
export function formulaDependencies(formula: string): string[] {
  const ids = new Set<string>();
  let match: RegExpExecArray | null;
  REF_RE.lastIndex = 0;
  while ((match = REF_RE.exec(formula)) !== null) {
    ids.add(match[1].trim().split(/[.:]/)[0]);
  }
  return [...ids];
}

/** Returns card values with computed fields evaluated inline. */
export function resolveComputedValues(cardType: CardTypeDef, values: CardValues): CardValues {
  const computedFields = visibleFields(cardType).filter((f) => f.type === "computed" && f.formula);
  if (computedFields.length === 0) return values;
  const resolved = { ...values };
  for (const field of computedFields) {
    resolved[field.id] = evaluateFormula(field.formula!, resolved);
  }
  return resolved;
}

/** User-friendly listing of what fields a formula can reference. */
export function formulaRefTargets(cardType: CardTypeDef): { token: string; label: string }[] {
  const targets: { token: string; label: string }[] = [];
  for (const field of visibleFields(cardType)) {
    if (field.type === "computed") continue;
    switch (field.type) {
      case "number":
      case "track":
      case "checkbox":
      case "dice":
      case "text":
      case "longtext":
        targets.push({ token: `{${field.id}}`, label: field.name });
        break;
      case "currentMax":
        targets.push({ token: `{${field.id}.current}`, label: `${field.name} — aktualne` });
        targets.push({ token: `{${field.id}.max}`, label: `${field.name} — maksymalne` });
        break;
      case "table":
        if (field.rowMode?.kind === "fixed") {
          for (const row of field.rowMode.rows) {
            for (const col of (field.columns ?? []).filter((c) => c.type === "number")) {
              targets.push({
                token: `{${field.id}:${row.id}.${col.id}}`,
                label: `${field.name}: ${row.label} (${col.name})`,
              });
            }
          }
        }
        break;
    }
  }
  return targets;
}
