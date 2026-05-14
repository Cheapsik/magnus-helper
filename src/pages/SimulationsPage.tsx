import { useState } from "react";
import { Play, BarChart3, Swords, TrendingUp, RotateCcw } from "lucide-react";
import { rollPercentile, rollDie, DIFFICULTY_PRESETS } from "@/lib/dice";
import { useApp } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { cn } from "@/lib/utils";
import { StatAbbrWithTooltip } from "@/components/game/StatAbbrWithTooltip";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

type SimMode = "basic" | "opposed" | "combat";

interface SimResult {
  mode: SimMode;
  label: string;
  target: number;
  modifier: number;
  rolls: number;
  successes: number;
  rate: number;
  avg: number;
  critSuccesses: number;
  critFailures: number;
  distribution: { range: string; count: number }[];
  // Opposed
  winsA?: number;
  winsB?: number;
  draws?: number;
  // Combat
  avgDamage?: number;
  avgRounds?: number;
}

function runBasicSim(target: number, modifier: number, numRolls: number): SimResult {
  const effectiveTarget = Math.max(1, Math.min(99, target + modifier));
  let successes = 0, sum = 0, critS = 0, critF = 0;
  const buckets = new Array(10).fill(0);

  for (let i = 0; i < numRolls; i++) {
    const roll = rollPercentile();
    sum += roll;
    if (roll <= effectiveTarget) successes++;
    if (roll <= 5) critS++;
    if (roll >= 96) critF++;
    const bucket = Math.min(9, Math.floor((roll - 1) / 10));
    buckets[bucket]++;
  }

  return {
    mode: "basic", label: `Cel ${effectiveTarget} (${target}${modifier >= 0 ? "+" : ""}${modifier})`,
    target: effectiveTarget, modifier, rolls: numRolls, successes,
    rate: numRolls > 0 ? successes / numRolls : 0,
    avg: numRolls > 0 ? Math.round(sum / numRolls) : 0,
    critSuccesses: critS, critFailures: critF,
    distribution: buckets.map((count, i) => ({ range: `${i * 10 + 1}-${(i + 1) * 10}`, count })),
  };
}

function runOpposedSim(skillA: number, skillB: number, modA: number, modB: number, numRolls: number): SimResult {
  const targetA = Math.max(1, Math.min(99, skillA + modA));
  const targetB = Math.max(1, Math.min(99, skillB + modB));
  let winsA = 0, winsB = 0, draws = 0;
  const buckets = new Array(10).fill(0);

  for (let i = 0; i < numRolls; i++) {
    const rollA = rollPercentile();
    const rollB = rollPercentile();
    const successA = rollA <= targetA;
    const successB = rollB <= targetB;
    const marginA = successA ? targetA - rollA : -(rollA - targetA);
    const marginB = successB ? targetB - rollB : -(rollB - targetB);
    const slA = Math.floor(marginA / 10);
    const slB = Math.floor(marginB / 10);

    if (slA > slB) winsA++;
    else if (slB > slA) winsB++;
    else draws++;

    const bucket = Math.min(9, Math.floor((rollA - 1) / 10));
    buckets[bucket]++;
  }

  return {
    mode: "opposed", label: `${targetA} vs ${targetB}`,
    target: targetA, modifier: modA, rolls: numRolls,
    successes: winsA, rate: numRolls > 0 ? winsA / numRolls : 0,
    avg: 0, critSuccesses: 0, critFailures: 0,
    winsA, winsB, draws,
    distribution: buckets.map((count, i) => ({ range: `${i * 10 + 1}-${(i + 1) * 10}`, count })),
  };
}

