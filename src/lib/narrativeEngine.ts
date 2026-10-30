export const NARRATIVE_STATE_KEY = "rpg_narrative_state";
export const NARRATIVE_STRUCTURE_KEY = "rpg_narrative_structure";

export type Branch = { id: string; label: string; targetSceneId: string; /** Taking this branch records a decision with this tag. */ tag?: string };
export type Scene = {
  id: string;
  actId: string;
  name: string;
  description: string;
  /** Scene is only available once a decision with this tag was made. */
  requiresTag?: string;
  branches: Branch[];
};
export type Act = { id: string; name: string };
/** Once `tag` is decided, `replaceSceneId` is played as `withSceneId`. */
export type Consequence = { id: string; tag: string; replaceSceneId: string; withSceneId: string };
export type NarrativeStructure = { acts: Act[]; scenes: Scene[]; consequences: Consequence[] };

export type Decision = { id: string; tag: string; at: number; sessionId: string };
export type PathStep = { id: string; sceneId: string; /** Label of the branch that led here. */ viaLabel?: string; at: number; sessionId: string };
export type NarrativeState = { activeSceneId: string | null; path: PathStep[]; decisions: Decision[] };

export const EMPTY_STRUCTURE: NarrativeStructure = { acts: [], scenes: [], consequences: [] };
export const EMPTY_STATE: NarrativeState = { activeSceneId: null, path: [], decisions: [] };

export const newId = () => crypto.randomUUID();

export const hasTag = (state: NarrativeState, tag?: string) => !tag || state.decisions.some((d) => d.tag === tag);

/** Follows consequences (guarded against cycles) to the scene that is actually played. */
export function resolveSceneId(s: NarrativeStructure, state: NarrativeState, sceneId: string): string {
  const seen = new Set<string>();
  let id = sceneId;
  while (!seen.has(id)) {
    seen.add(id);
    const c = s.consequences.find((c) => c.replaceSceneId === id && hasTag(state, c.tag) && s.scenes.some((x) => x.id === c.withSceneId));
    if (!c) break;
    id = c.withSceneId;
  }
  return id;
}

export function enterScene(
  s: NarrativeStructure,
  state: NarrativeState,
  sceneId: string,
  sessionId: string,
  viaLabel?: string,
  at = Date.now(),
): NarrativeState {
  const id = resolveSceneId(s, state, sceneId);
  return { ...state, activeSceneId: id, path: [...state.path, { id: newId(), sceneId: id, viaLabel, at, sessionId }] };
}

export function addDecision(state: NarrativeState, tag: string, sessionId: string, at = Date.now()): NarrativeState {
  const t = tag.trim();
  if (!t || hasTag(state, t)) return state;
  return { ...state, decisions: [...state.decisions, { id: newId(), tag: t, at, sessionId }] };
}

/** Records the decision (if tagged) before resolving the target, so consequences apply at once. */
export function takeBranch(s: NarrativeStructure, state: NarrativeState, branch: Branch, sessionId: string): NarrativeState {
  const withDecision = branch.tag ? addDecision(state, branch.tag, sessionId) : state;
  return enterScene(s, withDecision, branch.targetSceneId, sessionId, branch.label);
}

/** Removing a scene also removes branches and consequences that point at it. */
export function removeScene(s: NarrativeStructure, sceneId: string): NarrativeStructure {
  return {
    ...s,
    scenes: s.scenes.filter((x) => x.id !== sceneId).map((x) => ({ ...x, branches: x.branches.filter((b) => b.targetSceneId !== sceneId) })),
    consequences: s.consequences.filter((c) => c.replaceSceneId !== sceneId && c.withSceneId !== sceneId),
  };
}

export function removeAct(s: NarrativeStructure, actId: string): NarrativeStructure {
  return s.scenes.filter((x) => x.actId === actId).reduce((acc, sc) => removeScene(acc, sc.id), { ...s, acts: s.acts.filter((a) => a.id !== actId) });
}

/** Tags that consequences are waiting for but nobody has decided yet. */
export const pendingTags = (s: NarrativeStructure, state: NarrativeState) =>
  [...new Set(s.consequences.map((c) => c.tag))].filter((t) => t && !hasTag(state, t));

/** Narrative lines for one session: scenes visited (with the branch taken) and decisions made. */
export function narrativeRecapLines(s: NarrativeStructure, state: NarrativeState, sessionId: string): { scenes: string[]; decisions: string[] } {
  const name = (id: string) => s.scenes.find((x) => x.id === id)?.name ?? "(usunięta scena)";
  return {
    scenes: state.path
      .filter((p) => p.sessionId === sessionId)
      .map((p) => (p.viaLabel ? `„${p.viaLabel}” → ${name(p.sceneId)}` : name(p.sceneId))),
    decisions: state.decisions.filter((d) => d.sessionId === sessionId).map((d) => d.tag),
  };
}
