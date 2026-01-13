const BASE =
  (import.meta as any).env?.VITE_API_BASE_URL?.toString()?.replace(/\/+$/, "") ||
  "http://127.0.0.1:8000";

export function apiUrl(path: string) {
  if (!path.startsWith("/")) path = "/" + path;
  return BASE + path;
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), {
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
    }
  return (await res.json()) as T;
}
