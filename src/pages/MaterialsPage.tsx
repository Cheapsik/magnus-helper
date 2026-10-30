import { useCallback, useEffect, useState } from "react";
import { Copy, Eye, EyeOff, ImagePlus, Loader2, Pencil, Plus, Presentation, RefreshCw, Share2, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { useCampaigns } from "@/context/CampaignContext";
import { useAuth } from "@/context/AuthContext";
import {
  type Material,
  type Member,
  type SharedCampaign,
  deleteMaterial,
  enableSharing,
  getInviteToken,
  getSharedCampaign,
  hideMaterial,
  imageUrls,
  inviteUrl,
  listMaterials,
  listMembers,
  regenerateInvite,
  removeMember,
  saveMaterial,
  shareMaterial,
} from "@/lib/sharedCampaigns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaterialViewer } from "@/components/materials/MaterialViewer";

/** Rejects photos straight off a camera that would only be downscaled anyway after a long upload. */
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : "Coś poszło nie tak");

export default function MaterialsPage() {
  const { activeCampaign } = useCampaigns();
  const { user } = useAuth();
  const [shared, setShared] = useState<SharedCampaign | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!activeCampaign || !user) return;
    setShared(undefined);
    getSharedCampaign(activeCampaign.id).then(setShared, (e) => {
      fail(e);
      setShared(null);
    });
  }, [activeCampaign, user]);

  if (!user) {
    return <p className="text-sm text-muted-foreground">Zaloguj się, aby udostępniać materiały graczom.</p>;
  }
  if (!activeCampaign || shared === undefined) {
    return <p className="text-sm text-muted-foreground">Wczytuję…</p>;
  }

  if (!shared) {
    return (
      <Card className="max-w-xl border-dashed">
        <CardContent className="space-y-3 p-6">
          <p className="text-sm text-muted-foreground">
            Udostępnij kampanię „{activeCampaign.name}” graczom, aby zaprosić ich linkiem i pokazywać im obrazy oraz teksty.
            Do chmury trafią tylko nazwa kampanii, lista graczy i materiały, które tu dodasz; karty, notatki i reszta
            zostają na tym urządzeniu.
          </p>
          <Button
            disabled={busy}
            className="gap-2"
            onClick={async () => {
              setBusy(true);
              try {
                await enableSharing(activeCampaign.id, activeCampaign.name);
                setShared(await getSharedCampaign(activeCampaign.id));
              } catch (e) {
                fail(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Share2 className="h-4 w-4" /> Udostępnij kampanię graczom
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <SharedCampaignView key={shared.id} campaignId={shared.id} />;
}

function SharedCampaignView({ campaignId }: { campaignId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Partial<Material> | null>(null);
  const [sharing, setSharing] = useState<Material | null>(null);
  const [viewing, setViewing] = useState<Material | null>(null);

  const reload = useCallback(async () => {
    try {
      const [m, list] = await Promise.all([listMembers(campaignId), listMaterials(campaignId)]);
      setMembers(m);
      setMaterials(list);
      setUrls(await imageUrls(list.map((x) => x.image_path).filter((p): p is string => Boolean(p))));
    } catch (e) {
      fail(e);
    }
  }, [campaignId]);
  useEffect(() => void reload(), [reload]);

  const act = async (fn: () => Promise<unknown>, done?: string) => {
    try {
      await fn();
      if (done) toast.success(done);
      await reload();
    } catch (e) {
      fail(e);
    }
  };

  const audienceText = (m: Material) =>
    !m.shared ? "Ukryty" : m.audience ? `Udostępniony: ${m.audience.length} ${m.audience.length === 1 ? "gracz" : "graczy"}` : "Udostępniony wszystkim";

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <PlayersPanel campaignId={campaignId} members={members} onRemove={(m) => act(() => removeMember(campaignId, m.user_id), `Usunięto: ${m.display_name}`)} />

      <section className="min-w-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Materiały</h2>
          <Button size="sm" className="gap-1.5" onClick={() => setEditing({ title: "", body: "" })}>
            <Plus className="h-4 w-4" /> Nowy materiał
          </Button>
        </div>
        {materials.length === 0 && (
          <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Brak materiałów. Dodaj obraz lub tekst, który chcesz w którymś momencie pokazać graczom.
          </p>
        )}
        <ul className="grid gap-3 md:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
          {materials.map((m) => (
            <li key={m.id}>
              <Card className="overflow-hidden">
                <button type="button" className="block aspect-video w-full bg-black" onClick={() => setViewing(m)} aria-label={`Podgląd: ${m.title}`}>
                  {m.image_path && urls[m.image_path] ? (
                    <img src={urls[m.image_path]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="line-clamp-4 px-3 text-left text-xs text-white/70">{m.body}</span>
                  )}
                </button>
                <CardContent className="space-y-2 p-3">
                  <div className="flex items-start gap-1">
                    <p className="flex-1 truncate font-medium">{m.title}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edytuj" onClick={() => setEditing(m)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      aria-label="Usuń"
                      onClick={() => confirm(`Usunąć materiał „${m.title}”? Gracze też go stracą.`) && act(() => deleteMaterial(m))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{audienceText(m)}</p>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => setSharing(m)}>
                      <Share2 className="h-3.5 w-3.5" /> Udostępnij…
                    </Button>
                    {m.shared && (
                      <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => act(() => hideMaterial(m.id, m.campaign_id), "Ukryto przed graczami")}>
                        <EyeOff className="h-3.5 w-3.5" /> Ukryj
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <MaterialEditor
        material={editing}
        onClose={() => setEditing(null)}
        onSave={async (fields, image) => {
          await saveMaterial(campaignId, fields, image);
          setEditing(null);
          await reload();
        }}
      />
      <ShareDialog
        material={sharing}
        members={members}
        onClose={() => setSharing(null)}
        onShare={async (audience, show) => {
          if (!sharing) return;
          await act(() => shareMaterial(sharing.id, audience, show, sharing.campaign_id), show ? "Pokazano graczom" : "Udostępniono");
          setSharing(null);
        }}
      />
      <MaterialViewer material={viewing} imageUrl={viewing?.image_path ? urls[viewing.image_path] : undefined} onClose={() => setViewing(null)} />
    </div>
  );
}

function PlayersPanel({ campaignId, members, onRemove }: { campaignId: string; members: Member[]; onRemove: (m: Member) => void }) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => void getInviteToken(campaignId).then(setToken, fail), [campaignId]);
  const link = token ? inviteUrl(token) : "";

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">Gracze</h2>
      <Card>
        <CardContent className="space-y-2 p-3">
          <Label htmlFor="invite-link">Link zaproszenia</Label>
          <div className="flex gap-1.5">
            <Input id="invite-link" readOnly value={link} className="text-xs" onFocus={(e) => e.target.select()} />
            <Button
              variant="outline"
              size="icon"
              aria-label="Kopiuj link"
              disabled={!link}
              onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Skopiowano link"), fail)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
            onClick={async () => {
              if (!confirm("Wygenerować nowy link? Stary przestanie działać; gracze, którzy już dołączyli, zostają.")) return;
              try {
                setToken(await regenerateInvite(campaignId));
              } catch (e) {
                fail(e);
              }
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Nowy link
          </Button>
        </CardContent>
      </Card>
      {members.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nikt jeszcze nie dołączył. Wyślij graczom link.</p>
      ) : (
        <ul className="space-y-1">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-2 rounded-md border border-border/70 px-2 py-1.5 text-sm">
              <span className="flex-1 truncate">{m.display_name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                aria-label={`Usuń gracza ${m.display_name}`}
                onClick={() => confirm(`Usunąć gracza „${m.display_name}” z kampanii?`) && onRemove(m)}
              >
                <UserMinus className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MaterialEditor({
  material,
  onClose,
  onSave,
}: {
  material: Partial<Material> | null;
  onClose: () => void;
  onSave: (fields: { id?: string; title: string; body: string }, image: File | null) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setTitle(material?.title ?? "");
    setBody(material?.body ?? "");
    setImage(null);
  }, [material]);

  return (
    <Dialog open={Boolean(material)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{material?.id ? "Edytuj materiał" : "Nowy materiał"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              await onSave({ id: material?.id, title: title.trim(), body }, image);
            } catch (err) {
              fail(err);
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="material-title">Tytuł</Label>
            <Input id="material-title" autoFocus required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="np. List od burmistrza" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="material-body">Tekst (opcjonalnie)</Label>
            <Textarea id="material-body" rows={5} maxLength={20000} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="material-image">{material?.image_path ? "Zmień obraz (opcjonalnie)" : "Obraz (opcjonalnie)"}</Label>
            <label
              htmlFor="material-image"
              className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ImagePlus className="h-4 w-4" /> {image ? image.name : "Wybierz plik (JPG, PNG, WebP)"}
            </label>
            <input
              id="material-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file && file.size > MAX_SOURCE_BYTES) {
                  toast.error("Plik jest za duży (maks. 25 MB przed zmniejszeniem).");
                  return;
                }
                setImage(file);
              }}
            />
            <p className="text-xs text-muted-foreground">Obraz zostanie zmniejszony do 2048 px, zanim trafi do chmury.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Anuluj
            </Button>
            <Button type="submit" disabled={saving || !title.trim()} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Zapisz
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ShareDialog({
  material,
  members,
  onClose,
  onShare,
}: {
  material: Material | null;
  members: Member[];
  onClose: () => void;
  onShare: (audience: string[] | null, show: boolean) => Promise<void>;
}) {
  const [everyone, setEveryone] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => {
    setEveryone(!material?.audience);
    setPicked(material?.audience ?? []);
  }, [material]);
  const audience = everyone ? null : picked;
  const empty = !everyone && picked.length === 0;

  return (
    <Dialog open={Boolean(material)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Udostępnij „{material?.title}”</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={everyone} onChange={() => setEveryone(true)} /> Wszyscy gracze kampanii
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={!everyone} onChange={() => setEveryone(false)} /> Wybrani gracze
          </label>
          {!everyone && (
            <ul className="space-y-1 pl-6">
              {members.length === 0 && <li className="text-xs text-muted-foreground">Nikt jeszcze nie dołączył.</li>}
              {members.map((m) => (
                <li key={m.user_id}>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={picked.includes(m.user_id)}
                      onChange={(e) => setPicked((p) => (e.target.checked ? [...p, m.user_id] : p.filter((id) => id !== m.user_id)))}
                    />
                    {m.display_name}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            „Udostępnij” dodaje materiał do galerii graczy. „Pokaż teraz” dodatkowo otwiera go na pełnym ekranie u graczy, którzy mają
            otwartą aplikację.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={empty} className="gap-1.5" onClick={() => onShare(audience, false)}>
            <Eye className="h-4 w-4" /> Udostępnij
          </Button>
          <Button disabled={empty} className="gap-1.5" onClick={() => onShare(audience, true)}>
            <Presentation className="h-4 w-4" /> Pokaż teraz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
