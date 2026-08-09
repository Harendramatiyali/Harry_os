# Harry OS API

FastAPI backend skeleton for Harry OS. Domain modules are stubbed and not implemented yet.

## Stack

- FastAPI + Uvicorn
- SQLAlchemy 2 (async) + Alembic
- Pydantic Settings
- JWT helpers (python-jose) + passlib
- Repository base class
- Docker Compose (API + MySQL)

## Layout

```text
apps/api/
  app/
    main.py              # App factory, CORS, Swagger
    api/                 # Versioned HTTP routers
    core/                # Config, logging, security, errors, middleware, DI
    db/                  # Engine, session, Base, BaseRepository
    modules/             # Domain packages (empty stubs)
    workers/             # Future background jobs
  alembic/               # Migrations
  Dockerfile
  requirements.txt
  .env.example
```

## Local run (without Docker)

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # if needed
uvicorn app.main:app --reload --port 8000
```

- Swagger UI: http://localhost:8000/docs
- Health: http://localhost:8000/api/v1/health

## Docker

From repo root (`harry-os/`):

```bash
docker compose up --build
```

API: http://localhost:8000/docs

## Alembic

```bash
cd apps/api
alembic revision --autogenerate -m "init"
alembic upgrade head
```

Models must be imported in `alembic/env.py` before autogenerate will see them.
