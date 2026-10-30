import { useRef } from "react";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { Section } from "@/components/card/Section";
import { TableField } from "@/components/card/TableField";
import {
  type Card,
  type CardTypeDef,
  type CurrentMaxValue,
  type FieldDef,
  type FieldValue,
  type TableValue,
} from "@/lib/cardSchema";
import { coerceValue } from "@/lib/structureOps";
import { evaluateFormula } from "@/lib/formulaEngine";
import { DiceInput } from "@/components/card/DiceInput";

/**
 * Renders a card: the fixed core every card has, then the campaign's own
 * structure. Magnus supplies the widgets; the campaign supplies every section,
 * field and label. Hidden fields are skipped but their values stay on the card.
 */
export function CardRenderer({
  cardType,
  card,
  onChange,
  readOnly,
}: {
  cardType: CardTypeDef;
  card: Card;
  onChange: (next: Card) => void;
  readOnly?: boolean;
}) {
  const setField = (fieldId: string, value: FieldValue) =>
    onChange({ ...card, values: { ...card.values, [fieldId]: value } });

  const sections = cardType.sections
    .map((section) => ({ ...section, fields: section.fields.filter((field) => !field.hidden) }))
    .filter((section) => section.fields.length > 0);

  return (
    <>
      <CardCore card={card} onChange={onChange} readOnly={readOnly} />
      {sections.map((section) => (
        <Section key={section.id} title={section.name} wide={section.wide}>
          <div className={section.wide ? undefined : "paper-field-grid"}>
            {section.fields.map((field) => (
              <FieldRenderer
                key={field.id}
                field={field}
                value={card.values[field.id]}
                onChange={(value) => setField(field.id, value)}
                readOnly={readOnly}
                hideLabel={field.name.trim().toLowerCase() === section.name.trim().toLowerCase()}
                allValues={card.values}
              />
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}

const PORTRAIT_SIZE = 256;

/** Shrinks an uploaded image so a portrait stays small enough for local storage. */
function readPortrait(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Nie udało się wczytać obrazu"));
      image.onload = () => {
        const scale = Math.min(1, PORTRAIT_SIZE / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function CardCore({ card, onChange, readOnly }: { card: Card; onChange: (next: Card) => void; readOnly?: boolean }) {
  const fileInput = useRef<HTMLInputElement>(null);

  const uploadPortrait = async (file: File | undefined) => {
    if (!file) return;
    try {
      onChange({ ...card, portrait: await readPortrait(file) });
    } catch {
      toast.error("Nie udało się wczytać portretu");
    }
  };

  return (
    <Section title="Karta" wide>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
            {card.portrait ? (
              <img src={card.portrait} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-8 w-8 text-muted-foreground" aria-hidden />
            )}
          </div>
          {!readOnly && (
            <div className="flex gap-1">
              <button type="button" className="paper-add-btn" onClick={() => fileInput.current?.click()}>
                {card.portrait ? "Zmień" : "Dodaj portret"}
              </button>
              {card.portrait && (
                <button
                  type="button"
                  className="paper-icon-btn"
                  onClick={() => onChange({ ...card, portrait: "" })}
                  aria-label="Usuń portret"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void uploadPortrait(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label className="paper-field">
            <span className="paper-field-label">Nazwa</span>
            <input
              type="text"
              value={card.name}
              readOnly={readOnly}
              onChange={(e) => onChange({ ...card, name: e.target.value })}
              className="paper-input"
            />
          </label>
          <label className="paper-field">
            <span className="paper-field-label">Notatki</span>
            <textarea
              value={card.notes}
              readOnly={readOnly}
              onChange={(e) => onChange({ ...card, notes: e.target.value })}
              className="paper-input min-h-[80px]"
            />
          </label>
        </div>
      </div>
    </Section>
  );
}

function TrackInput({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: FieldDef;
  value: number;
  onChange: (next: number) => void;
  readOnly?: boolean;
}) {
  const max = Math.max(1, field.trackMax ?? 5);
  return (
    <span className="flex flex-wrap gap-1" role="group" aria-label={field.name}>
      {Array.from({ length: max }, (_, index) => {
        const filled = index < value;
        return (
          <button
            key={index}
            type="button"
            disabled={readOnly}
            // Clicking the last filled box clears it, so a track can go back to zero.
            onClick={() => onChange(index + 1 === value ? index : index + 1)}
            className={`h-4 w-4 rounded-full border ${filled ? "border-primary bg-primary" : "border-border bg-transparent"}`}
            aria-label={`${index + 1} z ${max}`}
            aria-pressed={filled}
          />
        );
      })}
    </span>
  );
}

export function FieldRenderer({
  field,
  value,
  onChange,
  readOnly,
  hideLabel,
  allValues,
}: {
  field: FieldDef;
  value: FieldValue | undefined;
  onChange: (next: FieldValue) => void;
  readOnly?: boolean;
  hideLabel?: boolean;
  allValues?: Record<string, FieldValue>;
}) {
  const current = coerceValue(field, value);

  switch (field.type) {
    case "table":
      return (
        <div className="paper-subbox">
          {!hideLabel && <div className="paper-subhead">{field.name}</div>}
          <TableField field={field} value={current as TableValue} onChange={onChange} readOnly={readOnly} />
        </div>
      );

    case "longtext":
      return (
        <label className="paper-field">
          <span className="paper-field-label">{field.name}</span>
          <textarea
            value={typeof current === "string" ? current : ""}
            readOnly={readOnly}
            onChange={(e) => onChange(e.target.value)}
            className="paper-input min-h-[80px]"
          />
        </label>
      );

    case "number":
      return (
        <label className="paper-field">
          <span className="paper-field-label">{field.name}</span>
          <input
            type="number"
            inputMode="numeric"
            value={typeof current === "number" ? current : ""}
            readOnly={readOnly}
            onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
            className="paper-input"
          />
        </label>
      );

    case "dice":
      return (
        <div className="paper-field">
          <span className="paper-field-label">{field.name}</span>
          <DiceInput
            label={field.name}
            value={typeof current === "string" ? current : ""}
            onChange={onChange}
            readOnly={readOnly}
          />
        </div>
      );

    case "track":
      return (
        <div className="paper-field">
          <span className="paper-field-label">{field.name}</span>
          <TrackInput
            field={field}
            value={typeof current === "number" ? current : 0}
            onChange={onChange}
            readOnly={readOnly}
          />
        </div>
      );

    case "computed": {
      const computed = field.formula && allValues ? evaluateFormula(field.formula, allValues) : 0;
      return (
        <label className="paper-field">
          <span className="paper-field-label">{field.name}</span>
          <span className="paper-input bg-muted/50 tabular-nums font-semibold cursor-default" aria-readonly>
            {Number.isInteger(computed) ? computed : computed.toFixed(1)}
          </span>
        </label>
      );
    }

    case "checkbox":
      return (
        <label className="paper-field">
          <span className="paper-field-label">{field.name}</span>
          <input
            type="checkbox"
            checked={current === true}
            disabled={readOnly}
            onChange={(e) => onChange(e.target.checked)}
            className="paper-checkbox"
          />
        </label>
      );

    case "currentMax": {
      const resource = current as CurrentMaxValue;
      return (
        <label className="paper-field">
          <span className="paper-field-label">{field.name}</span>
          <span className="flex items-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              value={resource.current}
              readOnly={readOnly}
              onChange={(e) => onChange({ ...resource, current: Number(e.target.value) || 0 })}
              className="paper-input"
              aria-label={`${field.name} — aktualne`}
            />
            <span className="text-muted-foreground">/</span>
            <input
              type="number"
              inputMode="numeric"
              value={resource.max}
              readOnly={readOnly}
              onChange={(e) => onChange({ ...resource, max: Number(e.target.value) || 0 })}
              className="paper-input"
              aria-label={`${field.name} — maksymalne`}
            />
          </span>
        </label>
      );
    }

    case "select":
      return (
        <label className="paper-field">
          <span className="paper-field-label">{field.name}</span>
          <select
            value={typeof current === "string" ? current : ""}
            disabled={readOnly}
            onChange={(e) => onChange(e.target.value)}
            className="paper-input"
          >
            <option value="" />
            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      );

    case "multiselect": {
      const selected = Array.isArray(current) ? current : [];
      const toggle = (option: string) =>
        onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
      return (
        <div className="paper-field">
          <span className="paper-field-label">{field.name}</span>
          <span className="flex flex-wrap gap-2">
            {(field.options ?? []).map((option) => (
              <label key={option} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  disabled={readOnly}
                  onChange={() => toggle(option)}
                  className="paper-checkbox"
                />
                {option}
              </label>
            ))}
          </span>
        </div>
      );
    }

    default:
      return (
        <label className="paper-field">
          <span className="paper-field-label">{field.name}</span>
          <input
            type="text"
            value={typeof current === "string" ? current : ""}
            readOnly={readOnly}
            onChange={(e) => onChange(e.target.value)}
            className="paper-input"
          />
        </label>
      );
  }
}
