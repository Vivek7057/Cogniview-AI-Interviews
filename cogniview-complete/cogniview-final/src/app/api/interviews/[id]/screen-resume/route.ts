import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { screenResume } from "@/lib/openai";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idx = store.interviews.findIndex(i => i.id === id);
  if (idx === -1) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

  const interview = store.interviews[idx];
  if (!interview.resumeText) {
    return NextResponse.json({ error: "Upload a resume first" }, { status: 400 });
  }

  try {
    const screening = await screenResume(
      interview.jobRole,
      interview.jobDescription,
      interview.level,
      interview.techStack,
      interview.resumeText
    );

    store.interviews[idx].screening = screening;
    store.interviews[idx].updatedAt = new Date().toISOString();

    return NextResponse.json({ screening });
  } catch (e: any) {
    console.error("Resume screening error:", e);
    return NextResponse.json({ error: e?.message || "Resume screening failed" }, { status: 500 });
  }
}
