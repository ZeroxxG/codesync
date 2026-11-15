export const API_BASE = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/+$/, "")
  : "";

/**
 * Resolves an API path against VITE_API_URL if configured,
 * or keeps it relative to let Vercel rewrites / Vite proxy handle it.
 */
export function resolveApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (!API_BASE) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}
