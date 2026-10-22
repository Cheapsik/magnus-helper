import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { readJson, writeJson } from "@/lib/storage";
import { canvasToJpeg, shrinkImage } from "@/lib/images";

/**
 * Players and the materials the GM shares with them (supabase/migrations/*_player_materials.sql).
 * Only this lives in the cloud; the rest of a campaign stays in the GM's browser. Access is
 * enforced by row level security, so the role switch below only changes what the UI offers.
 */

export type AppRole = "gm" | "player";

/** Device setting, shared by every campaign. null: automatic — a player with no campaigns of their own lands in the player panel. */
// A new key: values saved by earlier builds, which defaulted to "gm", must not decide anything now.
export const useAppRole = () => useLocalStorage<AppRole | null>("magnus_app_role", null, { global: true });

/** An invite opened before signing in, kept until the player has joined. */
const PENDING_INVITE_KEY = "magnus_pending_invite";
export const readPendingInvite = () => readJson<string | null>(PENDING_INVITE_KEY, null, { global: true });
export const setPendingInvite = (token: string | null) => writeJson(PENDING_INVITE_KEY, token, { global: true });
export const usePendingInvite = () => useLocalStorage<string | null>(PENDING_INVITE_KEY, null, { global: true });

const BUCKET = "materials";
const MAX_IMAGE_SIDE = 2048;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type SharedCampaign = { id: string; name: string; owner_id: string };
export type Member = { user_id: string; display_name: string; joined_at: string };
export type Material = {
  id: string;
  campaign_id: string;
  title: string;
  body: string;
  image_path: string | null;
  shared: boolean;
  /** null: every member. */
  audience: string[] | null;
  shared_at: string | null;
  shown_at: string | null;
  created_at: string;
  updated_at: string;
};
export type Membership = { campaign_id: string; display_name: string; campaign_name: string };

/** Known server and network failures in words a player understands; anything else stays generic. */
const FRIENDLY: [RegExp, string][] = [
  [/invalid invite/i, "Ten link zaproszenia jest nieważny. Poproś Mistrza gry o nowy."],
  [/owner cannot join/i, "To Twoja własna kampania, prowadzisz ją jako Mistrz gry."],
  [/invalid name|display_name_check|violates check constraint/i, "Nazwa jest za długa albo pusta."],
  [/not signed in|jwt|session/i, "Sesja wygasła. Zaloguj się ponownie."],
  [/failed to fetch|networkerror|load failed/i, "Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie."],
  [/duplicate key/i, "To już istnieje."],
  [/maximum allowed size|payload too large|exceeded/i, "Plik jest za duży (maks. 10 MB)."],
  [/mime type|invalid_mime_type/i, "Nieobsługiwany format obrazu. Użyj JPG, PNG albo WebP."],
  [/permission denied|row-level security|42501/i, "Nie masz uprawnień do tej operacji."],
];

export function friendlyError(message: string): string {
  return FRIENDLY.find(([pattern]) => pattern.test(message))?.[1] ?? "Coś poszło nie tak. Spróbuj ponownie.";
}

async function run<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  let result: { data: T; error: { message: string } | null };
  try {
    result = await query;
  } catch (e) {
    result = { data: null as T, error: { message: e instanceof Error ? e.message : String(e) } };
  }
  if (result.error) {
    console.error("[Magnus Helper] cloud error:", result.error.message);
    throw new Error(friendlyError(result.error.message));
  }
  return result.data;
}

export const inviteUrl = (token: string) => `${window.location.origin}${import.meta.env.BASE_URL}join/${token}`;

// ─── GM ───────────────────────────────────────────────────────────────────────

export async function getSharedCampaign(id: string): Promise<SharedCampaign | null> {
  return run(supabase.from("shared_campaigns").select("id, name, owner_id").eq("id", id).maybeSingle());
}

export async function enableSharing(id: string, name: string): Promise<void> {
  await run(supabase.from("shared_campaigns").insert({ id, name }));
  await run(supabase.from("campaign_invites").insert({ campaign_id: id }));
}

export async function getInviteToken(id: string): Promise<string> {
  return (await run(supabase.from("campaign_invites").select("token").eq("campaign_id", id).single())).token;
}

/** The old link stops working at once. */
export async function regenerateInvite(id: string): Promise<string> {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, "0")).join("");
  await run(supabase.from("campaign_invites").update({ token }).eq("campaign_id", id));
  return token;
}

export async function listMembers(id: string): Promise<Member[]> {
  return run(supabase.from("campaign_members").select("user_id, display_name, joined_at").eq("campaign_id", id).order("joined_at"));
}

export async function removeMember(id: string, userId: string): Promise<void> {
  await run(supabase.from("campaign_members").delete().eq("campaign_id", id).eq("user_id", userId));
}

export async function listMaterials(id: string): Promise<Material[]> {
  return run(supabase.from("materials").select("*").eq("campaign_id", id).order("created_at", { ascending: false }));
}

