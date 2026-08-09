/** API prefix. Locally Vite proxies `/api` → :8000. On Vercel set `VITE_API_BASE`. */
export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") || "/api/v1"
