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
├── app/                          # Next.js App Router
│   ├── (app)/                    # FRONTEND — authenticated pages
│   │   ├── dashboard/            # Main dashboard with OCS score & profile summary
│   │   ├── compass/              # Strategic Matching — gap analysis vs Big 6 schools
│   │   ├── portfolio/            # 10-Slot Portfolio Optimizer (STAR format)
│   │   ├── opportunities/        # STEM competitions, scholarships, workshops
│   │   ├── chatbot/              # AI advisor chatbot (RAG-powered)
│   │   ├── mentor/               # Mentor connection page
│   │   ├── profile/              # Profile settings (GPA, SAT, IELTS, school)
│   │   └── layout.tsx            # App layout with AppShell + AuthDataLoader
│   │
│   ├── (auth)/                   # FRONTEND — login & register pages
│   │   ├── login/
│   │   └── register/
│   │
│   ├── demo/                     # FRONTEND — public demo (no login required)
│   │
│   ├── api/                      # BACKEND — Next.js API routes
│   │   ├── profile/              # GET/POST/PUT user profile
│   │   ├── activities/           # GET/POST/DELETE portfolio activities
│   │   ├── chat/                 # POST — Claude RAG chatbot endpoint
│   │   ├── opportunities/        # GET opportunities list
│   │   ├── mentor/               # GET mentors, POST connection request
│   │   ├── ocs/calculate/        # POST — Overall Competency Score calculation
│   │   ├── compass/analyze/      # POST — school match analysis
│   │   ├── auth/lookup-username/ # GET — resolve username to email for login
│   │   └── admin/                # Admin endpoints (trust verification, opportunities)
│   │
│   └── page.tsx                  # FRONTEND — landing page
│
├── backend/                      # BACKEND — server-only code
│   ├── auth.ts                   # Supabase JWT auth helpers for API routes
│   ├── rag.ts                    # RAG pipeline (Chroma + Claude)
│   ├── nlp-tagger.ts             # NLP auto-tagger for activity tech tags
│   └── db/
│       ├── index.ts              # Drizzle ORM client
│       └── schema.ts             # Database table definitions
│
├── shared/                       # SHARED — used by both frontend & backend
│   ├── ocs.ts                    # Overall Competency Score calculation
│   ├── matching.ts               # School matching & gap analysis logic
│   ├── constants.ts              # Big 6 school data, category labels/colors
│   ├── demoUsers.ts              # Seed data for demo mode
│   ├── supabase-browser.ts       # Supabase client for browser
│   └── utils.ts                  # Shared utilities (cn, etc.)
│
├── components/                   # FRONTEND — UI components
│   ├── shared/
│   │   ├── AppShell.tsx          # Collapsible sidebar + layout wrapper
│   │   ├── Topbar.tsx            # Top bar with auth dropdown / demo switcher
│   │   ├── AuthDataLoader.tsx    # Loads real DB data into Zustand on login
│   │   ├── ThemeProvider.tsx     # next-themes dark/light mode provider
│   │   ├── ThemeToggle.tsx       # Dark/light mode toggle button
│   │   └── TrustBadge.tsx        # Trust tier badge component
│   └── ui/                       # shadcn/ui base components
│
├── store/                        # FRONTEND — Zustand state management
│   └── useProfileStore.ts        # Profile + activities store (localStorage persistence)
│
└── types/                        # SHARED — TypeScript type definitions
    └── index.ts
```

---

## Frontend

Pages: `src/app/(app)/`, `src/app/(auth)/`, `src/app/demo/`, `src/app/page.tsx`

Components: `src/components/` — UI built with Tailwind CSS, dark/light mode support via `next-themes`.

State: `src/store/useProfileStore.ts` — Zustand store persisted to localStorage. `AuthDataLoader` syncs real DB data into the store on login.

Demo mode: uses hardcoded seed data from `src/shared/demoUsers.ts`, no login required.

---

## Backend

API routes: `src/app/api/` — REST endpoints for profile, activities, opportunities, mentors, OCS, and compass analysis.

Server code: `src/backend/` — database access (Drizzle ORM → Supabase PostgreSQL), Supabase JWT auth helpers, RAG pipeline, and NLP tagger.

Authentication: every API route validates a Supabase Bearer token via `src/backend/auth.ts`.

---

## AI / RAG Model

Files: `src/backend/rag.ts`, `src/backend/nlp-tagger.ts`, `src/app/api/chat/route.ts`

**Pipeline (per user message):**
1. Retrieve relevant document chunks from Chroma vector store (`rag.ts`)
2. Build a prompt with retrieved context + chat history
3. Call Claude (`claude-sonnet-4-6`) via Anthropic API
4. Stream response back with cited sources

**NLP tagger** (`nlp-tagger.ts`): keyword-matches activity STAR fields against a curated tech dictionary to auto-assign tags and compute a base quality score (1–5).

> Chatbot requires a running Chroma instance. Set `CHROMA_URL` in environment variables. Without it, the chatbot falls back to a "no information found" message.

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
