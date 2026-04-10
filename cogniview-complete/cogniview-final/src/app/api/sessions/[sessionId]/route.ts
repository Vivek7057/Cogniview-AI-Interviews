import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(_: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = store.sessions.find(s => s.id === sessionId);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const interview = store.interviews.find(i => i.id === session.interviewId);
  return NextResponse.json({ session, interview });
}
