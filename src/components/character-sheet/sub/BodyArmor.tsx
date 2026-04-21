import type { CharacterSheetCore } from "../types";

export function BodyArmor({
  values,
  onChange,
}: {
  values: CharacterSheetCore["punktyZbroi"];
  onChange: (patch: Partial<CharacterSheetCore["punktyZbroi"]>) => void;
}) {
  const cell = (
    className: string,
    label: string,
    range: string,
    field: keyof CharacterSheetCore["punktyZbroi"],
  ) => (
    <div className={"armor-slot " + className}>
      <div className="armor-cell">
        <div className="armor-cell-label">
          <span className="armor-cell-name">{label}</span>
          <span className="armor-cell-range">{range}</span>
        </div>
        <input
          type="number"
          inputMode="numeric"
          value={values[field]}
          onChange={(e) => onChange({ [field]: e.target.value } as Partial<CharacterSheetCore["punktyZbroi"]>)}
          className="armor-input"
          aria-label={`${label} (${range})`}
        />
      </div>
    </div>
  );

  return (
    <div className="armor-diagram">
      {cell("armor-slot-head", "Głowa", "01–15", "glowa")}
      {cell("armor-slot-larm", "L. ręka", "36–55", "lewaReka")}
      {cell("armor-slot-body", "Korpus", "56–80", "korpus")}
      {cell("armor-slot-rarm", "P. ręka", "16–35", "prawaReka")}
      <div className="armor-slot armor-slot-figure" aria-hidden="true">
        <svg viewBox="0 0 100 200" preserveAspectRatio="xMidYMid meet" className="armor-svg">
          <circle cx="50" cy="20" r="13" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
          <line x1="50" y1="33" x2="50" y2="40" stroke="#1a1a1a" strokeWidth="1.5" />
          <path d="M30 42 L70 42 L66 110 L34 110 Z" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
          <path d="M30 44 L18 90 L22 120 L28 120 L26 92 L34 60" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
          <path d="M70 44 L82 90 L78 120 L72 120 L74 92 L66 60" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
          <path d="M36 110 L32 185 L42 185 L46 110" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
          <path d="M64 110 L68 185 L58 185 L54 110" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
        </svg>
      </div>
      {cell("armor-slot-lleg", "L. noga", "91–00", "lewaNoga")}
      {cell("armor-slot-rleg", "P. noga", "81–90", "prawaNoga")}
    </div>
  );
}
