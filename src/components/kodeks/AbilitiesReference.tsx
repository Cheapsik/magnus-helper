import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { UMIEJETNOSCI_KODEKS, ZDOLNOSCI_KODEKS } from "@/data/zdolnosci";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

type ViewKind = "umiejetnosci" | "zdolnosci";
type SectionView = "umiejetnosci" | "zdolnosci";

function matchesQuery(text: string, q: string) {
  return text.toLowerCase().includes(q);
}

function ReferenceAccordion({
  items,
  kind,
}: {
  items: {
    id: string;
    nazwa: string;
    opis: string;
    pokrewne?: string;
    badges?: { label: string; variant?: "default" | "secondary" | "outline" }[];
  }[];
  kind: ViewKind;
}) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Brak wyników pasujących do wyszukiwania.
      </p>
    );
  }

  return (
    <Accordion type="multiple" className="space-y-2">
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          value={item.id}
          className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-colors hover:border-border data-[state=open]:border-primary/25 border-b-0"
        >
          <AccordionTrigger className="min-h-[3.25rem] px-4 py-3 hover:no-underline [&>svg]:shrink-0 [&>svg]:text-muted-foreground">
            <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5 text-left">
              <span className="truncate text-sm font-semibold leading-tight">{item.nazwa}</span>
              {item.badges && item.badges.length > 0 && (
                <span className="flex flex-wrap gap-1">
                  {item.badges.map((b) => (
                    <Badge key={b.label} variant={b.variant ?? "secondary"} className="text-[10px] font-normal">
                      {b.label}
                    </Badge>
                  ))}
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="border-t border-border/40 bg-muted/10 px-4 py-3">
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{item.opis}</p>
            {kind === "umiejetnosci" && item.pokrewne && (
              <p className="mt-3 text-xs text-muted-foreground/80">
                <span className="font-medium text-foreground/70">Zdolności pokrewne: </span>
                {item.pokrewne}
              </p>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

const SECTIONS: { id: SectionView; label: string; hint: string }[] = [
  { id: "umiejetnosci", label: "Umiejętności", hint: "Testy i cechy" },
  { id: "zdolnosci", label: "Zdolności", hint: "Talenty i atuty" },
];

export function AbilitiesReference() {
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<SectionView>("umiejetnosci");
  const [typFilter, setTypFilter] = useState<"wszystkie" | "podstawowa" | "zaawansowana">("wszystkie");

  const q = search.trim().toLowerCase();

  const umiejetnosci = useMemo(() => {
    return UMIEJETNOSCI_KODEKS.filter((u) => {
      if (typFilter !== "wszystkie" && u.typ !== typFilter) return false;
      if (!q) return true;
      return (
        matchesQuery(u.nazwa, q) ||
        matchesQuery(u.opis, q) ||
        matchesQuery(u.cecha, q) ||
        matchesQuery(u.pokrewne, q) ||
        matchesQuery(u.typ, q)
      );
    }).map((u) => ({
      id: u.id,
      nazwa: u.nazwa,
      opis: u.opis,
      pokrewne: u.pokrewne !== "brak" ? u.pokrewne : undefined,
      badges: [
        ...(u.typ ? [{ label: u.typ, variant: "default" as const }] : []),
        ...(u.cecha ? [{ label: u.cecha, variant: "outline" as const }] : []),
      ],
    }));
  }, [q, typFilter]);

  const zdolnosci = useMemo(() => {
    return ZDOLNOSCI_KODEKS.filter((z) => {
      if (!q) return true;
      return matchesQuery(z.nazwa, q) || matchesQuery(z.opis, q);
    }).map((z) => ({
      id: z.id,
      nazwa: z.nazwa,
      opis: z.opis,
    }));
  }, [q]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Szukaj umiejętności i zdolności…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-3">
        <div
          role="tablist"
          aria-label="Rodzaj wpisu"
          className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide"
        >
          {SECTIONS.map(({ id, label, hint }) => {
            const count = id === "umiejetnosci" ? umiejetnosci.length : zdolnosci.length;
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSection(id)}
                className={cn(
                  "flex min-w-[8.5rem] shrink-0 flex-col rounded-lg border px-3 py-2.5 text-left transition-colors",
                  active
                    ? "border-primary/40 bg-primary/10 shadow-sm"
                    : "border-border/50 bg-card/30 text-muted-foreground hover:border-border hover:bg-muted/30 hover:text-foreground",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className={cn("text-sm font-medium", active && "text-foreground")}>{label}</span>
                  <Badge
                    variant={active ? "default" : "secondary"}
                    className="h-5 min-w-5 justify-center px-1.5 text-[10px] font-normal tabular-nums"
                  >
                    {count}
                  </Badge>
                </span>
                <span className="mt-0.5 text-[11px] leading-tight opacity-80">{hint}</span>
              </button>
            );
          })}
        </div>

        {section === "umiejetnosci" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Typ
              </span>
              {(["wszystkie", "podstawowa", "zaawansowana"] as const).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={typFilter === t ? "default" : "outline"}
                  className="h-7 shrink-0 text-xs capitalize"
                  onClick={() => setTypFilter(t)}
                >
                  {t === "wszystkie" ? "Wszystkie" : t}
                </Button>
              ))}
            </div>
            <ReferenceAccordion items={umiejetnosci} kind="umiejetnosci" />
          </div>
        ) : (
          <ReferenceAccordion items={zdolnosci} kind="zdolnosci" />
        )}
      </div>
    </div>
  );
}
