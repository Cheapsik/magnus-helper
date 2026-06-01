import { useState } from "react";
import { Plus, Trash2, Edit2, Check, X, BookmarkPlus, Settings2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CombatPreset } from "@/lib/combatSessions";
import { cloneCombatantsForPreset } from "@/lib/combatSessions";
import type { Combatant } from "@/context/AppContext";
import { Separator } from "@/components/ui/separator";
import {
  CombatantFormFields,
  CombatantStatLine,
  emptyCombatant,
} from "@/components/combat/CombatantFormFields";
import { cn } from "@/lib/utils";

interface CombatPresetsPanelProps {
  presets: CombatPreset[];
  onSavePresets: (presets: CombatPreset[]) => void;
  onSaveAsPresetFromFight: (name: string) => void;
  variant?: "compact" | "full";
}

function SaveFightAsPresetBlock({
  saveFromFightName,
  setSaveFromFightName,
  onSave,
}: {
  saveFromFightName: string;
  setSaveFromFightName: (v: string) => void;
  onSave: () => void;
}) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="space-y-2 p-2.5">
        <div className="flex items-center gap-2">
          <BookmarkPlus className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-sm font-semibold">Zapisz bieżącą walkę jako preset</span>
        </div>
        <div className="flex gap-2">
          <Input
            value={saveFromFightName}
            onChange={(e) => setSaveFromFightName(e.target.value)}
            placeholder="Nazwa presetu, np. Gobliny w tawernie"
            className="h-9 flex-1 text-sm"
            onKeyDown={(e) => e.key === "Enter" && onSave()}
          />
          <Button className="h-9 shrink-0" onClick={onSave} disabled={!saveFromFightName.trim()}>
            Zapisz
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PresetCombatantEditor({
  combatants,
  onChange,
}: {
  combatants: Combatant[];
  onChange: (combatants: Combatant[]) => void;
}) {
  const [editingCombatantId, setEditingCombatantId] = useState<string | null>(null);
  const [combatantDraft, setCombatantDraft] = useState<Combatant | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newDraft, setNewDraft] = useState<Combatant>(() => emptyCombatant());

  const startEditCombatant = (c: Combatant) => {
    setEditingCombatantId(c.id);
    setCombatantDraft({ ...c, hp: { ...c.hp }, statuses: [...c.statuses] });
    setAddingNew(false);
  };

  const saveCombatantEdit = () => {
    if (!combatantDraft) return;
    onChange(combatants.map((x) => (x.id === combatantDraft.id ? combatantDraft : x)));
    setEditingCombatantId(null);
    setCombatantDraft(null);
  };

  const addNewCombatant = () => {
    if (!newDraft.name.trim()) return;
    onChange([...combatants, { ...newDraft, id: crypto.randomUUID(), name: newDraft.name.trim() }]);
    setNewDraft(emptyCombatant());
    setAddingNew(false);
  };

  return (
    <div className="space-y-2">
      {combatants.map((c) => {
        const isEditing = editingCombatantId === c.id && combatantDraft;

        if (isEditing && combatantDraft) {
          return (
            <Card key={c.id} className="border-primary/40">
              <CardContent className="space-y-2 p-2.5">
                <CombatantFormFields
                  combatant={combatantDraft}
                  onChange={setCombatantDraft}
                  idPrefix={`preset-edit-${c.id}`}
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-9 flex-1 gap-1" onClick={saveCombatantEdit}>
                    <Check className="h-3.5 w-3.5" />
                    Zapisz uczestnika
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9"
                    onClick={() => {
                      setEditingCombatantId(null);
                      setCombatantDraft(null);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        }

        return (
          <div key={c.id} className="rounded-lg border border-border/80 bg-card px-2.5 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-sm font-semibold",
                    c.isEnemy ? "text-destructive" : "text-foreground",
                  )}
                >
                  {c.name}
                </span>
                <CombatantStatLine c={c} />
              </div>
              <div className="flex shrink-0 gap-0.5">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => startEditCombatant(c)}
                  title="Edytuj"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => onChange(combatants.filter((x) => x.id !== c.id))}
                  title="Usuń"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      {addingNew ? (
        <Card className="border-dashed border-primary/40">
          <CardContent className="space-y-2 p-2.5">
            <p className="text-[10px] font-medium text-muted-foreground">Nowy uczestnik w presecie</p>
            <CombatantFormFields combatant={newDraft} onChange={setNewDraft} idPrefix="preset-new" />
            <div className="flex gap-2">
              <Button size="sm" className="h-9 flex-1" onClick={addNewCombatant} disabled={!newDraft.name.trim()}>
                Dodaj
              </Button>
              <Button size="sm" variant="ghost" className="h-9" onClick={() => setAddingNew(false)}>
                Anuluj
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-full gap-1 text-xs"
          onClick={() => {
            setAddingNew(true);
            setNewDraft(emptyCombatant());
            setEditingCombatantId(null);
            setCombatantDraft(null);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Dodaj uczestnika
        </Button>
      )}
    </div>
  );
}

function CombatPresetsFull({
  presets,
  onSavePresets,
  onSaveAsPresetFromFight,
}: Omit<CombatPresetsPanelProps, "variant">) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CombatPreset | null>(null);
  const [creating, setCreating] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [saveFromFightName, setSaveFromFightName] = useState("");

  const startCreate = () => {
    setCreating(true);
    setNewPresetName("");
    setEditingId(null);
    setDraft(null);
  };

  const commitCreate = () => {
    const name = newPresetName.trim();
    if (!name) return;
    const preset: CombatPreset = { id: crypto.randomUUID(), name, combatants: [] };
    onSavePresets([...presets, preset]);
    setCreating(false);
    setEditingId(preset.id);
    setDraft(preset);
  };

  const startEdit = (preset: CombatPreset) => {
    setEditingId(preset.id);
    setDraft({ ...preset, combatants: cloneCombatantsForPreset(preset.combatants) });
    setCreating(false);
  };

  const saveEdit = () => {
    if (!draft) return;
    onSavePresets(presets.map((p) => (p.id === draft.id ? draft : p)));
    setEditingId(null);
    setDraft(null);
  };

  const deletePreset = (id: string) => {
    onSavePresets(presets.filter((p) => p.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setDraft(null);
    }
  };

  const handleSaveFromFight = () => {
    const name = saveFromFightName.trim();
    if (!name) return;
    onSaveAsPresetFromFight(name);
    setSaveFromFightName("");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Szablony walk z pełnymi statystykami uczestników (WW, US, SB, pancerz, wytrzymałość itd.). Wczytasz je przy
        tworzeniu nowej zakładki walki.
      </p>

      <SaveFightAsPresetBlock
        saveFromFightName={saveFromFightName}
        setSaveFromFightName={setSaveFromFightName}
        onSave={handleSaveFromFight}
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Lista presetów ({presets.length})</span>
        <Button size="sm" variant="outline" className="h-9 gap-1 text-xs" onClick={startCreate}>
          <Plus className="h-3.5 w-3.5" />
          Nowy preset
        </Button>
      </div>

      {creating && (
        <Card>
          <CardContent className="space-y-2 p-2.5">
            <Input
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Nazwa presetu"
              className="h-9 text-sm"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && commitCreate()}
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-9 flex-1" onClick={commitCreate} disabled={!newPresetName.trim()}>
                Utwórz
              </Button>
              <Button size="sm" variant="ghost" className="h-9" onClick={() => setCreating(false)}>
                Anuluj
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {presets.length === 0 && !creating && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Brak presetów. Utwórz nowy lub zapisz bieżącą walkę.
          </CardContent>
        </Card>
      )}

      {presets.map((preset) => {
        const isEditing = editingId === preset.id && draft;

        if (isEditing && draft) {
          return (
            <Card key={preset.id} className="border-primary/40">
              <CardContent className="space-y-2 p-2.5">
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="h-9 text-sm font-semibold"
                />
                <Separator />
                <PresetCombatantEditor
                  combatants={draft.combatants}
                  onChange={(combatants) => setDraft({ ...draft, combatants })}
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-9 flex-1 gap-1" onClick={saveEdit}>
                    <Check className="h-3.5 w-3.5" />
                    Zapisz preset
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9"
                    onClick={() => {
                      setEditingId(null);
                      setDraft(null);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        }

        return (
          <Card key={preset.id}>
            <CardContent className="flex items-center justify-between gap-2 p-2.5">
              <div className="min-w-0">
                <span className="block truncate text-sm font-semibold">{preset.name}</span>
                <Badge variant="secondary" className="mt-0.5 text-[10px]">
                  {preset.combatants.length} uczestników
                </Badge>
              </div>
              <div className="flex shrink-0 gap-0.5">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  onClick={() => startEdit(preset)}
                  title="Edytuj"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-destructive"
                  onClick={() => deletePreset(preset.id)}
                  title="Usuń"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CombatPresetsCompact({
  presets,
  onSaveAsPresetFromFight,
  layout = "sidebar",
}: {
  presets: CombatPreset[];
  onSaveAsPresetFromFight: (name: string) => void;
  layout?: "sidebar" | "page";
}) {
  const [saveFromFightName, setSaveFromFightName] = useState("");

  const handleSaveFromFight = () => {
    const name = saveFromFightName.trim();
    if (!name) return;
    onSaveAsPresetFromFight(name);
    setSaveFromFightName("");
  };

  const list = (
    <div
      className={
        layout === "sidebar"
          ? "min-h-0 flex-1 space-y-2 overflow-y-auto p-2"
          : "space-y-2"
      }
    >
        <SaveFightAsPresetBlock
          saveFromFightName={saveFromFightName}
          setSaveFromFightName={setSaveFromFightName}
          onSave={handleSaveFromFight}
        />
        {presets.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            Brak presetów.
          </p>
        ) : (
          presets.map((preset) => (
            <div key={preset.id} className="rounded-lg border border-border/80 bg-card px-2.5 py-2">
              <span className="block truncate text-sm font-semibold">{preset.name}</span>
              <Badge variant="secondary" className="mt-1 text-[10px]">
                {preset.combatants.length} uczestników
              </Badge>
            </div>
          ))
        )}
    </div>
  );

  if (layout === "page") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Presety wczytujesz przy „+ Nowa walka”. Pełna edycja w szufladzie poniżej.
        </p>
        {list}
      </div>
    );
  }

  return (
    <>
      <p className="shrink-0 px-3 pt-2 text-[10px] leading-snug text-muted-foreground">
        Presety wczytujesz przy „+ Nowa walka”. Pełna edycja w szufladzie poniżej.
      </p>
      {list}
    </>
  );
}

export function CombatPresetsMobileTab(
  props: Omit<CombatPresetsPanelProps, "variant">,
) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      <CombatPresetsCompact
        presets={props.presets}
        onSaveAsPresetFromFight={props.onSaveAsPresetFromFight}
        layout="page"
      />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="h-11 w-full gap-2">
            <Settings2 className="h-4 w-4" />
            Zarządzaj presetami
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Presety walk</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <CombatPresetsFull {...props} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function CombatPresetsPanel({
  presets,
  onSavePresets,
  onSaveAsPresetFromFight,
  variant = "full",
}: CombatPresetsPanelProps) {
  if (variant === "compact") {
    return (
      <CombatPresetsCompact
        presets={presets}
        onSaveAsPresetFromFight={onSaveAsPresetFromFight}
        layout="sidebar"
      />
    );
  }
  return (
    <CombatPresetsFull
      presets={presets}
      onSavePresets={onSavePresets}
      onSaveAsPresetFromFight={onSaveAsPresetFromFight}
    />
  );
}
