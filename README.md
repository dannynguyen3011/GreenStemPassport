# Green STEM Compass

A Vietnamese STEM admissions platform helping high school students (grades 10–12) plan their university applications to the "Big 6" schools: VinUni, HUST, USTH, VJU, FPT, and Swinburne Vietnam.

🌐 **Live:** https://thegreenpassport-weld.vercel.app

---

## Architecture

```mermaid
flowchart TB
    subgraph Client["🌐 Client (Browser)"]
        UI["Next.js Frontend<br/>React + Tailwind"]
        ZS["Zustand Store<br/>profile · activities · chat"]
        UI <--> ZS
    end

    subgraph Vercel["▲ Vercel — Next.js runtime"]
        APP["App Router pages<br/>(SSR + Static)"]
        API["API Routes<br/>/api/chat · /api/profile · ..."]
        LIB["Server libs<br/>auth.ts · ocs.ts · rag.ts"]
        APP --> API
        API --> LIB
    end

    subgraph Supabase["🗄 Supabase"]
        AUTH["Supabase Auth (JWT)"]
        PG[("PostgreSQL<br/>users · activities<br/>opportunities · trust")]
    end

    subgraph AI["🤖 AI / RAG"]
        CLAUDE["Anthropic Claude<br/>claude-sonnet-4-6"]
        CHROMA[("ChromaDB on Railway<br/>vector embeddings")]
        LC["LangChain<br/>+ OpenAI embeddings"]
    end

    RS["✉️ Resend<br/>teacher verification"]
    INGEST["scripts/ingest-rag.ts<br/>(one-off corpus build)"]

    Client -->|HTTPS| Vercel
    LIB -->|Drizzle ORM| PG
    LIB -->|@supabase/supabase-js| AUTH
    LIB -->|@anthropic-ai/sdk| CLAUDE
    LIB -->|chromadb client| CHROMA
    LIB -.->|RAG retrieval| LC
    LC --> CHROMA
    CLAUDE -.->|retrieved context| CHROMA
    LIB -.->|resend SDK| RS
    INGEST -.->|PDFs → embeddings| CHROMA
```

### Request flow examples

**Chatbot query (RAG):**
1. User asks question in `/chatbot` (React)
2. `POST /api/chat` with Supabase JWT
3. Server: validate JWT → embed query (LangChain + OpenAI) → query Chroma for top-K passages → call Claude with passages + chat history → stream response back
4. Client renders the markdown reply with `react-markdown`

**Save portfolio activity:**
1. User submits form on `/portfolio` (react-hook-form + Zod)
2. `POST /api/activities`
3. Server: validate JWT → Zod schema check → Drizzle `INSERT` to Supabase Postgres
4. Client updates Zustand store (persisted to localStorage)

---

## Tech Stack

### Framework / Core
- **Next.js 16** (App Router) — pages, SSR, API routes
- **React 18** + **TypeScript**

### Database & Auth
- **Supabase** — managed Postgres + Auth (JWT)
- **Drizzle ORM** + **drizzle-kit** — type-safe SQL, migrations
- **postgres** — Postgres driver

### AI / RAG
- **Anthropic Claude** (`@anthropic-ai/sdk`) — chatbot + Compass analysis
- **ChromaDB** (`chromadb`) — vector store (hosted on Railway)
- **LangChain** (`langchain`, `@langchain/openai`) — embeddings + retrieval orchestration
- **pdf-parse** — PDF text extraction during ingest

### UI
- **Tailwind CSS** + `tailwindcss-animate` + `@tailwindcss/typography`
- **@base-ui/react** — headless UI primitives (`components/ui/`)
- **lucide-react** — icons
- **framer-motion** — animations
- **recharts** — dashboard charts
- **react-markdown** — chatbot output rendering
- **@dnd-kit/\*** — drag-and-drop (portfolio reordering)
- **next-themes** — dark/light mode
- **class-variance-authority**, **clsx**, **tailwind-merge** — class composition

### Forms & Validation
- **react-hook-form** + `@hookform/resolvers`
- **Zod** — schema validation (client + server)

### State
- **Zustand** — client-side global state with localStorage persistence

### Email
- **Resend** — teacher verification emails (TrustFactor Tier 2, optional)

### Hosting
- **Vercel** — hosts the Next.js app, auto-deploys from `main`
- **Railway** — hosts ChromaDB Docker container
- **Supabase** — managed Postgres + Auth platform

---

## Project Structure