function runCombatSim(attackerWw: number, defenderWw: number, sb: number, weaponDmg: number, defToughness: number, defArmor: number, defHp: number, numSims: number): SimResult {
  let totalDmgDealt = 0, totalRoundsToKill = 0, kills = 0;
  const buckets = new Array(10).fill(0);

  for (let i = 0; i < numSims; i++) {
    let hpLeft = defHp;
    let rounds = 0;
    const maxRounds = 50;
    while (hpLeft > 0 && rounds < maxRounds) {
      rounds++;
      const roll = rollPercentile();
      const bucket = Math.min(9, Math.floor((roll - 1) / 10));
      buckets[bucket]++;
      if (roll <= attackerWw) {
        const dmgRoll = rollDie(10);
        const total = dmgRoll + sb + weaponDmg;
        const finalDmg = Math.max(0, total - defToughness - defArmor);
        hpLeft -= finalDmg;
        totalDmgDealt += finalDmg;
      }
    }
    if (hpLeft <= 0) { kills++; totalRoundsToKill += rounds; }
  }

  return {
    mode: "combat", label: `WW ${attackerWw} vs Wt${defToughness}+Pnc${defArmor} (${defHp}PŻ)`,
    target: attackerWw, modifier: 0, rolls: numSims,
    successes: kills, rate: numSims > 0 ? kills / numSims : 0,
    avg: 0, critSuccesses: 0, critFailures: 0,
    avgDamage: kills > 0 ? Math.round(totalDmgDealt / numSims * 10) / 10 : 0,
    avgRounds: kills > 0 ? Math.round(totalRoundsToKill / kills * 10) / 10 : 0,
    distribution: buckets.map((count, i) => ({ range: `${i * 10 + 1}-${(i + 1) * 10}`, count })),
  };
}

