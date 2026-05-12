import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Plus, Edit2, Trash2, MoreVertical, Music, Users, Network, Zap, X, Dice5, Gem, MessageSquare, Timer as TimerIcon, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { useScene, type Scene, type QuickAction } from "@/context/SceneContext";
import { useAmbient } from "@/context/AmbientContext";
import { useApp, type SavedNpc } from "@/context/AppContext";
import { rollDie } from "@/lib/dice";
import { cn } from "@/lib/utils";

interface QuestLite { id: string; title: string; column: string; }
interface StoredQuest { id?: string; title?: string; column?: string; }
interface StoredRumor { text?: string; content?: string; }

const QUICK_DEFS: { type: QuickAction["type"]; label: string; icon: LucideIcon }[] = [
  { type: "plotki", label: "Losuj plotkę", icon: MessageSquare },
  { type: "loot", label: "Generuj łup", icon: Gem },
  { type: "roll", label: "Rzut k100", icon: Dice5 },
  { type: "timer", label: "Dodaj timer", icon: TimerIcon },
];

interface DraftScene {
  name: string;
  description: string;
  ambientLayers: string[];
  ambientVolumes: Record<string, number>;
  linkedNpcIds: string[];
  linkedThreadIds: string[];
  quickActions: QuickAction[];
  autoStartAmbient: boolean;
}

const EMPTY_DRAFT: DraftScene = {
  name: "",
  description: "",
  ambientLayers: [],
  ambientVolumes: {},
  linkedNpcIds: [],
  linkedThreadIds: [],
  quickActions: [],
  autoStartAmbient: true,
};