/** Creates or edits a material; a new image replaces the old one. */
export async function saveMaterial(
  campaignId: string,
  fields: { id?: string; title: string; body: string },
  image?: File | null,
): Promise<void> {
  const { id } = fields.id
    ? await run(supabase.from("materials").update({ title: fields.title, body: fields.body, updated_at: new Date().toISOString() }).eq("id", fields.id).select("id").single())
    : await run(supabase.from("materials").insert({ campaign_id: campaignId, title: fields.title, body: fields.body }).select("id").single());
  if (!image) return;
  const blob = await canvasToJpeg(await shrinkImage(image, MAX_IMAGE_SIDE));
  const path = `${campaignId}/${id}.jpg`;
  await run(supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: "image/jpeg" }));
  await run(supabase.from("materials").update({ image_path: path }).eq("id", id));
}

export async function deleteMaterial(material: Material): Promise<void> {
  if (material.image_path) await run(supabase.storage.from(BUCKET).remove([material.image_path]));
  await run(supabase.from("materials").delete().eq("id", material.id));
}

/** `show`: also opens it full screen for players who have the app open. */
export async function shareMaterial(id: string, audience: string[] | null, show: boolean): Promise<void> {
  const now = new Date().toISOString();
  await run(supabase.from("materials").update({ shared: true, audience, shared_at: now, ...(show ? { shown_at: now } : {}) }).eq("id", id));
}

export async function hideMaterial(id: string): Promise<void> {
  await run(supabase.from("materials").update({ shared: false, shown_at: null }).eq("id", id));
}

/** Removes the campaign's players, invite, materials and their images from the cloud. */
export async function deleteSharedCampaign(id: string): Promise<void> {
  const materials = await listMaterials(id);
  const paths = materials.map((m) => m.image_path).filter((p): p is string => Boolean(p));
  if (paths.length) await run(supabase.storage.from(BUCKET).remove(paths));
  await run(supabase.from("shared_campaigns").delete().eq("id", id));
}

// ─── Player ───────────────────────────────────────────────────────────────────

/** The campaign's name for a valid invite, readable before signing in; null for a dead link. */
export async function invitePreview(token: string): Promise<string | null> {
  return (await run(supabase.rpc("invite_preview", { invite_token: token }))) as string | null;
}

/** undefined while loading. */
export function useInvitePreview(token: string | null): string | null | undefined {
  const [name, setName] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!token) return setName(null);
    setName(undefined);
    invitePreview(token).then(setName, () => setName(null));
  }, [token]);
  return name;
}

export type InviteStatus = { campaign_id: string; campaign_name: string; is_member: boolean; is_owner: boolean };

/** null for a dead link. Needs a signed-in user. */
export async function inviteStatus(token: string): Promise<InviteStatus | null> {
  const rows = (await run(supabase.rpc("invite_status", { invite_token: token }))) as InviteStatus[];
  return rows[0] ?? null;
}

/** The signed-in player's campaigns; [] without a user, undefined while loading. */
export function useMemberships(userId: string | undefined): Membership[] | undefined {
  const [list, setList] = useState<Membership[] | undefined>(undefined);
  useEffect(() => {
    if (!userId) return setList([]);
    setList(undefined);
    myMemberships(userId).then(setList, () => setList([]));
  }, [userId]);
  return list;
}

/** Where sign-in and e-mail confirmation return: the invite itself, so it survives another window. */
export function authReturnPath(): string {
  const token = readPendingInvite();
  return token ? `join/${token}` : "";
}

export async function joinCampaign(token: string, name: string): Promise<{ campaign_id: string; campaign_name: string }> {
  const rows = await run(supabase.rpc("join_campaign", { invite_token: token, name }));
  return (rows as { campaign_id: string; campaign_name: string }[])[0];
}

export async function myMemberships(userId: string): Promise<Membership[]> {
  const rows = await run(
    supabase.from("campaign_members").select("campaign_id, display_name, shared_campaigns(name)").eq("user_id", userId).order("joined_at"),
  );
  return (rows as unknown as { campaign_id: string; display_name: string; shared_campaigns: { name: string } | null }[]).map((r) => ({
    campaign_id: r.campaign_id,
    display_name: r.display_name,
    campaign_name: r.shared_campaigns?.name ?? "Kampania",
  }));
}

export async function renameSelf(campaignId: string, userId: string, name: string): Promise<void> {
  await run(supabase.from("campaign_members").update({ display_name: name }).eq("campaign_id", campaignId).eq("user_id", userId));
}

export async function leaveCampaign(campaignId: string, userId: string): Promise<void> {
  await run(supabase.from("campaign_members").delete().eq("campaign_id", campaignId).eq("user_id", userId));
}

// ─── Both ─────────────────────────────────────────────────────────────────────

/** Short-lived links to private images, keyed by path. */
export async function imageUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const rows = await run(supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60));
  return Object.fromEntries(rows.filter((r) => r.signedUrl && r.path).map((r) => [r.path as string, r.signedUrl]));
}

/** Refreshes on any change to the campaign's materials that the signed-in user may see. */
export function subscribeMaterials(campaignId: string, onChange: (material: Material | null) => void): () => void {
  const channel = supabase
    .channel(`materials:${campaignId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "materials", filter: `campaign_id=eq.${campaignId}` }, (payload) =>
      onChange((payload.new as Material) ?? null),
    )
    .subscribe();
  return () => void supabase.removeChannel(channel);
}

/** A "Pokaż teraz" that just happened, not one replayed from an old row. */
export const isFreshShow = (m: Material, now = Date.now()) => Boolean(m.shared && m.shown_at && now - Date.parse(m.shown_at) < 2 * 60 * 1000);
