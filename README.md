# Harry OS

Personal Life Operating System — monorepo skeleton.

## Structure

```text
harry-os/
├── docker-compose.yml
└── apps/
    ├── api/          # FastAPI backend (skeleton)
    └── web/          # React frontend (UI shell)
```

## Quick start

### API

```bash
docker compose up --build
# or
cd apps/api && source .venv/bin/activate && uvicorn app.main:app --reload
```

Swagger: http://localhost:8000/docs

### Web

```bash
cd apps/web
npm install
npm run dev
```

App: http://localhost:5173
