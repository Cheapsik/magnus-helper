import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type CardTypeDef, type LabelledRef, type RoleBindings, validateRoles, visibleFields } from "@/lib/cardSchema";
import { listRefTargets } from "@/lib/structureOps";
import { Labeled, RefSelect, iconBtn, inputCls } from "@/components/system/controls";

/**
 * Which card values the shared tools read. Nothing is inferred from field
 * names (docs/adr/0003): every binding here is the GM's explicit choice.
 */
export function RolesEditor({ type, onChange }: { type: CardTypeDef; onChange: (next: CardTypeDef) => void }) {
  const targets = listRefTargets(type);
  const issues = validateRoles(type);
  const setRoles = (patch: Partial<RoleBindings>) => onChange({ ...type, roles: { ...type.roles, ...patch } });

  const subtitleCandidates = visibleFields(type).filter((field) =>
    ["text", "number", "select"].includes(field.type),
  );
  const subtitle = type.subtitleFieldIds ?? [];

  return (
    <div className="space-y-4">
      <Labeled label="Pod nazwą na listach pokazuj">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {subtitleCandidates.length === 0 && (
            <span className="text-[length:--fs-meta] text-muted-foreground">Dodaj pole tekstowe lub liczbowe, żeby wybrać.</span>
          )}
          {subtitleCandidates.map((field) => (
            <label key={field.id} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={subtitle.includes(field.id)}
                onChange={(e) =>
                  onChange({
                    ...type,
                    subtitleFieldIds: e.target.checked
                      ? [...subtitle, field.id]
                      : subtitle.filter((id) => id !== field.id),
                  })
                }
              />
              {field.name}
            </label>
          ))}
        </div>
      </Labeled>

      <div className="grid gap-3 sm:grid-cols-3">
        <Labeled label="Inicjatywa w trackerze walki">
          <RefSelect
            targets={targets}
            value={type.roles.initiative}
            onChange={(initiative) => setRoles({ initiative })}
            label="Inicjatywa"
            emptyLabel="Wpisywana ręcznie"
          />
        </Labeled>
        <Labeled label="Zasób główny: aktualny">
          <RefSelect
            targets={targets}
            value={type.roles.mainResource?.current}
            onChange={(current) =>
              setRoles({
                mainResource: current ? { current, max: type.roles.mainResource?.max ?? current } : undefined,
              })
            }
            label="Zasób główny, wartość aktualna"
          />
        </Labeled>
        <Labeled label="Zasób główny: maksymalny">
          <RefSelect
            targets={targets}
            value={type.roles.mainResource?.max}
            onChange={(max) =>
              setRoles({
                mainResource:
                  max && type.roles.mainResource ? { ...type.roles.mainResource, max } : type.roles.mainResource,
              })
            }
            label="Zasób główny, wartość maksymalna"
          />
        </Labeled>
      </div>

      <LabelledRefList
        title="Pokazuj w trackerze obok zasobu głównego"
        entries={type.roles.combatResources}
        targets={targets}
        onChange={(combatResources) => setRoles({ combatResources })}
      />
      <LabelledRefList
        title="Odejmuj od obrażeń (redukcja)"
        entries={type.roles.damageReduction}
        targets={targets}
        onChange={(damageReduction) => setRoles({ damageReduction })}
      />

      {issues.length > 0 && (
        <ul className="space-y-0.5 rounded-md border border-destructive/40 bg-destructive/[0.06] px-3 py-2 text-[length:--fs-meta] text-destructive">
          {issues.map((issue) => (
            <li key={`${issue.what}-${issue.message}`}>
              {issue.what}: {issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LabelledRefList({
  title,
  entries,
  targets,
  onChange,
}: {
  title: string;
  entries: LabelledRef[];
  targets: ReturnType<typeof listRefTargets>;
  onChange: (next: LabelledRef[]) => void;
}) {
  const first = targets[0];
  return (
    <div className="space-y-1.5">
      <span className="text-[length:--fs-meta] text-muted-foreground">{title}</span>
      {entries.map((entry, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <RefSelect
            targets={targets}
            value={entry.ref}
            onChange={(ref) =>
              ref
                ? onChange(entries.map((e, i) => (i === index ? { ...e, ref } : e)))
                : onChange(entries.filter((_, i) => i !== index))
            }
            label={title}
          />
          <input
            className={cn(inputCls, "w-36 shrink-0")}
            value={entry.label}
            onChange={(e) => onChange(entries.map((x, i) => (i === index ? { ...x, label: e.target.value } : x)))}
            aria-label="Etykieta"
            placeholder="Etykieta"
          />
          <button
            type="button"
            className={cn(iconBtn, "hover:text-destructive")}
            onClick={() => onChange(entries.filter((_, i) => i !== index))}
            aria-label="Usuń powiązanie"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={!first}
        onClick={() => first && onChange([...entries, { ref: first.ref, label: first.label }])}
        className="inline-flex items-center gap-1 text-[length:--fs-meta] text-muted-foreground hover:text-foreground disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" /> Dodaj
      </button>
    </div>
  );
}
