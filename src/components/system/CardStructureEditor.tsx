import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  type Card,
  type CardKind,
  type CardTypeDef,
  type FieldType,
  CARD_KINDS,
  CARD_KIND_LABELS,
  FIELD_TYPE_LABELS,
  createEmptyCard,
} from "@/lib/cardSchema";
import {
  addField,
  addSection,
  hiddenFields,
  hideField,
  hideSection,
  moveField,
  moveSection,
  purgeField,
  restoreField,
  updateSection,
} from "@/lib/structureOps";
import { deriveMonsterType, deriveNpcType } from "@/lib/systemTemplates";
import { useCampaignSystem, useCards } from "@/lib/cardStore";
import { CardRenderer } from "@/components/card/CardRenderer";
import { AddRow, FieldEditor } from "@/components/system/FieldEditor";
import { RolesEditor } from "@/components/system/RolesEditor";
import { MoveButtons, iconBtn, inputCls } from "@/components/system/controls";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function CardStructureEditor() {
  const [kind, setKind] = useState<CardKind>("hero");
  const [system, setSystem] = useCampaignSystem();
  const type = system.cards[kind];
  const setType = (next: CardTypeDef) =>
    setSystem((prev) => ({ ...prev, cards: { ...prev.cards, [kind]: next } }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-0.5 rounded-lg bg-muted p-0.5" role="tablist" aria-label="Typ karty">
          {CARD_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={k === kind}
              onClick={() => setKind(k)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                k === kind ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {CARD_KIND_LABELS[k]}
            </button>
          ))}
        </div>
        {kind !== "hero" && <RebuildFromHero kind={kind} hero={system.cards.hero} onRebuild={setType} />}
      </div>

      <KindEditor key={kind} kind={kind} type={type} onChange={setType} />
    </div>
  );
}

