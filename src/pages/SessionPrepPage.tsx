import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NarrativePage from "@/pages/NarrativePage";
import { Plus, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MentionTextarea } from "@/components/mention/MentionTextarea";
import { useApp } from "@/context/AppContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { logChronicleEvent } from "@/lib/chronicle";
import {
  prepForSession,
  reviveSecrets,
  reviveSessionPreps,
  setSecretRevealed,
  splitSecretsForSession,
  type Secret,
  type SessionPrep,
  type SessionPrepMap,
} from "@/lib/secrets";

/** Two horizons of preparation: this session's list, and the campaign's story graph. */
export default function SessionPrepPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "fabula" ? "fabula" : "sesja";
  return (
    <Tabs value={tab} onValueChange={(v) => setParams(v === "fabula" ? { tab: v } : {}, { replace: true })} className="space-y-4">
      <TabsList>
        <TabsTrigger value="sesja">Ta sesja</TabsTrigger>
        <TabsTrigger value="fabula">Fabuła</TabsTrigger>
      </TabsList>
      <TabsContent value="sesja">
        <SessionChecklist />
      </TabsContent>
      <TabsContent value="fabula">
        <NarrativePage />
      </TabsContent>
    </Tabs>
  );
}

function SessionChecklist() {
  const { noteSessionCatalog } = useApp();
  const { sessions } = noteSessionCatalog;
  const [secrets, setSecrets] = useLocalStorage<Secret[]>("rpg_secrets", [], { revive: reviveSecrets });
  const [preps, setPreps] = useLocalStorage<SessionPrepMap>("rpg_session_prep", {}, { revive: reviveSessionPreps });
  const [pickedSessionId, setPickedSessionId] = useState(noteSessionCatalog.activeSessionId);
  const [newSecret, setNewSecret] = useState("");
  const [newScene, setNewScene] = useState("");

  const sessionId = sessions.some((s) => s.id === pickedSessionId) ? pickedSessionId : sessions[0].id;
  const prep = prepForSession(preps, sessions, sessionId, secrets);
  const { ready, available } = splitSecretsForSession(secrets, prep, sessionId);
  const revealedElsewhere = secrets.filter((s) => s.revealedInSessionId && s.revealedInSessionId !== sessionId);
  const sessionName = (id: string) => sessions.find((s) => s.id === id)?.name ?? "usunięta sesja";

  const updatePrep = (fn: (p: SessionPrep) => Partial<SessionPrep>) =>
    setPreps((all) => {
      const current = prepForSession(all, sessions, sessionId, secrets);
      return { ...all, [sessionId]: { ...current, ...fn(current) } };
    });

  const editSecret = (id: string, text: string) =>
    setSecrets((all) => all.map((s) => (s.id === id ? { ...s, text } : s)));

  const deleteSecret = (id: string) => setSecrets((all) => all.filter((s) => s.id !== id));

  const addSecret = () => {
    const text = newSecret.trim();
    if (!text) return;
    const id = crypto.randomUUID();
    setSecrets((all) => [...all, { id, text }]);
    updatePrep((p) => ({ secretIds: [...p.secretIds, id] }));
    setNewSecret("");
  };

  const addScene = () => {
    const text = newScene.trim();
    if (!text) return;
    updatePrep((p) => ({ scenes: [...p.scenes, text] }));
    setNewScene("");
  };

  return (
    <div className="space-y-4">
      <Select value={sessionId} onValueChange={setPickedSessionId}>
        <SelectTrigger className="w-full sm:w-64" aria-label="Sesja">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sessions.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Mocny początek</CardTitle>
        </CardHeader>
        <CardContent>
          <MentionTextarea
            value={prep.strongStart}
            onChange={(strongStart) => updatePrep(() => ({ strongStart }))}
            placeholder="Od czego zaczyna się sesja? Coś się dzieje od pierwszej minuty."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sceny</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {prep.scenes.map((scene, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={scene}
                onChange={(e) =>
                  updatePrep((p) => ({ scenes: p.scenes.map((s, j) => (j === i ? e.target.value : s)) }))
                }
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Usuń scenę"
                onClick={() => updatePrep((p) => ({ scenes: p.scenes.filter((_, j) => j !== i) }))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newScene}
              onChange={(e) => setNewScene(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addScene()}
              placeholder="Krótki opis możliwej sceny"
            />
            <Button variant="outline" size="icon" aria-label="Dodaj scenę" onClick={addScene}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sekrety i tropy na tę sesję</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ready.length === 0 && (
            <p className="text-sm text-muted-foreground">Wybierz nieujawnione sekrety poniżej albo dodaj nowy.</p>
          )}
          {ready.map((secret) => (
            <div key={secret.id} className="flex items-start gap-2">
              <label className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground whitespace-nowrap">
                <Checkbox
                  checked={secret.revealedInSessionId === sessionId}
                  onCheckedChange={(checked) => {
                    if (checked === true) logChronicleEvent({ kind: "secret", text: `Ujawniono sekret: ${secret.text}` });
                    setSecrets((all) => setSecretRevealed(all, secret.id, checked === true ? sessionId : null));
                  }}
                />
                ujawniono
              </label>
              <div className="flex-1">
                <MentionTextarea
                  value={secret.text}
                  onChange={(text) => editSecret(secret.id, text)}
                  className="min-h-0"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Odłóż sekret"
                title="Odłóż (zostaje nieujawniony na później)"
                onClick={() => updatePrep((p) => ({ secretIds: p.secretIds.filter((id) => id !== secret.id) }))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <MentionTextarea
                value={newSecret}
                onChange={setNewSecret}
                placeholder="Nowy sekret lub trop (użyj @, by wskazać NPC lub quest)"
                className="min-h-0"
              />
            </div>
            <Button variant="outline" size="icon" aria-label="Dodaj sekret" onClick={addSecret}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Nieujawnione ({available.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {available.length === 0 && <p className="text-sm text-muted-foreground">Brak innych nieujawnionych sekretów.</p>}
          {available.map((secret) => (
            <div key={secret.id} className="flex items-start gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Przygotuj na tę sesję"
                onClick={() => updatePrep((p) => ({ secretIds: [...p.secretIds, secret.id] }))}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <MentionTextarea value={secret.text} onChange={(text) => editSecret(secret.id, text)} className="min-h-0" />
              </div>
              <Button variant="ghost" size="icon" aria-label="Usuń sekret" onClick={() => deleteSecret(secret.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {revealedElsewhere.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ujawnione w innych sesjach</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {revealedElsewhere.map((secret) => (
              <div key={secret.id} className="flex items-start gap-2 text-sm">
                <span className="pt-2 text-xs text-muted-foreground whitespace-nowrap">
                  {sessionName(secret.revealedInSessionId!)}
                </span>
                <div className="flex-1">
                  <MentionTextarea value={secret.text} onChange={(text) => editSecret(secret.id, text)} className="min-h-0" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSecrets((all) => setSecretRevealed(all, secret.id, null))}
                >
                  Cofnij
                </Button>
                <Button variant="ghost" size="icon" aria-label="Usuń sekret" onClick={() => deleteSecret(secret.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
