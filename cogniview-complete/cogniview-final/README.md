# Cogniview AI Interviews

A React + Next.js interview platform with role-specific dashboards, AI-generated interviews, resume screening, and stage-based hiring decisions.

## Overview

This project includes:

- Company and candidate dashboard views
- Sign-in and sign-up pages
- Interview creation with custom stages and pass thresholds
- Resume upload (PDF), AI screening, and resume-based question generation
- Role-based question generation (separate from resume flow)
- Session answering, AI evaluation, and analytics
- Selection/rejection mail logging APIs

## Tech Stack

- React 18
- Next.js 16 (App Router)
- TypeScript
- Groq via OpenAI-compatible SDK (`openai` package)
- `pdf-parse` for resume text extraction
- In-memory store (`src/lib/store.ts`)

## Requirements

- Node.js `>=20 <22` (recommended: Node 20 LTS)
- npm

## Environment Variables

Create `.env.local` from `.env.example` and set:

```env
GROQ_API_KEY=your_key_here
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=llama-3.3-70b-versatile
```

## Run the App

You can run commands from either location.

### Option A: App folder

```bash
cd /home/vinjai/Downloads/files/cogniview-complete/cogniview-final
npm install
npm run dev
```

### Option B: Workspace root

```bash
cd /home/vinjai/Downloads/files
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

Inside `cogniview-final/package.json`:

- `npm run dev` - start development server (webpack mode)
- `npm run build` - production build
- `npm run start` - start production server
- `npm run lint` - TypeScript check (`tsc --noEmit`)

## Key API Routes

- `POST /api/interviews/[id]/generate-questions` - role-based question generation
- `POST /api/interviews/[id]/resume` - upload and parse resume PDF
- `POST /api/interviews/[id]/screen-resume` - AI screening (score, strengths, missing skills)
- `POST /api/interviews/[id]/generate-questions-resume` - resume-based question generation
- `POST /api/resume-quick` - dashboard quick resume flow
- `GET /api/interviews/[id]/mail` - fetch decision mail history
- `POST /api/interviews/[id]/mail` - create/send selection or rejection mail record

## Product Flows

### Company flow

1. Sign in as company user.
2. Create interview/job with custom stages.
3. Generate questions by role or by uploaded resume.
4. Review candidate scores by stage.
5. Send selection/rejection mail from interview detail.

### Candidate flow

1. Sign in as candidate user.
2. Access candidate dashboard.
3. Join interview session.
4. Submit answers and view results.

## Notes

- Current persistence is in-memory and resets on server restart.
- For production, replace `src/lib/store.ts` with a database-backed implementation.
- If builds are unstable on Node 22, switch to Node 20 (project engine target).

## Project Structure

```text
src/
  app/
    company/dashboard/
    candidate/dashboard/
    interviews/
    analytics/
    api/
  components/
    layout/
  lib/
  types/
```
