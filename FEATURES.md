# Lift Log — Personal Fitness AI (v1)

Mobile-first app for tracking and analyzing strength gains on compound lifts,
with AI coaching powered by the Anthropic Claude API.

## Running it

```bash
# Backend (from backend/) — http://localhost:8000
uv sync && uv run python -m app.main

# Frontend (from frontend/) — http://localhost:5173, proxies /api to the backend
npm install && npm run dev
```

Copy `.env.example` to `.env` at the repo root and set a real `ANTHROPIC_API_KEY`
(everything except the three `/api/ai/*` endpoints works without one). The
database is a local SQLite file (`backend/app.db`), created and seeded on first
startup — no account, no cloud.

Tests: `uv run pytest` from `backend/` (56 tests; AI tests run against
pydantic-ai's `TestModel`, no API key needed). Frontend: `npm run lint && npm run build`.

## Features

### Workout logging
- Log sets with weight, reps, optional RPE (1–10), warm-up flag, and notes.
- 11 seeded compound lifts (Squat, Bench, Deadlift, OHP, Barbell Row, RDL,
  Front Squat, Incline Bench, Close-Grip Bench, Sumo Deadlift, Power Clean)
  plus custom exercises with a compound/accessory flag.
- Fast logging: exercise defaults to last used, weight/reps pre-filled from the
  previous top working set, steppers move by the lift's configured increment
  (5 lb upper / 10 lb lower by default, editable per lift). Repeating a set is
  one tap.
- Edit and delete sets and whole sessions after the fact.

### Progress tracking
- **e1RM** computed on every set under both Epley (`w·(1+r/30)`) and Brzycki
  (`w·36/(37−r)`); the display formula is a setting and switching it
  recomputes the PR timeline.
- **Tonnage** (Σ weight × reps over working sets) bucketed by ISO week or month.
- **PR timeline** per lift for both top weight and e1RM — rebuilt from scratch
  on any edit, delete, or backdated session, so it's always consistent.
- **Strength curves**: best-working-set e1RM per session, charted over time.
- **Lift comparison**: two lifts' e1RM curves on one chart.
- **History**: searchable (notes) and filterable (lift, date range) session log.

### AI features (Anthropic Claude via pydantic-ai)
All numbers are computed deterministically in Python; the model only writes
narrative around them and is instructed never to invent values. Every AI string
in the UI carries a "✨ AI-generated" badge.

- **Post-session insight** (`/api/ai/insight/{session_id}`): headline,
  observations, and encouragement from per-lift metrics — best e1RM vs the
  trailing 4-week average, % change, plateau flags, PRs hit.
- **Next-session recommendations** (`/api/ai/recommendations`): a deterministic
  progressive-overload engine prescribes per-lift targets — `+increment` after
  a completed session, **hold** on plateau (<2% e1RM gain over 3+ weeks),
  **deload to 90%** after two consecutive declining sessions — and the model
  writes a short rationale per lift.
- **Weekly digest** (`/api/ai/digest`): summary of the week's tonnage and e1RM
  trends across lifts with one focus for next week.
- **PR predictions** (`/api/analytics/predictions`, no LLM): least-squares fit
  of the last 8 weeks of e1RM data projects the date you'll reach the next
  round-number milestone (135/185/225/275/315/365/405/…), with a 95% CI band
  from the residual standard error. Updates automatically as data lands.

### AI caching
Every AI output is cached in SQLite keyed by
`sha256(kind : model : canonical-JSON of the input metrics)` — identical data
never triggers a second API call; any edit to the underlying sets changes the
fingerprint and regenerates. `?refresh=true` forces regeneration. Responses
report `{ai_generated, cached, model}`.

## Decisions log

| Decision | Rationale |
|---|---|
| `Base.metadata.create_all()` on startup, no Alembic | Local single-user SQLite v1; adopt `/add-migration` when moving to Postgres |
| Weights stored in lbs; kg is display-only conversion | One source of truth, no migration when the unit toggles |
| Both e1RM formulas stored per set | Formula switch needs zero recompute of sets |
| PR timeline fully rebuilt per exercise on any change | Trivially cheap at personal scale and provably correct |
| Predictions are pure math (no LLM) | A regression projection — instant, free, deterministic |
| No SSE streaming in v1 | AI payloads are short and usually cache hits; UI shows skeletons |
| Default model `claude-opus-4-8` | Current recommended default; override with `ANTHROPIC_MODEL` |
| Dark-only UI | Gym environments; "dark mode by default" taken literally for v1 |

## Out of scope (v1)
iOS app, auth/accounts, cloud sync, cardio, nutrition, social features.
