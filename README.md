# TalentOS — AI-First Recruitment Platform

> Autonomous AI recruiter + ATS. 2 HR people handle 500+ candidates across 30 vacancies simultaneously.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          TalentOS                               │
├──────────────┬──────────────────┬───────────────────────────────┤
│   Frontend   │     Backend      │         AI Layer              │
│  Next.js 15  │  FastAPI + PG    │  OpenRouter (Claude/GPT-4o)   │
│  TypeScript  │  pgvector        │  Embeddings + Structured Out  │
│  Zustand     │  Redis + Celery  │  Async + Retry + Fallback     │
│  Recharts    │  WebSockets      │                               │
└──────────────┴──────────────────┴───────────────────────────────┘
```

## Quick Start

### 1. Clone & Configure

```bash
git clone https://github.com/your-org/talentos.git
cd talentos
cp .env.example .env
```

Edit `.env` — set your `OPENROUTER_API_KEY`:
```
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx
```

Get a key at: https://openrouter.ai/keys

### 2. Launch with Docker Compose

```bash
docker compose up --build
```

Services:
| Service       | URL                          |
|---------------|------------------------------|
| Frontend      | http://localhost:3000        |
| Backend API   | http://localhost:8000/docs   |
| Flower        | http://localhost:5555        |
| PostgreSQL    | localhost:5432               |

### 3. Seed Demo Data

```bash
docker compose exec backend python scripts/seed.py
```

Login: `demo@talentos.ai` / `demo1234`

---

## Project Structure

```
talentos/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # FastAPI routers
│   │   │   ├── auth.py         # JWT login/register
│   │   │   ├── vacancies.py    # Vacancy CRUD
│   │   │   ├── candidates.py   # Candidate pipeline
│   │   │   ├── resumes.py      # File upload + parsing
│   │   │   ├── screening.py    # AI chat sessions
│   │   │   ├── analytics.py    # Funnel metrics
│   │   │   ├── onboarding.py   # Onboarding + IDP
│   │   │   └── ws.py           # WebSocket handler
│   │   ├── core/
│   │   │   ├── config.py       # Settings (pydantic-settings)
│   │   │   └── security.py     # JWT + bcrypt
│   │   ├── db/
│   │   │   └── session.py      # AsyncSQLAlchemy + pgvector init
│   │   ├── models/
│   │   │   └── models.py       # All SQLAlchemy models
│   │   ├── services/ai/
│   │   │   ├── openrouter.py   # AI abstraction layer
│   │   │   ├── resume_parser.py # PDF/DOCX → structured JSON
│   │   │   ├── scoring.py      # Semantic + AI scoring engine
│   │   │   └── screening.py    # Chatbot + Onboarding + IDP
│   │   ├── workers/
│   │   │   ├── celery_app.py   # Celery + beat config
│   │   │   └── tasks.py        # Async background tasks
│   │   └── main.py             # FastAPI app + routers
│   ├── alembic/                # DB migrations
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── app/                # Next.js 15 App Router
│       │   ├── dashboard/      # Main dashboard + charts
│       │   ├── vacancies/      # Job listing cards
│       │   ├── candidates/     # Candidate table + filters
│       │   ├── pipeline/       # Kanban board
│       │   ├── screening/      # AI chat interface
│       │   ├── analytics/      # Funnel + metrics
│       │   ├── onboarding/     # Checklist + goals
│       │   └── idp/            # Dev plans + roadmap
│       ├── components/
│       │   └── layout/AppShell.tsx  # Sidebar + topbar
│       ├── lib/api.ts          # Axios API client
│       └── store/auth.ts       # Zustand auth store
│
├── infrastructure/
│   ├── nginx/nginx.conf        # Reverse proxy + WS
│   └── postgres/init.sql       # pgvector extension
│
├── scripts/seed.py             # Demo data seeder
├── docker-compose.yml
└── .env.example
```

---

## Core AI Flows

### Resume Parsing
```
Upload PDF/DOCX → Celery task → extract text → 
OpenRouter (Claude) → ParsedResume JSON → 
generate embedding → store in pgvector
```

### Candidate Scoring
```
Resume embedding + Vacancy embedding → 
cosine similarity (pgvector) + 
AI structured analysis (Claude) →
ScoreBreakdown { score, strengths, risks, missing_skills }
```

### AI Screening Chat
```
WebSocket connection → 
AI system prompt (vacancy + candidate context) →
multi-turn conversation →
generate ScreeningSummary + update score
```

### Auto-Pipeline
```
Celery beat (every 5min) →
find unscored candidates →
score all → 
auto-reject below threshold →
send rejection email (Celery task)
```

---

## API Endpoints

```
POST   /api/v1/auth/register          Register company + admin
POST   /api/v1/auth/login             Get JWT tokens
GET    /api/v1/auth/me                Current user

GET    /api/v1/vacancies/             List vacancies
POST   /api/v1/vacancies/             Create vacancy
PATCH  /api/v1/vacancies/{id}         Update vacancy

GET    /api/v1/candidates/            List candidates (filterable)
POST   /api/v1/candidates/            Create candidate
PATCH  /api/v1/candidates/{id}/stage  Move pipeline stage

POST   /api/v1/resumes/upload         Upload PDF/DOCX
GET    /api/v1/resumes/{id}/status    Parsing status

POST   /api/v1/screening/start        Create screening session
GET    /api/v1/screening/{id}         Get session + transcript
POST   /api/v1/screening/{id}/questions  Generate interview questions

GET    /api/v1/analytics/overview     Summary metrics
GET    /api/v1/analytics/funnel       Stage conversion data

POST   /api/v1/onboarding/generate    Generate onboarding plan
POST   /api/v1/onboarding/idp/generate Generate IDP

WS     /ws/screening/{session_id}?token=JWT  Real-time chat
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | Required. Get at openrouter.ai |
| `OPENROUTER_DEFAULT_MODEL` | Default: `anthropic/claude-3.5-sonnet` |
| `DATABASE_URL` | PostgreSQL async URL |
| `REDIS_URL` | Redis connection URL |
| `JWT_SECRET_KEY` | Change in production! |
| `SECRET_KEY` | App secret key |

---

## Development

### Backend only
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend only
```bash
cd frontend
npm install
npm run dev
```

### Run migrations
```bash
cd backend
alembic upgrade head
```

### Generate new migration
```bash
alembic revision --autogenerate -m "description"
```

---

## Production Deployment

1. Set strong secrets in `.env`
2. Enable SSL in nginx.conf
3. Set `APP_ENV=production` and `DEBUG=false`
4. Use managed PostgreSQL (RDS, Supabase, Neon)
5. Use managed Redis (ElastiCache, Upstash)
6. Scale Celery workers horizontally
7. Set `OPENROUTER_API_KEY` with rate limits

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind, Framer Motion |
| State | Zustand + React Query |
| Backend | FastAPI, SQLAlchemy (async), Pydantic v2 |
| Database | PostgreSQL 16 + pgvector |
| Cache/Queue | Redis + Celery + Flower |
| AI | OpenRouter (Claude 3.5, GPT-4o, Gemini) |
| Auth | JWT (python-jose) + bcrypt |
| Container | Docker + Docker Compose + Nginx |

---

Built with ❤️ — TalentOS MVP v1.0
