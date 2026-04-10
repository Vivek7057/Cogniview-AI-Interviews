import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { store } from "@/lib/store";

function buildMessage(type: "selection" | "rejection", candidateName: string, title: string, stageName: string) {
  if (type === "selection") {
    return {
      subject: `Congratulations! Selected for ${title}`,
      body: `Hi ${candidateName},\n\nGreat news. You have been selected for the role ${title}.\nYour performance in the ${stageName} stage met our expectations.\n\nRegards,\nHiring Team`,
    };
  }

  return {
    subject: `Update on your application for ${title}`,
    body: `Hi ${candidateName},\n\nThank you for participating in our hiring process for ${title}.\nAfter reviewing your ${stageName} stage results, we are moving ahead with other candidates at this time.\n\nRegards,\nHiring Team`,
  };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const interview = store.interviews.find(i => i.id === id);
  if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  return NextResponse.json({ mails: interview.decisionMails || [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idx = store.interviews.findIndex(i => i.id === id);
  if (idx === -1) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

  const interview = store.interviews[idx];
  const body = await req.json();
  const type = body?.type as "selection" | "rejection";
  const customSubject = body?.subject as string | undefined;
  const customBody = body?.body as string | undefined;

  if (!type || (type !== "selection" && type !== "rejection")) {
    return NextResponse.json({ error: "Mail type must be selection or rejection" }, { status: 400 });
  }
  if (!interview.candidateEmail) {
    return NextResponse.json({ error: "Candidate email is required to send a decision mail" }, { status: 400 });
  }

  const latestStage = interview.stageResults[interview.stageResults.length - 1];
  const stageName = latestStage?.stageName || interview.stages[interview.activeStageIndex]?.name || "current";
  const candidateName = interview.candidateName || "Candidate";
  const defaults = buildMessage(type, candidateName, interview.title, stageName);

  const mail = {
    id: uuid(),
    type,
    to: interview.candidateEmail,
    subject: customSubject?.trim() || defaults.subject,
    body: customBody?.trim() || defaults.body,
    sentAt: new Date().toISOString(),
    status: "sent" as const,
  };

  store.interviews[idx].decisionMails.push(mail);
  store.interviews[idx].updatedAt = new Date().toISOString();

  return NextResponse.json({ ok: true, mail });
}
