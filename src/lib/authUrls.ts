
export function getRouterBasename(): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export function getAppUrl(path = ""): string {
  const base = import.meta.env.BASE_URL;
  const baseWithSlash = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = path.replace(/^\//, "");
  return `${window.location.origin}${baseWithSlash}${normalizedPath}`;
}

export function isAuthPath(pathname: string): boolean {
  return pathname.endsWith("/auth") || pathname.endsWith("/reset-password");
}

export function isRecoveryAuthCallback(): boolean {
  const { hash, search } = window.location;
  return hash.includes("type=recovery") || search.includes("type=recovery");
}
