import { Link } from "react-router-dom";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { newId } from "@/lib/cardSchema";
import { useCards } from "@/lib/cardStore";
import { logChronicleEvent } from "@/lib/chronicle";
import {
  KNOWLEDGE_KEY, SECRETS_KEY, SECRET_CATEGORY_LABELS, reviveKnowledge, reviveSecrets, secretName, setKnown,
  type Knowledge, type Secret,
} from "@/lib/secrets";
import { KnowledgeMatrix } from "@/components/secrets/KnowledgeMatrix";
import { SecretEditor } from "@/components/secrets/SecretEditor";
import { SecretHandout } from "@/components/secrets/SecretHandout";

export default function SecretsPage() {
  const [secrets, setSecrets] = useLocalStorage<Secret[]>(SECRETS_KEY, [], { revive: reviveSecrets });
  const [knowledge, setKnowledge] = useLocalStorage<Knowledge>(KNOWLEDGE_KEY, {}, { revive: reviveKnowledge });
  const [heroes] = useCards("hero");
  const [npcs] = useCards("npc");
  const [editing, setEditing] = useState<Secret | null>(null);

  const save = (s: Secret) => {
    setSecrets((prev) => (prev.some((p) => p.id === s.id) ? prev.map((p) => (p.id === s.id ? s : p)) : [...prev, s]));
    setEditing(null);
  };

  const toggle = (secretId: string, heroId: string, known: boolean) => {
    const secret = secrets.find((s) => s.id === secretId);
    const hero = heroes.find((h) => h.id === heroId);
    if (!secret || !hero) return;
    // "how" is the secret's discovery conditions: the best record of the circumstances we have
    setKnowledge((k) => setKnown(k, secretId, heroId, known, secret.conditions ?? ""));
    if (known) logChronicleEvent({ kind: "secret", text: `${hero.name} odkrywa sekret: ${secretName(secret)}` });
  };

  const remove = (id: string) => {
    setSecrets((prev) => prev.filter((s) => s.id !== id));
    setKnowledge((k) => {
      const { [id]: _drop, ...rest } = k;
      return rest;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Te same sekrety wybierasz na konkretną sesję w{" "}
          <Link to="/prep" className="text-primary underline underline-offset-2">Przygotowaniu</Link>.
        </p>
        <Button type="button" onClick={() => setEditing({ id: newId(), text: "", category: "plot" })}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nowy sekret
        </Button>
      </div>

      {editing && <SecretEditor key={editing.id} secret={editing} onSave={save} onCancel={() => setEditing(null)} />}

      <div className="space-y-3">
        {secrets.length === 0 && <p className="text-sm text-muted-foreground">Brak sekretów.</p>}
        {secrets.map((s) => (
          <Card key={s.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                {secretName(s)}
                {s.category && <Badge variant="secondary">{SECRET_CATEGORY_LABELS[s.category]}</Badge>}
                {(s.npcIds ?? []).map((id) => {
                  const n = npcs.find((c) => c.id === id);
                  return n && <Badge key={id} variant="outline">{n.name}</Badge>;
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="whitespace-pre-wrap">{s.text}</p>
              {s.conditions && <p className="text-muted-foreground">Warunki: {s.conditions}</p>}
              {s.links && <p className="text-muted-foreground">Powiązania: {s.links}</p>}
              <div className="flex gap-2">
                <SecretHandout secret={s} />
                <Button type="button" size="sm" variant="ghost" aria-label="Edytuj" onClick={() => setEditing(s)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button type="button" size="sm" variant="ghost" aria-label="Usuń" onClick={() => remove(s.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Kto co wie</h2>
        <KnowledgeMatrix heroes={heroes} secrets={secrets} knowledge={knowledge} onToggle={toggle} />
      </section>
    </div>
  );
}
