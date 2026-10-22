import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { ArrowLeft, Crown, DoorOpen, Loader2, LogOut, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  type Material,
  type Membership,
  useInvitePreview,
  imageUrls,
  isFreshShow,
  joinCampaign,
  leaveCampaign,
  listMaterials,
  myMemberships,
  renameSelf,
  setPendingInvite,
  subscribeMaterials,
  useAppRole,
  usePendingInvite,
} from "@/lib/sharedCampaigns";
import { Button } from "@/components/ui/button";
import { MaterialViewer } from "@/components/materials/MaterialViewer";
import Logo from "@/components/Logo";
import { AuthCard, AuthHeader, AuthShell, GoldButton } from "@/pages/AuthPage";

const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : "Coś poszło nie tak");

/** What a player sees: the campaigns they joined and the materials their GM shared with them. */
export default function PlayerApp() {
  const { user, loading, signOut } = useAuth();
  const [, setRole] = useAppRole();
  const [pending] = usePendingInvite();
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    try {
      setMemberships(await myMemberships(user.id));
    } catch (e) {
      fail(e);
      setMemberships([]);
    }
  }, [user]);
  useEffect(() => void reload(), [reload]);

  const open = memberships?.find((m) => m.campaign_id === openId) ?? null;

  // Players always sign in first, also where the dev build lets the GM app through without it.
  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (pending && user) {
    return (
      <InviteJoinScreen
        token={pending}
        suggestedName={(user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? ""}
        onJoined={async (id) => {
          setRole("player");
          await reload();
          setOpenId(id);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Logo className="h-6 w-6" />
        <span className="font-app-brand flex-1 truncate text-[1.0625rem]">Magnus Helper · Panel gracza</span>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setRole("gm")} title="Przełącz na tryb Mistrza gry">
          <Crown className="h-4 w-4" /> <span className="hidden sm:inline">Tryb MG</span>
        </Button>
        <Button variant="ghost" size="icon" aria-label="Wyloguj" onClick={() => void signOut()}>
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 p-4">
        {!user ? null : open ? (
          <CampaignGallery key={open.campaign_id} membership={open} userId={user.id} onBack={() => setOpenId(null)} onLeft={reload} />
        ) : memberships === null ? (
          <p className="text-sm text-muted-foreground">Wczytuję…</p>
        ) : memberships.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Nie należysz jeszcze do żadnej kampanii. Poproś Mistrza gry o link zaproszenia i otwórz go.
          </p>
        ) : (
          <section className="space-y-2">
            <h1 className="text-lg font-semibold">Twoje kampanie</h1>
            <ul className="grid gap-2 sm:grid-cols-2">
              {memberships.map((m) => (
                <li key={m.campaign_id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(m.campaign_id)}
                    className="w-full rounded-md border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/60"
                  >
                    <div className="font-medium">{m.campaign_name}</div>
                    <div className="text-xs text-muted-foreground">Grasz jako: {m.display_name}</div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

/** The step after signing in from an invite, in the same look as the sign-in screen. */
function InviteJoinScreen({ token, suggestedName, onJoined }: { token: string; suggestedName: string; onJoined: (campaignId: string) => Promise<void> }) {
  const campaign = useInvitePreview(token);
  const [name, setName] = useState(suggestedName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dead = campaign === null;

  return (
    <AuthShell features={false}>
      <AuthCard>
        <AuthHeader subtitle={dead ? "— Link zaproszenia jest nieważny —" : `— Zaproszenie do kampanii${campaign ? ` „${campaign}”` : ""} —`} />
        {dead ? (
          <p className="mb-5 text-center text-sm text-white/70">Ten link już nie działa. Poproś Mistrza gry o nowy.</p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                const joined = await joinCampaign(token, name.trim());
                setPendingInvite(null);
                toast.success(`Dołączono do kampanii „${joined.campaign_name}”`);
                await onJoined(joined.campaign_id);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Nie udało się dołączyć.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="text-center text-sm text-white/70">Ostatni krok: podaj nazwę, pod którą zobaczy Cię Mistrz gry.</p>
            <div className="space-y-1.5">
              <label htmlFor="player-name" className="block text-xs font-medium text-white/90 sm:text-sm">
                Imię albo imię postaci
              </label>
              <input
                id="player-name"
                required
                autoFocus
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 w-full rounded-md border border-white/15 bg-black/40 px-3 text-sm text-white placeholder:text-white/40 focus:border-[#c5a059] focus:outline-none sm:h-[--h-control] sm:rounded-lg"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <GoldButton disabled={busy || !name.trim()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Dołącz do kampanii</GoldButton>
          </form>
        )}
        <button type="button" onClick={() => setPendingInvite(null)} className="mt-4 w-full text-center text-xs text-white/50 hover:text-white/80">
          {dead ? "Przejdź do Panelu gracza" : "Nie teraz"}
        </button>
      </AuthCard>
    </AuthShell>
  );
}

function CampaignGallery({
  membership,
  userId,
  onBack,
  onLeft,
}: {
  membership: Membership;
  userId: string;
  onBack: () => void;
  onLeft: () => Promise<void>;
}) {
  const cid = membership.campaign_id;
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [viewing, setViewing] = useState<Material | null>(null);
  const [seen, setSeen] = useLocalStorage<Record<string, string>>("magnus_seen_materials", {}, { global: true });
  const seenAtOpen = useRef(seen[cid] ?? "");
  const known = useRef(new Set<string>());

  const reload = useCallback(async (show?: Material | null) => {
    try {
      const list = await listMaterials(cid);
      setMaterials(list);
      setUrls(await imageUrls(list.map((m) => m.image_path).filter((p): p is string => Boolean(p))));
      // shortcut: only rows still visible reach the player, so a material the GM hid disappears on the next refresh.
      for (const m of list) {
        if (known.current.size && !known.current.has(m.id)) toast(`Nowy materiał: ${m.title}`);
      }
      list.forEach((m) => known.current.add(m.id));
      const fresh = show && list.find((m) => m.id === show.id);
      if (fresh && isFreshShow(fresh)) setViewing(fresh);
    } catch (e) {
      fail(e);
    }
  }, [cid]);

  useEffect(() => {
    void reload();
    const unsubscribe = subscribeMaterials(cid, (m) => void reload(m));
    const onVisible = () => document.visibilityState === "visible" && void reload();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      setSeen((s) => ({ ...s, [cid]: new Date().toISOString() }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, reload]);

  const isNew = (m: Material) => Boolean(m.shared_at && m.shared_at > seenAtOpen.current);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Wróć do listy kampanii" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="flex-1 truncate text-lg font-semibold">{membership.campaign_name}</h1>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={async () => {
            const name = prompt("Jak ma Cię widzieć Mistrz gry?", membership.display_name)?.trim();
            if (!name) return;
            try {
              await renameSelf(cid, userId, name.slice(0, 60));
              await onLeft();
            } catch (e) {
              fail(e);
            }
          }}
        >
          <Pencil className="h-3.5 w-3.5" /> {membership.display_name}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-destructive"
          onClick={async () => {
            if (!confirm(`Opuścić kampanię „${membership.campaign_name}”? Stracisz dostęp do jej materiałów.`)) return;
            try {
              await leaveCampaign(cid, userId);
              onBack();
              await onLeft();
            } catch (e) {
              fail(e);
            }
          }}
        >
          <DoorOpen className="h-3.5 w-3.5" /> Opuść
        </Button>
      </div>

      {materials === null ? (
        <p className="text-sm text-muted-foreground">Wczytuję…</p>
      ) : materials.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Mistrz gry jeszcze niczego nie udostępnił. Nowe materiały pojawią się tu same.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {materials.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => setViewing(m)} className="block w-full overflow-hidden rounded-md border border-border bg-card text-left hover:border-primary/60">
                <div className="aspect-video bg-black">
                  {m.image_path && urls[m.image_path] ? (
                    <img src={urls[m.image_path]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <p className="line-clamp-5 p-3 text-xs text-white/70">{m.body}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="flex-1 truncate font-medium">{m.title}</span>
                  {isNew(m) && <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">Nowe</span>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <MaterialViewer material={viewing} imageUrl={viewing?.image_path ? urls[viewing.image_path] : undefined} onClose={() => setViewing(null)} />
    </section>
  );
}
