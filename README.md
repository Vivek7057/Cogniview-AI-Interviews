# Cogniview AI Interviews

A React + Next.js interview platform with role-specific dashboards, AI-generated interviews, resume screening, and stage-based hiring decisions.

## Project Live Link
https://cogniview-ai-interviews.vercel.app/signin

## Overview

This project includes:

- Company and candidate dashboard views
- Sign-in and sign-up pages
- Professional public home page with product overview and auth entry points
- Interview creation with custom stages and pass thresholds
- Aptitude stage support with dedicated aptitude question generation
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

## Run the App

You can run commands from either location.

### Option A: App folder

```bash
cd /home/Downloads/files/cogniview-complete/cogniview-final
npm install
npm run dev
```

### Option B: Workspace root

```bash
cd /home/Downloads/files
npm install
npm run dev
```

Open `http://localhost:3000`.

### Company flow

1. Sign in as company user.
2. Create interview/job with custom stages (`aptitude`, `assessment`, `interview`, or `custom`).
3. Generate questions by role or by uploaded resume.
4. Generate aptitude questions for aptitude stages.
5. Review candidate scores by stage.
6. Send selection/rejection mail from interview detail.

### Candidate flow

1. Sign in as candidate user.
2. Access candidate dashboard.
3. Join interview session.
4. Submit answers and view results.

## Notes

- Current persistence is in-memory and resets on server restart.
- For production, replace `src/lib/store.ts` with a database-backed implementation.
- If builds are unstable on Node 22, switch to Node 20 (project engine target).
