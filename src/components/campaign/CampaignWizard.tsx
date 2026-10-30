import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardRenderer } from "@/components/card/CardRenderer";
import { createEmptyCard } from "@/lib/cardSchema";
import { type StartingPoint, systemForStartingPoint } from "@/lib/systemTemplates";
import { type Campaign, listCampaigns, getActiveCampaignId } from "@/lib/campaignStorage";

export type WizardResult = { name: string; start: StartingPoint; refine: boolean; copyFromCampaignId?: string };

const STEPS = ["Nazwa", "Punkt startowy", "Karta bohatera"] as const;

type WizardStartChoice = StartingPoint | "copy";

const STARTING_POINTS: { value: WizardStartChoice; title: string; description: string }[] = [
  {
    value: "template",
    title: "Neutralny szablon",
    description:
      "Gotowa karta z opisem, czterema prostymi cechami (Siła, Zręczność, Wytrzymałość, Inteligencja), zdrowiem, inicjatywą, ochroną, umiejętnościami i ekwipunkiem, a do tego przykładowy test, atak, stany i waluta. Wszystko zmienisz później.",
  },
  {
    value: "empty",
    title: "Pusta struktura",
    description:
      "Karty mają tylko nazwę, portret i notatki. Resztę systemu budujesz sam, od zera. Dobre, jeśli prowadzisz system, który dobrze znasz.",
  },
  {
    value: "copy",
    title: "Kopiuj z innej kampanii",
    description:
      "Skopiuj cały system mechaniczny (karty, testy, ataki, stany, walutę) z istniejącej kampanii. Karty postaci nie są kopiowane.",
  },
];

/**
 * Creating a campaign: name → starting point → a look at the resulting hero
 * card. The starting point is chosen once (CONTEXT.md: "Punkt startowy");
 * everything after that is edited in Settings.
 */
export function CampaignWizard({
  onFinish,
  onCancel,
  finishLabel = "Utwórz kampanię",
}: {
  onFinish: (result: WizardResult) => void;
  onCancel?: () => void;
  finishLabel?: string;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [start, setStart] = useState<WizardStartChoice>("template");
  const [copyFromId, setCopyFromId] = useState<string | null>(null);

  const otherCampaigns = useMemo(() => {
    const active = getActiveCampaignId();
    return listCampaigns().filter((c) => c.id !== active && !c.archivedAt);
  }, []);

  const effectiveStart: StartingPoint = start === "copy" ? "template" : start;

  const preview = useMemo(() => {
    const hero = systemForStartingPoint(effectiveStart).cards.hero;
    return { hero, card: createEmptyCard("hero", hero, "Przykładowy bohater") };
  }, [effectiveStart]);

  const canContinue = step === 0 ? name.trim() !== "" : step === 1 ? start !== "copy" || copyFromId !== null : true;
  const finish = (refine: boolean) =>
    onFinish({ name: name.trim(), start: effectiveStart, refine, copyFromCampaignId: start === "copy" && copyFromId ? copyFromId : undefined });

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <ol className="flex flex-wrap gap-x-4 gap-y-1 text-[length:--fs-meta]">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={cn(
              "flex items-center gap-1.5",
              index === step ? "text-foreground" : index < step ? "text-muted-foreground" : "text-muted-foreground/60",
            )}
            aria-current={index === step ? "step" : undefined}
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border text-[11px]",
                index === step ? "border-primary bg-primary text-primary-foreground" : "border-border",
              )}
            >
              {index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (canContinue) setStep(1);
          }}
        >
          <label className="block text-sm" htmlFor="campaign-name">
            Jak nazywa się kampania?
          </label>
          <Input id="campaign-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Klątwa Szarej Doliny" />
        </form>
      )}

      {step === 1 && (
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Punkt startowy">
          {STARTING_POINTS.filter((o) => o.value !== "copy" || otherCampaigns.length > 0).map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={start === option.value}
              onClick={() => setStart(option.value)}
              className={cn(
                "flex flex-col items-start justify-start rounded-md border p-3 text-left transition-colors",
                start === option.value ? "border-primary bg-primary/[0.08]" : "border-border hover:border-primary/40",
              )}
            >
              <span className="block text-sm font-medium">{option.title}</span>
              <span className="mt-1 block text-[length:--fs-meta] leading-relaxed text-muted-foreground">
                {option.description}
              </span>
            </button>
          ))}
          {start === "copy" && (
            <div className="sm:col-span-2 space-y-1">
              <label className="text-sm text-muted-foreground">Wybierz kampanię źródłową:</label>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {otherCampaigns.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCopyFromId(c.id)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                      copyFromId === c.id ? "border-primary bg-primary/[0.08]" : "border-border hover:border-primary/40",
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-[length:--fs-meta] text-muted-foreground sm:col-span-2">
            Punkt startowy wybierasz raz. Po utworzeniu kampania ma własną kopię systemu, którą możesz dowolnie zmieniać.
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Tak będzie wyglądać nowa karta bohatera w kampanii „{name.trim()}”.</p>
          <div className="paper-sheet max-h-[50vh] overflow-y-auto rounded-md">
            <CardRenderer cardType={preview.hero} card={preview.card} onChange={() => undefined} readOnly />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {step === 0 && onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Anuluj
          </Button>
        )}
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            Wstecz
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canContinue}>
            Dalej
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => finish(true)}>
              Utwórz i dopracuj karty
            </Button>
            <Button onClick={() => finish(false)}>{finishLabel}</Button>
          </>
        )}
      </div>
    </div>
  );
}