```
src/
├── app/
│   ├── (app)/               # FRONTEND — authenticated app pages
│   │   ├── dashboard/       # Main dashboard with OCS score & profile summary
│   │   ├── compass/         # Strategic Matching — gap analysis vs Big 6 schools
│   │   ├── portfolio/       # 10-Slot Portfolio Optimizer (STAR format)
│   │   ├── opportunities/   # STEM competitions, scholarships, workshops
│   │   ├── chatbot/         # AI advisor chatbot (RAG-powered)
│   │   ├── mentor/          # Mentor connection page
│   │   ├── profile/         # Profile settings (GPA, SAT, IELTS, school)
│   │   └── layout.tsx       # App layout with Sidebar + AuthDataLoader
│   │
│   ├── (auth)/              # FRONTEND — login & register pages
│   │   ├── login/
│   │   └── register/
│   │
│   ├── demo/                # FRONTEND — public demo (no login required)
│   │
│   ├── api/                 # BACKEND — Next.js API routes
│   │   ├── profile/         # GET/POST/PUT user profile
│   │   ├── activities/      # GET/POST/DELETE portfolio activities
│   │   ├── chat/            # POST — Claude RAG chatbot endpoint
│   │   ├── opportunities/   # GET opportunities list
│   │   ├── mentor/          # GET mentors, POST connection request
│   │   ├── ocs/calculate/   # POST — Overall Competency Score calculation
│   │   ├── compass/analyze/ # POST — school match analysis
│   │   ├── auth/lookup-username/ # GET — resolve username to email for login
│   │   └── admin/           # Admin endpoints (trust verification, opportunities)
│   │
│   └── page.tsx             # FRONTEND — landing page
│
├── components/
│   ├── shared/
│   │   ├── Sidebar.tsx      # FRONTEND — navigation sidebar
│   │   ├── Topbar.tsx       # FRONTEND — top bar with auth dropdown / demo switcher
│   │   ├── AuthDataLoader.tsx # FRONTEND — loads real DB data into Zustand on login
│   │   ├── ThemeToggle.tsx  # FRONTEND — dark/light mode toggle
│   │   └── TrustBadge.tsx   # FRONTEND — trust tier badge component
│   └── ui/                  # FRONTEND — @base-ui/react primitives
│
├── db/
│   ├── schema.ts            # BACKEND — Drizzle ORM table definitions
│   └── index.ts             # BACKEND — database client
│
├── lib/
│   ├── auth.ts              # BACKEND — Supabase Auth helpers for API routes
│   ├── ocs.ts               # BACKEND/FRONTEND — Overall Competency Score logic
│   ├── matching.ts          # BACKEND/FRONTEND — school matching & unrealistic goal detection
│   ├── rag.ts               # AI RAG — document retrieval from Chroma
│   ├── nlp-tagger.ts        # AI — auto-tags activities with tech keywords
│   ├── constants.ts         # FRONTEND — Big 6 school data, category labels/colors
│   ├── demoUsers.ts         # FRONTEND — seed data for demo mode
│   ├── supabase-browser.ts  # FRONTEND — Supabase client for browser
│   └── utils.ts             # Shared utilities
│
├── store/
│   └── useProfileStore.ts   # FRONTEND — Zustand store (profile + activities state)
│
└── types/
    └── index.ts             # Shared TypeScript types
```

---

## Frontend

All pages under `src/app/(app)/`, `src/app/(auth)/`, `src/app/demo/`, and `src/app/page.tsx`.

Responsibilities:
- Renders the UI with Tailwind CSS (dark/light mode via `next-themes`)
- Manages client state via Zustand (`useProfileStore`)
- Handles auth session via Supabase browser client
- Demo mode: uses hardcoded seed data from `demoUsers.ts`, no login required

---

## Backend

All routes under `src/app/api/` plus `src/db/` and `src/lib/auth.ts`.

Responsibilities:
- REST API endpoints for profile, activities, opportunities, mentors
- Authentication via Supabase JWT (Bearer token on every request)
- Database access via Drizzle ORM → Supabase PostgreSQL
- OCS score calculation and school match logic
- Admin endpoints for trust verification and opportunity management

---

## AI / RAG

Files: `src/lib/rag.ts`, `src/lib/nlp-tagger.ts`, `src/app/api/chat/route.ts`, `scripts/ingest-rag.ts`

- **`rag.ts`** — connects to Chroma, retrieves relevant chunks for a query (university admission docs, scholarship info)
- **`nlp-tagger.ts`** — keyword-tags portfolio activities with tech/skill labels
- **`api/chat/route.ts`** — orchestrates the RAG pipeline:
  1. Take user message + profile context
  2. Retrieve top-K chunks from Chroma
  3. Build a prompt with context + chat history
  4. Call Claude (`claude-sonnet-4-6`) via the Anthropic SDK
  5. Stream response with cited sources
- **`scripts/ingest-rag.ts`** — one-off: reads PDFs from `corpus/`, chunks them, embeds, uploads to Chroma

To use the chatbot in production, ChromaDB must be deployed (Railway in this project) and `CHROMA_URL` set in environment variables. The corpus is populated by running `npm run rag:ingest` locally after placing the source PDFs in `corpus/`.

---

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

For the RAG chatbot, after setting `CHROMA_URL`:

```bash
# Place admission PDFs in ./corpus/, then:
npm run rag:ingest
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `DATABASE_URL` | PostgreSQL connection string (Supabase pooler, port 6543) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `CHROMA_URL` | ChromaDB URL (Railway public domain) |
| `NEXT_PUBLIC_APP_URL` | Deployed app URL |
| `RAG_DATA_FRESHNESS_DATE` | Date shown in chatbot "data current as of" disclaimer |
| `ADMIN_USER_IDS` | Comma-separated Supabase user UUIDs with admin access |
| `RESEND_API_KEY` | Resend API key (optional — for teacher verification email) |
| `RESEND_FROM_EMAIL` | Sender address for Resend |

---

## Deployment

Deployed on **Vercel** (Next.js app) and **Railway** (ChromaDB).

- **Vercel** — every push to `main` triggers an automatic redeployment
- **Railway** — `chromadb/chroma` Docker image, port `8000`, persistent volume mounted at `/chroma/chroma`, env vars `IS_PERSISTENT=TRUE` and `ANONYMIZED_TELEMETRY=FALSE`

After deploying, update your Supabase project:
- **Authentication → URL Configuration → Site URL:** your Vercel URL
- **Authentication → URL Configuration → Redirect URLs:** `https://your-app.vercel.app/**`
