import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { generateQuestions } from "@/lib/openai";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const iv = store.interviews.find(i => i.id === id);
  if (!iv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const questions = await generateQuestions(
      iv.jobRole, iv.jobDescription, iv.level, iv.techStack, iv.numQuestions
    );
    
    if (!Array.isArray(questions)) {
      console.error("generateQuestions returned non-array:", questions);
      return NextResponse.json({ error: "Invalid questions format from AI" }, { status: 500 });
    }
    
    const idx = store.interviews.findIndex(i => i.id === id);
    if (idx === -1) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    
    store.interviews[idx].questions = questions;
    store.interviews[idx].status = "ready";
    store.interviews[idx].questionSource = "role";
    store.interviews[idx].updatedAt = new Date().toISOString();
    return NextResponse.json({ questions });
  } catch (e: any) {
    console.error("Generation error:", e);
    return NextResponse.json({ error: e.message || "AI generation failed" }, { status: 500 });
  }
}
