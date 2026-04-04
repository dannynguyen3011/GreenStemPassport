# Green STEM Compass

A Vietnamese STEM admissions platform helping high school students (grades 10–12) plan their university applications to the "Big 6" schools: VinUni, HUST, USTH, VJU, FPT, and Swinburne Vietnam.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL) + Drizzle ORM
- **Auth:** Supabase Auth
- **AI:** Anthropic Claude (RAG chatbot)
- **Vector Store:** Chroma (for RAG document retrieval)
- **Styling:** Tailwind CSS
- **State:** Zustand (with localStorage persistence)
- **Deployment:** Vercel

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
│   └── ui/                  # FRONTEND — shadcn/ui base components
│
├── db/
│   ├── schema.ts            # BACKEND — Drizzle ORM table definitions
│   └── index.ts             # BACKEND — database client
│
├── lib/
│   ├── auth.ts              # BACKEND — Supabase Auth helpers for API routes
│   ├── ocs.ts               # BACKEND/FRONTEND — Overall Competency Score logic
│   ├── matching.ts          # BACKEND/FRONTEND — school matching & unrealistic goal detection
│   ├── rag.ts               # AI RAG — document retrieval from Chroma vector store
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

Key responsibilities:
- Renders the UI with Tailwind CSS (dark/light mode)
- Manages client state via Zustand (`useProfileStore`)
- Handles auth session via Supabase browser client
- Demo mode: uses hardcoded seed data from `demoUsers.ts`, no login required

---

## Backend

All routes under `src/app/api/` plus `src/db/` and `src/lib/auth.ts`.

Key responsibilities:
- REST API endpoints for profile, activities, opportunities, mentors
- Authentication via Supabase JWT (Bearer token on every request)
- Database access via Drizzle ORM → Supabase PostgreSQL
- OCS score calculation and school match logic
- Admin endpoints for trust verification and opportunity management

---

## AI / RAG Model

Files: `src/lib/rag.ts`, `src/lib/nlp-tagger.ts`, `src/app/api/chat/route.ts`

Key responsibilities:
- **`rag.ts`** — connects to Chroma vector store, retrieves relevant document chunks based on user query (university admission documents, scholarship info, etc.)
- **`nlp-tagger.ts`** — automatically tags portfolio activities with tech/skill keywords using keyword matching
- **`api/chat/route.ts`** — orchestrates the full RAG pipeline:
  1. Takes user message + profile context
  2. Retrieves relevant chunks from Chroma
  3. Builds a prompt with context + chat history
  4. Calls Claude (`claude-sonnet-4-6`) via Anthropic API
  5. Returns response with cited sources

To use the chatbot in production, a Chroma instance must be deployed and `CHROMA_URL` set in environment variables.

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

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `DATABASE_URL` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `CHROMA_URL` | Chroma vector store URL (for RAG chatbot) |
| `NEXT_PUBLIC_APP_URL` | Your deployed app URL |
| `ADMIN_USER_IDS` | Comma-separated UUIDs with admin access |

---

## Deployment

Deployed on Vercel. Every push to `main` triggers an automatic redeployment.

After deploying, update your Supabase project:
- **Authentication → URL Configuration → Site URL:** your Vercel URL
- **Authentication → URL Configuration → Redirect URLs:** `https://your-app.vercel.app/**`
