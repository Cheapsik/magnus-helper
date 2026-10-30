import { FieldRenderer } from "@/components/card/CardRenderer";
import { Section } from "@/components/card/Section";
import { cardTitle, type FieldValue } from "@/lib/cardSchema";
import { useCards, useCardType } from "@/lib/cardStore";
import type { PlayerVisibility } from "@/lib/playerPanel";

/** Hero card for players: the GM chooses per section whether it is hidden, read-only or editable. */
export function PlayerCardView({ heroId, visibility }: { heroId: string; visibility: PlayerVisibility }) {
  const cardType = useCardType("hero");
  const [cards, setCards] = useCards("hero");
  const card = cards.find((c) => c.id === heroId);
  if (!card) return <p className="text-muted-foreground">Wybierz bohatera.</p>;

  // Functional update so a GM edit made meanwhile is not overwritten.
  const setField = (fieldId: string, value: FieldValue) =>
    setCards((prev) => prev.map((c) => (c.id === heroId ? { ...c, values: { ...c.values, [fieldId]: value } } : c)));

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-semibold">{cardTitle(card)}</h3>
      {cardType.sections.map((section) => {
        const access = visibility.sections[section.id] ?? "view";
        const fields = section.fields.filter((f) => !f.hidden);
        if (access === "hidden" || fields.length === 0) return null;
        return (
          <Section key={section.id} title={section.name} wide={section.wide}>
            <div className={section.wide ? undefined : "paper-field-grid"}>
              {fields.map((field) => (
                <FieldRenderer
                  key={field.id}
                  field={field}
                  value={card.values[field.id]}
                  onChange={(v) => setField(field.id, v)}
                  readOnly={access !== "edit"}
                  hideLabel={field.name.trim().toLowerCase() === section.name.trim().toLowerCase()}
                />
              ))}
            </div>
          </Section>
        );
      })}
    </div>
  );
}
