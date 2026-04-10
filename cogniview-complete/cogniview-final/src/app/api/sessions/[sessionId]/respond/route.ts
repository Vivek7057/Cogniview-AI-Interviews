import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { evaluateAnswer, summarizeInterview } from "@/lib/openai";

export async function POST(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const { answer, questionId } = await req.json();
  const si = store.sessions.findIndex(s => s.id === sessionId);
  if (si === -1) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const session = store.sessions[si];
  if (session.status !== "in_progress")
    return NextResponse.json({ error: "Session not active" }, { status: 400 });

  const iv = store.interviews.find(i => i.id === session.interviewId);
  if (!iv) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

  const q = iv.questions[session.currentQuestionIndex];

  try {
    const evaluation = await evaluateAnswer(
      q.question, q.category, q.difficulty, q.idealAnswer,
      iv.jobRole, iv.level, answer || ""
    );

    const response = {
      questionId: q.id, question: q.question,
      answer: answer || "", evaluation,
      answeredAt: new Date().toISOString(),
    };

    store.sessions[si].responses.push(response);
    store.sessions[si].scores.push(evaluation.score);
    store.sessions[si].currentQuestionIndex += 1;

    const nextIdx = store.sessions[si].currentQuestionIndex;
    const isComplete = nextIdx >= iv.questions.length;
    let overallFeedback = null;

    if (isComplete) {
      const scores = store.sessions[si].scores;
      const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      store.sessions[si].overallScore = Math.round(avg * 10) / 10;
      store.sessions[si].status = "completed";
      store.sessions[si].endedAt = new Date().toISOString();
      store.sessions[si].duration = Math.round(
        (Date.now() - new Date(session.startedAt).getTime()) / 1000
      );

      overallFeedback = await summarizeInterview(
        iv.jobRole, iv.level, scores,
        store.sessions[si].responses.map(r => ({ question: r.question, grade: r.evaluation.grade }))
      );
      store.sessions[si].feedback = overallFeedback;

      const ii = store.interviews.findIndex(i => i.id === session.interviewId);
      if (ii !== -1) {
        const interview = store.interviews[ii];
        const stage = interview.stages?.[interview.activeStageIndex] || {
          id: store.sessions[si].stageId || "stage-1",
          name: store.sessions[si].stageName || "Technical Screening",
          passingScore: store.sessions[si].stagePassingScore || 6.5,
        };
        const sessionScore = store.sessions[si].overallScore!;
        const passed = sessionScore >= stage.passingScore;

        interview.stageResults.push({
          stageId: stage.id,
          stageName: stage.name,
          score: sessionScore,
          passed,
          sessionId,
          evaluatedAt: new Date().toISOString(),
        });

        if (!passed) {
          interview.candidateStatus = "rejected";
        } else if (interview.activeStageIndex < interview.stages.length - 1) {
          interview.activeStageIndex += 1;
          interview.candidateStatus = "in_progress";
        } else {
          interview.candidateStatus = "selected";
        }

        store.interviews[ii].completedSessions += 1;
        store.interviews[ii].lastSessionScore = store.sessions[si].overallScore!;
        store.interviews[ii].updatedAt = new Date().toISOString();
      }
    }

    return NextResponse.json({
      evaluation, isComplete,
      nextQuestion: isComplete ? null : iv.questions[nextIdx],
      nextIndex: nextIdx,
      overallScore: store.sessions[si].overallScore,
      overallFeedback,
      session: store.sessions[si],
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "AI evaluation failed" }, { status: 500 });
  }
}