export default function ScenePage() {
  const { scenes, activeScene, createScene, updateScene, deleteScene, activateScene, deactivateScene } = useScene();
  const ambient = useAmbient();
  const { savedNpcs } = useApp();

  const [quests, setQuests] = useState<QuestLite[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("rpg_quests");
      if (raw) {
        const data = JSON.parse(raw) as { quests?: StoredQuest[] };
        setQuests((data.quests || []).map((q) => ({ id: String(q.id ?? ""), title: String(q.title ?? ""), column: String(q.column ?? "") })));
      }
    } catch {
      setQuests([]);
    }
  }, []);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftScene>(EMPTY_DRAFT);
  const [quickResult, setQuickResult] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT });
    setDrawerOpen(true);
  };
  const openEdit = (s: Scene) => {
    setEditingId(s.id);
    setDraft({
      name: s.name,
      description: s.description,
      ambientLayers: [...s.ambientLayers],
      ambientVolumes: { ...(s.ambientVolumes || {}) },
      linkedNpcIds: [...s.linkedNpcIds],
      linkedThreadIds: [...s.linkedThreadIds],
      quickActions: [...s.quickActions],
      autoStartAmbient: s.autoStartAmbient !== false,
    });
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!draft.name.trim()) { toast.error("Nazwa sceny jest wymagana"); return; }
    if (editingId) {
      updateScene(editingId, draft);
      toast.success("Scena zapisana");
    } else {
      createScene(draft);
      toast.success("Scena utworzona");
    }
    setDrawerOpen(false);
  };
  const handleDelete = () => {
    if (editingId) {
      deleteScene(editingId);
      toast.success("Scena usunięta");
      setDrawerOpen(false);
    }
  };

  const toggleLayer = (id: string) => {
    setDraft((d) => {
      const has = d.ambientLayers.includes(id);
      return {
        ...d,
        ambientLayers: has ? d.ambientLayers.filter((x) => x !== id) : [...d.ambientLayers, id],
        ambientVolumes: has ? d.ambientVolumes : { ...d.ambientVolumes, [id]: d.ambientVolumes[id] ?? 70 },
      };
    });
  };
  const toggleNpc = (id: string) => {
    setDraft((d) => ({ ...d, linkedNpcIds: d.linkedNpcIds.includes(id) ? d.linkedNpcIds.filter((x) => x !== id) : [...d.linkedNpcIds, id] }));
  };
  const toggleThread = (id: string) => {
    setDraft((d) => ({ ...d, linkedThreadIds: d.linkedThreadIds.includes(id) ? d.linkedThreadIds.filter((x) => x !== id) : [...d.linkedThreadIds, id] }));
  };
  const toggleQuickAction = (type: QuickAction["type"], label: string) => {
    setDraft((d) => {
      const exists = d.quickActions.find((a) => a.type === type);
      if (exists) return { ...d, quickActions: d.quickActions.filter((a) => a.type !== type) };
      return { ...d, quickActions: [...d.quickActions, { id: crypto.randomUUID(), type, label }] };
    });
  };

  const runQuickAction = (action: QuickAction) => {
    if (action.type === "roll") {
      const r = rollDie(100);
      setQuickResult(`🎲 k100 → ${r}`);
    } else if (action.type === "plotki") {
      try {
        const raw = localStorage.getItem("rpg_rumors");
        const list = raw ? (JSON.parse(raw) as StoredRumor[]) : [];
        if (list.length) {
          const pick = list[Math.floor(Math.random() * list.length)];
          setQuickResult(`💬 ${pick.text || pick.content || JSON.stringify(pick)}`);
        } else setQuickResult("Brak zapisanych plotek.");
      } catch { setQuickResult("Brak danych plotek."); }
    } else if (action.type === "loot") {
      const items = ["Sakiewka srebra", "Sztylet", "Stary medalion", "Mapa", "Klucz z mosiądzu"];
      setQuickResult(`💎 ${items[rollDie(items.length) - 1]}`);
    } else if (action.type === "timer") {
      window.location.href = "/timers";
    }
  };

  if (activeScene) return <ActiveSceneView scene={activeScene} onEdit={() => openEdit(activeScene)} onDeactivate={deactivateScene} ambient={ambient} savedNpcs={savedNpcs} quests={quests} runQuickAction={runQuickAction} quickResult={quickResult} clearQuick={() => setQuickResult(null)} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-app-brand text-lg font-bold flex items-center gap-2"><MapPin className="h-5 w-5" /> Scena</h1>
        <Button size="sm" className="gap-1" onClick={openCreate}><Plus className="h-3.5 w-3.5" /> Nowa scena</Button>
      </div>

      {scenes.length === 0 ? (
        <div className="border border-dashed border-border py-16 px-6 flex flex-col items-center text-center space-y-4">
          <MapPin className="h-12 w-12 text-muted-foreground/30" />
          <p className="italic text-muted-foreground">Żadna scena nie czeka jeszcze na rozegranie...</p>
          <Button onClick={openCreate} className="gap-1"><Plus className="h-4 w-4" /> Nowa scena</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {scenes.map((s) => (
            <SceneCard
              key={s.id}
              scene={s}
              ambientNames={s.ambientLayers.map((id) => ambient.config.sounds.find((x) => x.id === id)?.name).filter(Boolean) as string[]}
              onActivate={() => activateScene(s.id)}
              onEdit={() => openEdit(s)}
              onDelete={() => { if (confirm(`Usunąć scenę "${s.name}"?`)) deleteScene(s.id); }}
            />
          ))}
        </div>
      )}

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? "Edycja sceny" : "Nowa scena"}</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 py-4 pb-24">
            {/* Basics */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Nazwa</label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="np. Karczma Pod Psem" />
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Opis</label>
              <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Krótki opis atmosfery lub kontekstu..." rows={2} />
            </div>

            {/* Ambient */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Music className="h-4 w-4" /> Ambient</h3>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox checked={draft.autoStartAmbient} onCheckedChange={(v) => setDraft({ ...draft, autoStartAmbient: !!v })} />
                  Włącz automatycznie
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground/70 italic">Przy aktywacji sceny te warstwy włączą się automatycznie. Pozostałe aktywne warstwy zostaną wyciszone fade-out.</p>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {ambient.config.sounds.map((s) => {
                  const checked = draft.ambientLayers.includes(s.id);
                  return (
                    <div key={s.id} className="border border-border bg-card/40 px-2 py-1.5">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox checked={checked} onCheckedChange={() => toggleLayer(s.id)} />
                        <span>{s.emoji}</span>
                        <span className="flex-1 truncate">{s.name}</span>
                      </label>
                      {checked && (
                        <div className="flex items-center gap-2 mt-1.5 pl-6">
                          <Slider value={[draft.ambientVolumes[s.id] ?? 70]} onValueChange={([v]) => setDraft({ ...draft, ambientVolumes: { ...draft.ambientVolumes, [s.id]: v } })} min={0} max={100} step={1} className="flex-1" />
                          <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right">{draft.ambientVolumes[s.id] ?? 70}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* NPCs */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> NPC w scenie</h3>
              {savedNpcs.length === 0 ? <p className="text-xs text-muted-foreground italic">Brak zapisanych NPC.</p> : (
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {savedNpcs.map((n) => (
                    <label key={n.id} className="flex items-center gap-2 text-sm cursor-pointer border border-border bg-card/40 px-2 py-1.5">
                      <Checkbox checked={draft.linkedNpcIds.includes(n.id)} onCheckedChange={() => toggleNpc(n.id)} />
                      <span className="flex-1 truncate">{n.name} {n.occupation && <span className="text-muted-foreground text-xs">· {n.occupation}</span>}</span>
                    </label>
                  ))}
                </div>
              )}
              {draft.linkedNpcIds.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {draft.linkedNpcIds.map((id) => {
                    const n = savedNpcs.find((x) => x.id === id);
                    return n ? <span key={id} className="text-[10px] px-1.5 py-0.5 border border-primary/40 text-primary">{n.name}</span> : null;
                  })}
                </div>
              )}
            </section>

            {/* Threads */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Network className="h-4 w-4" /> Wątki</h3>
              {quests.length === 0 ? <p className="text-xs text-muted-foreground italic">Brak wątków.</p> : (
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {quests.map((q) => (
                    <label key={q.id} className="flex items-center gap-2 text-sm cursor-pointer border border-border bg-card/40 px-2 py-1.5">
                      <Checkbox checked={draft.linkedThreadIds.includes(q.id)} onCheckedChange={() => toggleThread(q.id)} />
                      {q.column === "gorace" && <span className="h-1.5 w-1.5 rounded-full bg-destructive" />}
                      <span className="flex-1 truncate">{q.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            {/* Quick actions */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4" /> Szybkie akcje</h3>
              <div className="space-y-1">
                {QUICK_DEFS.map((def) => {
                  const checked = !!draft.quickActions.find((a) => a.type === def.type);
                  return (
                    <label key={def.type} className="flex items-center gap-2 text-sm cursor-pointer border border-border bg-card/40 px-2 py-1.5">
                      <Checkbox checked={checked} onCheckedChange={() => toggleQuickAction(def.type, def.label)} />
                      <def.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{def.label}</span>
                    </label>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="absolute left-0 right-0 bottom-0 border-t border-border bg-background p-3 flex items-center gap-2">
            <Button onClick={handleSave} className="flex-1">Zapisz scenę</Button>
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Anuluj</Button>
            {editingId && <Button variant="destructive" size="sm" onClick={handleDelete}><Trash2 className="h-3.5 w-3.5" /></Button>}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SceneCard({ scene, ambientNames, onActivate, onEdit, onDelete }: {
  scene: Scene; ambientNames: string[]; onActivate: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <Card className={cn("relative transition-all", scene.isActive && "border-primary")}
      style={scene.isActive ? { boxShadow: "0 0 20px hsl(var(--primary) / 0.15)" } : undefined}>
      <CardContent className="p-3 space-y-2">
        {scene.isActive && (
          <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 bg-primary/20 text-primary uppercase tracking-wider">Aktywna</span>
        )}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base flex items-center gap-2">
            <span className={cn("inline-block w-1.5 h-1.5 rounded-full", scene.isActive ? "bg-primary" : "bg-muted-foreground/40")} />
            {scene.name}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant={scene.isActive ? "ghost" : "default"} className="h-7 text-xs" onClick={onActivate}>
              {scene.isActive ? "Dezaktywuj" : "Aktywuj"}
            </Button>
            <div className="relative">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMenuOpen((v) => !v)}><MoreVertical className="h-3.5 w-3.5" /></Button>
              {menuOpen && (
                <div className="absolute right-0 top-8 z-20 border border-border bg-popover py-1 min-w-[120px] shadow-lg">
                  <button onClick={() => { setMenuOpen(false); onEdit(); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 flex items-center gap-2"><Edit2 className="h-3 w-3" /> Edytuj</button>
                  <button onClick={() => { setMenuOpen(false); onDelete(); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 text-destructive flex items-center gap-2"><Trash2 className="h-3 w-3" /> Usuń</button>
                </div>
              )}
            </div>
          </div>
        </div>
        {scene.description && <p className="text-xs text-muted-foreground">{scene.description}</p>}
        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Music className="h-3 w-3" /> {ambientNames.length ? ambientNames.join(" · ") : "—"}</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {scene.linkedNpcIds.length} NPC</span>
          <span className="flex items-center gap-1"><Network className="h-3 w-3" /> {scene.linkedThreadIds.length} wątk.</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface ActiveSceneViewProps {
  scene: Scene;
  onEdit: () => void;
  onDeactivate: () => void;
  ambient: ReturnType<typeof useAmbient>;
  savedNpcs: SavedNpc[];
  quests: QuestLite[];
  runQuickAction: (action: QuickAction) => void;
  quickResult: string | null;
  clearQuick: () => void;
}

function ActiveSceneView({ scene, onEdit, onDeactivate, ambient, savedNpcs, quests, runQuickAction, quickResult, clearQuick }: ActiveSceneViewProps) {
  const npcs = scene.linkedNpcIds.map((id) => savedNpcs.find((n) => n.id === id)).filter((npc): npc is SavedNpc => Boolean(npc));
  const threads = scene.linkedThreadIds.map((id) => quests.find((q) => q.id === id)).filter((quest): quest is QuestLite => Boolean(quest));
  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="border-primary" style={{ boxShadow: "0 0 24px hsl(var(--primary) / 0.18)" }}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-app-brand text-xl font-bold flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> {scene.name}</h1>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={onEdit}><Edit2 className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={onDeactivate}>Dezaktywuj</Button>
            </div>
          </div>
          {scene.description && <p className="text-xs text-muted-foreground">{scene.description}</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Ambient panel */}
        <Card>
          <CardContent className="p-3 space-y-2">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Music className="h-3.5 w-3.5" /> Ambient</h3>
            {scene.ambientLayers.length === 0 && <p className="text-xs text-muted-foreground italic">Brak warstw</p>}
            {scene.ambientLayers.map((id: string) => {
              const sound = ambient.config.sounds.find((s) => s.id === id);
              if (!sound) return null;
              const vol = ambient.volumes[id] ?? 70;
              const playing = ambient.playing[id];
              return (
                <div key={id} className="border border-border/60 px-2 py-1.5">
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className={cn("h-1.5 w-1.5 rounded-full", playing ? "bg-primary" : "bg-muted-foreground/40")} />
                    <span className="flex-1 truncate">{sound.emoji} {sound.name}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{vol}%</span>
                  </div>
                  <Slider value={[vol]} onValueChange={([v]) => ambient.changeVolume(id, v)} min={0} max={100} step={1} className="mt-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* NPCs */}
        <Card>
          <CardContent className="p-3 space-y-1.5">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> NPC</h3>
            {npcs.length === 0 && <p className="text-xs text-muted-foreground italic">Brak NPC</p>}
            {npcs.map((n) => (
              <Link key={n.id} to="/npcs" className="block px-2 py-1.5 border border-border/60 hover:border-primary/50 transition-colors">
                <div className="text-sm">{n.name}</div>
                {n.occupation && <div className="text-[10px] text-muted-foreground">{n.occupation}</div>}
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Threads */}
        <Card>
          <CardContent className="p-3 space-y-1.5">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Network className="h-3.5 w-3.5" /> Wątki</h3>
            {threads.length === 0 && <p className="text-xs text-muted-foreground italic">Brak wątków</p>}
            {threads.map((q) => (
              <Link key={q.id} to="/quests" className="flex items-center gap-1.5 px-2 py-1.5 border border-border/60 hover:border-primary/50 transition-colors text-sm">
                {q.column === "gorace" && <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />}
                <span className="truncate">{q.title}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      {scene.quickActions.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Szybkie akcje</h3>
            <div className="flex flex-wrap gap-2">
              {scene.quickActions.map((a: QuickAction) => (
                <Button key={a.id} size="sm" variant="outline" className="text-xs" onClick={() => runQuickAction(a)}>
                  {a.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {quickResult && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={clearQuick}>
          <Card className="max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-start justify-between">
                <p className="text-base">{quickResult}</p>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={clearQuick}><X className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
