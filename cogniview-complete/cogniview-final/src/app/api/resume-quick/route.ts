import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { screenResume, generateQuestionsFromResume } from "@/lib/openai";
import { store } from "@/lib/store";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("resume");
    const jobRole = formData.get("jobRole") as string || "General";
    const jobDesc = formData.get("jobDescription") as string || "";
    const level = formData.get("level") as string || "Mid-Level";
    const techStack = formData.get("techStack") as string || "";
    const techStackArray = techStack
      ? techStack.split(",").map(s => s.trim()).filter(Boolean)
      : [];
    const createInterview = formData.get("createInterview") === "true";
    const interviewTitle = formData.get("interviewTitle") as string;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Resume file is required" }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF resumes are supported" }, { status: 400 });
    }

    // Parse resume
    const bytes = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(bytes);
    const resumeText = (parsed.text || "")
      .replace(/\u0000/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!resumeText) {
      return NextResponse.json({ error: "Could not extract text from PDF" }, { status: 400 });
    }

    // Screen resume
    const screening = await screenResume(jobRole, jobDesc, level, techStackArray, resumeText);

    // Generate questions from resume
    const questions = await generateQuestionsFromResume(
      jobRole,
      jobDesc,
      level,
      techStackArray,
      resumeText,
      5 // Default to 5 questions for quick interviews
    );

    // Optionally create an interview if requested
    let interview = null;
    if (createInterview && interviewTitle) {
      interview = {
        id: uuidv4(),
        title: interviewTitle,
        jobRole,
        candidateStatus: "in_progress" as const,
        activeStageIndex: 0,
        stages: [{ id: "stage-1", name: "Resume Screening", passingScore: 6.5, order: 1 }],
        stageResults: [],
        decisionMails: [],
        jobDescription: jobDesc,
        level: level || "Mid-Level",
        techStack: techStackArray,
        numQuestions: questions.length,
        questions,
        status: "ready" as const,
        questionSource: "resume" as const,
        resumeFileName: file.name,
        resumeUploadedAt: new Date().toISOString(),
        screening,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedSessions: 0,
      };
      store.interviews.push(interview);
    }

    return NextResponse.json({
      ok: true,
      screening,
      questions,
      resumeFileName: file.name,
      extractedChars: resumeText.length,
      pages: parsed.numpages || null,
      interview: interview || null,
    });
  } catch (e: any) {
    console.error("Quick resume upload error:", e);
    return NextResponse.json({ error: e?.message || "Failed to process resume" }, { status: 500 });
  }
}
