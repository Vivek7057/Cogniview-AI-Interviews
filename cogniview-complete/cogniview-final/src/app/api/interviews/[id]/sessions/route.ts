import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { store } from "@/lib/store";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const iv = store.interviews.find(i => i.id === id);
  if (!iv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (iv.candidateStatus === "rejected")
    return NextResponse.json({ error: "Candidate is already rejected for this job" }, { status: 400 });
  if (iv.candidateStatus === "selected")
    return NextResponse.json({ error: "Candidate is already selected for this job" }, { status: 400 });
  if (!iv.questions.length)
    return NextResponse.json({ error: "Generate questions first" }, { status: 400 });

  const stage = iv.stages?.[iv.activeStageIndex] || {
    id: "stage-1",
    name: "Technical Screening",
    passingScore: 6.5,
  };

  const session = {
    id: uuid(),
    interviewId: id,
    stageId: stage.id,
    stageName: stage.name,
    stagePassingScore: stage.passingScore,
    status: "in_progress" as const,
    currentQuestionIndex: 0,
    totalQuestions: iv.questions.length,
    responses: [],
    scores: [],
    overallScore: null,
    feedback: null,
    startedAt: new Date().toISOString(),
    endedAt: null,
    duration: null,
  };
  store.sessions.push(session);
  return NextResponse.json({
    sessionId: session.id,
    firstQuestion: iv.questions[0],
    totalQuestions: iv.questions.length,
    stage,
  });
}
