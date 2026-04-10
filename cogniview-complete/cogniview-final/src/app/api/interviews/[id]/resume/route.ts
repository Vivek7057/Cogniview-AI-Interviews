import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { store } from "@/lib/store";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idx = store.interviews.findIndex(i => i.id === id);
  if (idx === -1) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

  try {
    const formData = await req.formData();
    const file = formData.get("resume");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Resume file is required" }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF resumes are supported" }, { status: 400 });
    }

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

    const uploadedAt = new Date().toISOString();
    store.interviews[idx].resumeFileName = file.name;
    store.interviews[idx].resumeUploadedAt = uploadedAt;
    store.interviews[idx].resumeText = resumeText;
    store.interviews[idx].screening = undefined;
    store.interviews[idx].updatedAt = uploadedAt;

    return NextResponse.json({
      ok: true,
      resumeFileName: file.name,
      resumeUploadedAt: uploadedAt,
      extractedChars: resumeText.length,
      pages: parsed.numpages || null,
    });
  } catch (e: any) {
    console.error("Resume upload/parse error:", e);
    return NextResponse.json({ error: e?.message || "Failed to upload resume" }, { status: 500 });
  }
}
