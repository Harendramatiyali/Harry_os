# Harry OS Web

React frontend shell for Harry OS.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- shadcn/ui (Radix primitives)
- React Router
- TanStack Query
- Zustand (UI chrome only)

## Run

```bash
cd apps/web
npm install
npm run dev
```

Open http://localhost:5173

API proxy: `/api` → `http://127.0.0.1:8000`

## Layout

- Dark theme by default (`class="dark"` on `<html>`)
- Dashboard layout: Sidebar + Header + Footer
- Global search (`⌘K` / `Ctrl+K`)
- Responsive mobile drawer sidebar

## Note

Reusable UI and navigation shell only. No domain business logic or API modules yet.