function KindEditor({ kind, type, onChange }: { kind: CardKind; type: CardTypeDef; onChange: (next: CardTypeDef) => void }) {
  const [, setCards] = useCards(kind);
  const [newSection, setNewSection] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<{ id: string; name: string } | null>(null);
  const hidden = hiddenFields(type);

  const visibleSections = type.sections.filter(
    (section) => section.fields.length === 0 || section.fields.some((field) => !field.hidden),
  );

  const purge = (fieldId: string) => {
    onChange(purgeField(type, fieldId));
    setCards((prev) =>
      prev.map((card) => {
        const { [fieldId]: _removed, ...values } = card.values;
        return { ...card, values };
      }),
    );
    setPurgeTarget(null);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <div className="min-w-0 space-y-4">
        <p className="text-[length:--fs-meta] text-muted-foreground">
          Każda karta ma zawsze nazwę, portret i notatki. Poniżej układasz resztę.
        </p>

        {visibleSections.length === 0 && (
          <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Karta ma na razie tylko nazwę, portret i notatki. Dodaj pierwszą sekcję, np. „Cechy” albo „Ekwipunek”.
          </p>
        )}

        {visibleSections.map((section, sectionIndex) => (
          <SectionEditor
            key={section.id}
            type={type}
            sectionId={section.id}
            first={sectionIndex === 0}
            last={sectionIndex === visibleSections.length - 1}
            onChange={onChange}
          />
        ))}

        <AddRow
          placeholder="Nazwa nowej sekcji"
          value={newSection}
          onValue={setNewSection}
          onAdd={() => {
            onChange(addSection(type, newSection.trim()).type);
            setNewSection("");
          }}
        />

        {hidden.length > 0 && (
          <section className="space-y-1.5">
            <h3 className="text-sm font-medium">Ukryte pola</h3>
            <p className="text-[length:--fs-meta] text-muted-foreground">
              Karty zachowują ich wartości. Przywrócone pole wraca razem z nimi.
            </p>
            <ul className="space-y-1">
              {hidden.map(({ field, sectionName }) => (
                <li key={field.id} className="flex items-center gap-2 rounded-md border border-border/70 px-2 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {field.name} <span className="text-muted-foreground">({sectionName})</span>
                  </span>
                  <button type="button" className={iconBtn} onClick={() => onChange(restoreField(type, field.id))} aria-label={`Przywróć: ${field.name}`}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className={cn(iconBtn, "hover:text-destructive")}
                    onClick={() => setPurgeTarget({ id: field.id, name: field.name })}
                    aria-label={`Usuń na stałe: ${field.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-3 rounded-md border border-border p-3">
          <h3 className="text-sm font-medium">Powiązania z narzędziami</h3>
          <RolesEditor type={type} onChange={onChange} />
        </section>
      </div>

      <aside className="min-w-0">
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground lg:hidden"
        >
          {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showPreview ? "Ukryj podgląd karty" : "Pokaż podgląd karty"}
        </button>
        <div className={cn("lg:sticky lg:top-4 lg:block", !showPreview && "hidden")}>
          <CardPreview kind={kind} type={type} />
        </div>
      </aside>

      <AlertDialog open={purgeTarget !== null} onOpenChange={(open) => !open && setPurgeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć pole „{purgeTarget?.name}” na stałe?</AlertDialogTitle>
            <AlertDialogDescription>
              Wartości tego pola znikną ze wszystkich kart typu {CARD_KIND_LABELS[kind]}. Tego nie da się cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={() => purgeTarget && purge(purgeTarget.id)}>Usuń na stałe</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SectionEditor({
  type,
  sectionId,
  first,
  last,
  onChange,
}: {
  type: CardTypeDef;
  sectionId: string;
  first: boolean;
  last: boolean;
  onChange: (next: CardTypeDef) => void;
}) {
  const section = type.sections.find((s) => s.id === sectionId)!;
  const fields = section.fields.filter((field) => !field.hidden);
  const [newField, setNewField] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldType>("text");

  return (
    <section className="rounded-md border border-border">
      <header className="flex items-center gap-1.5 border-b border-border bg-white/[0.03] px-2 py-1.5">
        <input
          className={cn(inputCls, "flex-1 border-transparent bg-transparent font-medium hover:border-input")}
          value={section.name}
          onChange={(e) => onChange(updateSection(type, sectionId, { name: e.target.value }))}
          aria-label="Nazwa sekcji"
        />
        <label className="flex shrink-0 items-center gap-1.5 text-[length:--fs-meta] text-muted-foreground">
          <input
            type="checkbox"
            checked={section.wide === true}
            onChange={(e) => onChange(updateSection(type, sectionId, { wide: e.target.checked }))}
          />
          Pełna szerokość
        </label>
        <MoveButtons onMove={(d) => onChange(moveSection(type, sectionId, d))} first={first} last={last} label={section.name} />
        <button
          type="button"
          className={cn(iconBtn, "hover:text-destructive")}
          onClick={() => {
            onChange(hideSection(type, sectionId));
            if (section.fields.length > 0) toast(`Ukryto sekcję „${section.name}”. Jej pola są na liście ukrytych.`);
          }}
          aria-label={`Ukryj sekcję: ${section.name}`}
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      </header>
      <div className="space-y-1.5 p-2">
        {fields.length > 0 && (
          <ul className="space-y-1.5">
            {fields.map((field, index) => (
              <FieldEditor
                key={field.id}
                type={type}
                field={field}
                first={index === 0}
                last={index === fields.length - 1}
                onChange={onChange}
                onMove={(d) => onChange(moveField(type, field.id, d))}
                onHide={() => onChange(hideField(type, field.id))}
              />
            ))}
          </ul>
        )}
        <AddRow
          placeholder="Nazwa nowego pola"
          value={newField}
          onValue={setNewField}
          onAdd={() => {
            onChange(addField(type, sectionId, newFieldType, newField.trim()).type);
            setNewField("");
          }}
        >
          <select
            className={cn(inputCls, "w-40 shrink-0")}
            value={newFieldType}
            onChange={(e) => setNewFieldType(e.target.value as FieldType)}
            aria-label="Typ nowego pola"
          >
            {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((fieldType) => (
              <option key={fieldType} value={fieldType}>
                {FIELD_TYPE_LABELS[fieldType]}
              </option>
            ))}
          </select>
        </AddRow>
      </div>
    </section>
  );
}

/** A throwaway card that follows every structure edit, so the GM sees the result immediately. */
function CardPreview({ kind, type }: { kind: CardKind; type: CardTypeDef }) {
  const blank = useMemo(() => createEmptyCard(kind, type, "Przykładowa karta"), [kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const [card, setCard] = useState<Card>(blank);
  useEffect(() => setCard(blank), [blank]);

  return (
    <div className="space-y-1.5">
      <span className="text-[length:--fs-meta] text-muted-foreground">Podgląd karty (zmiany tutaj nie są zapisywane)</span>
      <div className="paper-sheet max-h-[75vh] overflow-y-auto rounded-md">
        <CardRenderer cardType={type} card={card} onChange={setCard} />
      </div>
    </div>
  );
}

function RebuildFromHero({
  kind,
  hero,
  onRebuild,
}: {
  kind: Exclude<CardKind, "hero">;
  hero: CardTypeDef;
  onRebuild: (next: CardTypeDef) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Utwórz od nowa z karty bohatera
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zastąpić strukturę karty {CARD_KIND_LABELS[kind]}?</AlertDialogTitle>
            <AlertDialogDescription>
              {kind === "npc"
                ? "Struktura NPC stanie się kopią karty bohatera z sekcją dla MG."
                : "Struktura potwora stanie się uproszczoną kopią karty bohatera."}{" "}
              Wartości na istniejących kartach zostaną zachowane, ale pola spoza nowej struktury przestaną być widoczne.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={() => onRebuild(kind === "npc" ? deriveNpcType(hero) : deriveMonsterType(hero))}>
              Zastąp
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
