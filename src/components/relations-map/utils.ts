export const newId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function cloneEdges(edges: import("./types").PersistedEdge[]) {
  return JSON.parse(JSON.stringify(edges)) as import("./types").PersistedEdge[];
}
