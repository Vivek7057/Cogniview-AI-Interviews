import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const iv = store.interviews.find(i => i.id === id);
  if (!iv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { resumeText, ...safeInterview } = iv;
  return NextResponse.json(safeInterview);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idx = store.interviews.findIndex(i => i.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const {
    questions,
    status,
    questionSource,
    resumeFileName,
    screening,
    candidateStatus,
    activeStageIndex,
    stages,
    stageResults,
    decisionMails,
  } = body;

  if (questions) store.interviews[idx].questions = questions;
  if (status) store.interviews[idx].status = status;
  if (questionSource) store.interviews[idx].questionSource = questionSource;
  if (resumeFileName) store.interviews[idx].resumeFileName = resumeFileName;
  if (screening) store.interviews[idx].screening = screening;
  if (candidateStatus) store.interviews[idx].candidateStatus = candidateStatus;
  if (Number.isInteger(activeStageIndex)) store.interviews[idx].activeStageIndex = activeStageIndex;
  if (Array.isArray(stages)) store.interviews[idx].stages = stages;
  if (Array.isArray(stageResults)) store.interviews[idx].stageResults = stageResults;
  if (Array.isArray(decisionMails)) store.interviews[idx].decisionMails = decisionMails;
  
  store.interviews[idx].updatedAt = new Date().toISOString();
  
  const { resumeText, ...safeInterview } = store.interviews[idx];
  return NextResponse.json(safeInterview);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idx = store.interviews.findIndex(i => i.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  store.interviews.splice(idx, 1);
  store.sessions = store.sessions.filter(s => s.interviewId !== id);
  return NextResponse.json({ ok: true });
}
