# Knowledge Import Engine

Harry OS Universal AI Knowledge Import Platform.

Trading Journal import is **one parser** in this engine — not the engine itself.

## Architecture

```
Upload → OCR → Classifier → Parser Registry → Parser
      → Validate → Confidence → Structure → Review → Destination → Save
```

## Package layout

```
app/modules/ai/
  import_engine/
    types.py              # ParserType, ReviewField, ClassificationResult
    runner.py             # orchestration (used by imports.pipeline.runner)
    classifier/           # HeuristicDocumentClassifier
    parsers/
      base.py             # KnowledgeParser protocol
      registry.py         # resolve_parser / register
      trading/            # production TradingParser
      book|meeting|…/     # architecture-only stubs
      general/            # Knowledge Inbox fallback
    destinations/         # TradingJournalCommitter + InboxCommitter
  imports/                # HTTP API + AiImportService (stable public surface)
```

## Parser interface

Every parser implements:

- `extract()`
- `validate()`
- `confidence()`
- `transform()`
- `review_fields()`
- `save()`

## Trading UX guarantee

- Routes remain `/api/v1/ai/imports/*` and `/ai/imports`
- Default `parser_type=trading`, `destination_module=trading`
- `JournalDraft` wire format unchanged
- Commit still writes `trading_journal_*`

## Database (additive)

Migration `20260731_0003`:

- `ai_import_jobs.parser_type` (default `trading`)
- `classification_confidence`
- `destination_module` (default `trading`)
- `review_schema_version`

## Applying migration

```bash
cd apps/api
alembic upgrade head
```

## Tests

```bash
pytest -q
pytest tests/unit/test_import_engine.py -v
```
