# AI Import Center — Test Suite

Production-ready coverage for the notebook import flow.

## Layout

```
tests/
  conftest.py              # fixtures, FakeAiImportService, api client
  helpers.py               # PNG fixture, draft factories
  unit/                    # validate, confidence, OCR, understand, parse,
                           # preprocess/structure/review, commit helpers,
                           # image upload service, review contracts
  integration/             # full run_pipeline (sidecar OCR → review queue)
  api/                     # FastAPI route contracts (no DB)
  regression/              # locks known past failures
```

## Run

```bash
cd apps/api
pip install -e ".[dev]"
pytest -v
pytest tests/unit -q
pytest tests/api -q
pytest tests/integration -q
pytest tests/regression -q
pytest -k ocr
```

## Frontend mappers

```bash
cd apps/web
npm install
npm test
```

## Scope

| Suite | Covers |
|-------|--------|
| Unit | Validation, confidence, OCR helpers, understanding, parse, structure, review queue, commit markdown/tags |
| Image upload | Service upload/delete rules, mime/size gates, media write |
| Integration | End-to-end pipeline stages with sidecar transcripts |
| API | Create → upload → status → preview → commit (+ 409/422/404) |
| Review | Queue payload, draft round-trip, approve gate |
| Regression | Notebook date vs filename, OCR scaffold strip, empty OCR draft |
