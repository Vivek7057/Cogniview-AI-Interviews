import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { store } from "@/lib/store";

function normalizeStages(stages: any[] | undefined) {
  const base = Array.isArray(stages) && stages.length
    ? stages
    : [{ id: "stage-1", name: "Technical Screening", passingScore: 6.5, order: 1 }];

  return base
    .map((s, i) => ({
      id: typeof s?.id === "string" && s.id.trim() ? s.id : `stage-${i + 1}`,
      name: typeof s?.name === "string" && s.name.trim() ? s.name.trim() : `Stage ${i + 1}`,
      passingScore: Number.isFinite(Number(s?.passingScore))
        ? Math.max(0, Math.min(10, Number(s.passingScore)))
        : 6.5,
      order: i + 1,
    }));
}

export async function GET() {
  const interviews = [...store.interviews]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(({ resumeText, ...rest }) => rest);

  return NextResponse.json(interviews);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    title,
    jobRole,
    candidateName,
    candidateEmail,
    jobDescription,
    level,
    techStack,
    numQuestions,
    stages,
  } = body;
  if (!title?.trim() || !jobRole?.trim())
    return NextResponse.json({ error: "Title and job role are required" }, { status: 400 });

  const normalizedStages = normalizeStages(stages);

  const interview = {
    id: uuid(),
    title: title.trim(),
    jobRole: jobRole.trim(),
    candidateName: candidateName?.trim() || undefined,
    candidateEmail: candidateEmail?.trim() || undefined,
    jobDescription: jobDescription?.trim() || "",
    level: level || "Mid-level",
    techStack: techStack || [],
    numQuestions: numQuestions || 5,
    stages: normalizedStages,
    activeStageIndex: 0,
    candidateStatus: "in_progress" as const,
    stageResults: [],
    decisionMails: [],
    questions: [],
    status: "draft" as const,
    questionSource: "role" as const,
    screening: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedSessions: 0,
  };
  store.interviews.push(interview);
  return NextResponse.json(interview, { status: 201 });
}