export default function SimulationsPage() {
  const { character } = useApp();
  const [mode, setMode] = useState<SimMode>("basic");
  const [numRolls, setNumRolls] = useState(1000);
  const [results, setResults] = useState<SimResult[]>([]);

  // Basic mode
  const [target, setTarget] = useState(40);
  const [modifier, setModifier] = useState(0);

  // Opposed mode
  const [skillA, setSkillA] = useState(40);
  const [skillB, setSkillB] = useState(35);
  const [modA, setModA] = useState(0);
  const [modB, setModB] = useState(0);

  // Combat mode
  const [atkWw, setAtkWw] = useState(character.stats.find((s) => s.abbr === "WW")?.value ?? 40);
  const [atkSb, setAtkSb] = useState(Math.floor((character.stats.find((s) => s.abbr === "S")?.value ?? 30) / 10));
  const [atkWeaponDmg, setAtkWeaponDmg] = useState(4);
  const [defWw, setDefWw] = useState(30);
  const [defToughness, setDefToughness] = useState(3);
  const [defArmor, setDefArmor] = useState(1);
  const [defHp, setDefHp] = useState(12);

  const handleRun = () => {
    let result: SimResult;
    if (mode === "basic") {
      result = runBasicSim(target, modifier, numRolls);
    } else if (mode === "opposed") {
      result = runOpposedSim(skillA, skillB, modA, modB, numRolls);
    } else {
      result = runCombatSim(atkWw, defWw, atkSb, atkWeaponDmg, defToughness, defArmor, defHp, numRolls);
    }
    setResults((prev) => [result, ...prev].slice(0, 10));
  };

  const latestResult = results[0];

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="font-app-brand text-lg font-bold">Symulacje</h1>

      {/* Mode selector */}
      <div className="flex gap-1.5">
        <Button size="sm" variant={mode === "basic" ? "default" : "secondary"} className="flex-1 text-xs gap-1" onClick={() => setMode("basic")}>
          <BarChart3 className="h-3.5 w-3.5" /> Podstawowa
        </Button>
        <Button size="sm" variant={mode === "opposed" ? "default" : "secondary"} className="flex-1 text-xs gap-1" onClick={() => setMode("opposed")}>
          <Swords className="h-3.5 w-3.5" /> Przeciwstawna
        </Button>
        <Button size="sm" variant={mode === "combat" ? "default" : "secondary"} className="flex-1 text-xs gap-1" onClick={() => setMode("combat")}>
          <TrendingUp className="h-3.5 w-3.5" /> Walka
        </Button>
      </div>

      {/* Basic mode inputs */}
      {mode === "basic" && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Cel bazowy</label>
              <NumberInput value={target} onChange={setTarget} min={1} max={99} className="text-center font-bold h-11" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Modyfikator</label>
              <NumberInput value={modifier} onChange={setModifier} className="text-center font-bold h-11" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Rzuty</label>
              <NumberInput value={numRolls} onChange={setNumRolls} min={1} max={100000} className="text-center font-bold h-11" />
            </div>
          </div>
          {/* Difficulty presets */}
          <div className="flex flex-wrap gap-1">
            {DIFFICULTY_PRESETS.map((d) => (
              <Button key={d.label} size="sm" variant={modifier === d.modifier ? "default" : "outline"} className="text-[10px] px-2 h-6" onClick={() => setModifier(d.modifier)}>
                {d.labelPl} ({d.modifier >= 0 ? `+${d.modifier}` : d.modifier})
              </Button>
            ))}
          </div>
          <Card className="border-primary/30">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">Efektywny cel</div>
              <div className="text-2xl font-bold text-primary">{Math.max(1, Math.min(99, target + modifier))}</div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Opposed mode inputs */}
      {mode === "opposed" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3 space-y-2">
                <label className="text-xs font-semibold text-foreground">Strona A</label>
                <div><label className="text-[10px] text-muted-foreground">Cecha</label><NumberInput value={skillA} onChange={setSkillA} min={1} max={99} className="h-9 text-center font-bold" /></div>
                <div><label className="text-[10px] text-muted-foreground">Modyfikator</label><NumberInput value={modA} onChange={setModA} className="h-9 text-center font-bold" /></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 space-y-2">
                <label className="text-xs font-semibold text-foreground">Strona B</label>
                <div><label className="text-[10px] text-muted-foreground">Cecha</label><NumberInput value={skillB} onChange={setSkillB} min={1} max={99} className="h-9 text-center font-bold" /></div>
                <div><label className="text-[10px] text-muted-foreground">Modyfikator</label><NumberInput value={modB} onChange={setModB} className="h-9 text-center font-bold" /></div>
              </CardContent>
            </Card>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Ilość symulacji</label>
            <NumberInput value={numRolls} onChange={setNumRolls} min={1} max={100000} className="text-center font-bold h-11" />
          </div>
        </>
      )}

      {/* Combat mode inputs */}
      {mode === "combat" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3 space-y-2">
                <label className="text-xs font-semibold text-foreground">Atakujący</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <div className="text-[10px] text-muted-foreground"><StatAbbrWithTooltip statKey="ww" className="text-[10px] text-muted-foreground">WW</StatAbbrWithTooltip></div>
                    <NumberInput value={atkWw} onChange={setAtkWw} className="h-8 text-xs text-center" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground"><StatAbbrWithTooltip statKey="sb" className="text-[10px] text-muted-foreground">SB</StatAbbrWithTooltip></div>
                    <NumberInput value={atkSb} onChange={setAtkSb} className="h-8 text-xs text-center" />
                  </div>
                </div>
                <div><label className="text-[10px] text-muted-foreground">Obrażenia broni</label><NumberInput value={atkWeaponDmg} onChange={setAtkWeaponDmg} className="h-8 text-xs text-center" /></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 space-y-2">
                <label className="text-xs font-semibold text-foreground">Obrońca</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <div className="text-[10px] text-muted-foreground"><StatAbbrWithTooltip statKey="ww" className="text-[10px] text-muted-foreground">WW</StatAbbrWithTooltip></div>
                    <NumberInput value={defWw} onChange={setDefWw} className="h-8 text-xs text-center" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground"><StatAbbrWithTooltip statKey="pż" className="text-[10px] text-muted-foreground">PŻ</StatAbbrWithTooltip></div>
                    <NumberInput value={defHp} onChange={setDefHp} min={1} className="h-8 text-xs text-center" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <div className="text-[10px] text-muted-foreground"><StatAbbrWithTooltip statKey="wt" className="text-[10px] text-muted-foreground">Wt</StatAbbrWithTooltip></div>
                    <NumberInput value={defToughness} onChange={setDefToughness} className="h-8 text-xs text-center" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground"><StatAbbrWithTooltip statKey="pnc" className="text-[10px] text-muted-foreground">Pancerz</StatAbbrWithTooltip></div>
                    <NumberInput value={defArmor} onChange={setDefArmor} className="h-8 text-xs text-center" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Ilość symulacji</label>
            <NumberInput value={numRolls} onChange={setNumRolls} min={1} max={100000} className="text-center font-bold h-11" />
          </div>
        </>
      )}

      <Button onClick={handleRun} className="w-full h-12 text-base font-semibold gap-2">
        <Play className="h-5 w-5" />
        Uruchom {numRolls.toLocaleString()} symulacji
      </Button>

      {/* Results */}
      {latestResult && (
        <>
          {latestResult.mode === "basic" && (
            <div className="grid grid-cols-2 gap-2">
              <Card><CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Szansa sukcesu</div>
                <div className="text-xl font-bold text-success">{(latestResult.rate * 100).toFixed(1)}%</div>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Średni wynik</div>
                <div className="text-xl font-bold">{latestResult.avg}</div>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Krytyczne sukcesy</div>
                <div className="text-lg font-bold text-success">{latestResult.critSuccesses} <span className="text-xs text-muted-foreground">({(latestResult.critSuccesses / latestResult.rolls * 100).toFixed(1)}%)</span></div>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Krytyczne porażki</div>
                <div className="text-lg font-bold text-destructive">{latestResult.critFailures} <span className="text-xs text-muted-foreground">({(latestResult.critFailures / latestResult.rolls * 100).toFixed(1)}%)</span></div>
              </CardContent></Card>
            </div>
          )}

          {latestResult.mode === "opposed" && (
            <div className="grid grid-cols-3 gap-2">
              <Card><CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Wygrane A</div>
                <div className="text-xl font-bold text-success">{((latestResult.winsA! / latestResult.rolls) * 100).toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">{latestResult.winsA}</div>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Remis</div>
                <div className="text-xl font-bold">{((latestResult.draws! / latestResult.rolls) * 100).toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">{latestResult.draws}</div>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Wygrane B</div>
                <div className="text-xl font-bold text-destructive">{((latestResult.winsB! / latestResult.rolls) * 100).toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">{latestResult.winsB}</div>
              </CardContent></Card>
            </div>
          )}

          {latestResult.mode === "combat" && (
            <div className="grid grid-cols-2 gap-2">
              <Card><CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Szansa zabicia</div>
                <div className="text-xl font-bold text-success">{(latestResult.rate * 100).toFixed(1)}%</div>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Śr. rund do zabicia</div>
                <div className="text-xl font-bold">{latestResult.avgRounds ?? "∞"}</div>
              </CardContent></Card>
              <Card className="col-span-2"><CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Śr. obrażeń / symulację</div>
                <div className="text-xl font-bold text-primary">{latestResult.avgDamage}</div>
              </CardContent></Card>
            </div>
          )}

          {/* Distribution chart */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-primary" />
                Rozkład wyników
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={latestResult.distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* History */}
      {results.length > 1 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Poprzednie symulacje</label>
            <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => setResults(results.slice(0, 1))}><RotateCcw className="h-3 w-3" />Wyczyść</Button>
          </div>
          <div className="space-y-1">
            {results.slice(1).map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm px-3 py-2 rounded-md bg-card border">
                <span className="text-muted-foreground text-xs">{r.label} · {r.rolls.toLocaleString()}×</span>
                <span className="font-bold text-success">{(r.rate * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}