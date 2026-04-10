import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET() {
  const { interviews, sessions } = store;
  const done = sessions.filter(s => s.status === "completed");

  const avgScore = done.length
    ? Math.round(done.reduce((a, s) => a + (s.overallScore || 0), 0) / done.length * 10) / 10
    : 0;

  const dist = [
    { range: "0–4", count: done.filter(s => (s.overallScore || 0) <= 4).length },
    { range: "5–6", count: done.filter(s => { const x = s.overallScore || 0; return x >= 5 && x <= 6; }).length },
    { range: "7–8", count: done.filter(s => { const x = s.overallScore || 0; return x >= 7 && x <= 8; }).length },
    { range: "9–10", count: done.filter(s => (s.overallScore || 0) >= 9).length },
  ];

  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const ms = done.filter(s => {
      const sd = new Date(s.startedAt);
      return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
    });
    return {
      month: d.toLocaleString("default", { month: "short" }),
      sessions: ms.length,
      avgScore: ms.length
        ? Math.round(ms.reduce((a, s) => a + (s.overallScore || 0), 0) / ms.length * 10) / 10
        : 0,
    };
  });

  const recent = done.slice(-6).reverse().map(s => {
    const iv = interviews.find(i => i.id === s.interviewId);
    return {
      id: s.id, interviewId: s.interviewId,
      title: iv?.title || "—", jobRole: iv?.jobRole || "—",
      score: s.overallScore, recommendation: s.feedback?.recommendation,
      date: s.startedAt, duration: s.duration,
    };
  });

  return NextResponse.json({
    summary: {
      totalInterviews: interviews.length,
      completedSessions: done.length,
      totalSessions: sessions.length,
      avgScore,
      readyInterviews: interviews.filter(i => i.status === "ready").length,
    },
    dist, monthly, recent,
  });
}
