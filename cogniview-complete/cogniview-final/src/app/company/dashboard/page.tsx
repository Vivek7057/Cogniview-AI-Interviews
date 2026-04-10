"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { formatDate, formatDuration, recStyle } from "@/lib/utils";
import { Question, ResumeScreening } from "@/types";
import { toast } from "sonner";

interface Stats { totalInterviews:number; completedSessions:number; totalSessions:number; avgScore:number; readyInterviews:number }
interface DistItem { range:string; count:number }
interface MonthItem { month:string; sessions:number; avgScore:number }
interface RecentItem { id:string; interviewId:string; title:string; jobRole:string; score:number|null; recommendation:string; date:string; duration:number|null }
interface Data { summary:Stats; dist:DistItem[]; monthly:MonthItem[]; recent:RecentItem[] }

const DIST_COLORS = ["#F87171","#F59E0B","#4F9EFF","#00D4AA"];

function Stat({ label, value, sub, color, icon }: { label:string; value:string|number; sub?:string; color:string; icon:React.ReactNode }) {
  return (
    <div className="card anim-fade-up" style={{ padding: "24px 26px", position: "relative", overflow: "hidden" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 16 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:`${color}15`, border:`1px solid ${color}28`, display:"flex", alignItems:"center", justifyContent:"center", color }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, color, lineHeight:1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color:"var(--text)", marginBottom: 2 }}>{label}</div>
      {sub && <div style={{ fontSize:12, color:"var(--text-3)" }}>{sub}</div>}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:2, background:`linear-gradient(90deg, ${color}, transparent)` }}/>
    </div>
  );
}

function BarChart({ data }: { data: MonthItem[] }) {
  const max = Math.max(...data.map(d => d.sessions), 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:80, marginTop:8 }}>
      {data.map((d,i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
          {d.sessions > 0 && <span style={{ fontSize:10, color:"var(--text-3)", fontWeight:600 }}>{d.sessions}</span>}
          <div style={{
            width:"100%", borderRadius:"4px 4px 0 0",
            height: d.sessions ? `${Math.max(d.sessions/max*100, 8)}%` : "4%",
            background: d.sessions ? "linear-gradient(180deg,#00D4AA,rgba(0,212,170,0.35))" : "var(--surface-hover)",
            minHeight:3, transition:"height 0.6s ease"
          }}/>
          <span style={{ fontSize:9, color:"var(--text-4)" }}>{d.month}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Data|null>(null);
  const [loading, setLoading] = useState(true);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeProcessing, setResumeProcessing] = useState(false);
  const [resumeResult, setResumeResult] = useState<{screening: ResumeScreening; questions: Question[]; resumeFileName: string} | null>(null);
  const [creatingInterview, setCreatingInterview] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [quickFormData, setQuickFormData] = useState({
    jobRole: "",
    jobDescription: "",
    level: "Mid-Level",
    techStack: "",
  });

  useEffect(() => {
    fetch("/api/analytics").then(r=>r.json()).then(setData).finally(()=>setLoading(false));
  }, []);

  const handleResumeUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF resume");
      return;
    }

    setResumeUploading(true);
    setResumeProcessing(true);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("jobRole", quickFormData.jobRole || "General");
      formData.append("jobDescription", quickFormData.jobDescription || "");
      formData.append("level", quickFormData.level || "Mid-Level");
      formData.append("techStack", quickFormData.techStack || "");

      const res = await fetch("/api/resume-quick", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResumeResult({
        screening: data.screening,
        questions: data.questions,
        resumeFileName: data.resumeFileName,
      });
      toast.success("Resume processed successfully!");
    } catch (e: any) {
      toast.error(e.message || "Resume processing failed");
    } finally {
      setResumeUploading(false);
      setResumeProcessing(false);
      if (resumeInputRef.current) resumeInputRef.current.value = "";
    }
  };

  const createInterviewFromResume = async () => {
    if (!resumeResult) return;
    setCreatingInterview(true);
    try {
      const formData = new FormData();
      // We need to re-upload the resume with createInterview flag
      // But we already have the results, so let's just create via store directly

      // Since we've already screened and generated, create interview directly
      const interviewId = Math.random().toString(36).slice(2);
      
      const interviewTitle = `${quickFormData.jobRole || "Quick"} Interview - ${new Date().toLocaleDateString()}`;
      
      // Simulate creating via API by calling store manually through fetch
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: interviewTitle,
          jobRole: quickFormData.jobRole || "General",
          jobDescription: quickFormData.jobDescription || "",
          level: quickFormData.level || "Mid-Level",
          techStack: quickFormData.techStack ? quickFormData.techStack.split(",").map(s => s.trim()) : [],
          numQuestions: resumeResult.questions.length,
        }),
      });
      const newInterview = await res.json();
      if (!res.ok) throw new Error(newInterview.error);

      // Update with resume questions
      const updateRes = await fetch(`/api/interviews/${newInterview.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: resumeResult.questions,
          status: "ready",
          questionSource: "resume",
          resumeFileName: resumeResult.resumeFileName,
          screening: resumeResult.screening,
        }),
      });
      if (!updateRes.ok) throw new Error("Failed to update interview");

      toast.success("Interview created from resume!");
      setResumeResult(null);
      setQuickFormData({ jobRole: "", jobDescription: "", level: "Mid-Level", techStack: "" });
      
      // Refresh analytics
      fetch("/api/analytics").then(r=>r.json()).then(setData);
      
      // Navigate to interview
      router.push(`/interviews/${newInterview.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create interview");
    } finally {
      setCreatingInterview(false);
    }
  };

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:36 }}>
        <div className="anim-fade-up">
          <h1 style={{ fontSize:28, fontWeight:800, color:"var(--text)", letterSpacing:-0.5, marginBottom:4 }}>Dashboard</h1>
          <p style={{ fontSize:14, color:"var(--text-3)" }}>Welcome back — your AI interview platform overview</p>
        </div>
        <Link href="/interviews/new" className="btn btn-brand anim-fade-up">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Interview
        </Link>
      </div>

      {loading ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
          {[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{ height:130 }}/>)}
        </div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
            <Stat label="Interviews Created" value={data?.summary.totalInterviews??0} sub="total" color="#A78BFA"
              icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>}
            />
            <Stat label="Sessions Completed" value={data?.summary.completedSessions??0} sub={`${data?.summary.totalSessions??0} started`} color="#00D4AA"
              icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><polyline points="20,6 9,17 4,12"/></svg>}
            />
            <Stat label="Avg Score" value={data?.summary.avgScore ? `${data.summary.avgScore}/10` : "—"} sub="across all sessions"
              color={!data?.summary.avgScore ? "#6B7280" : data.summary.avgScore>=7?"#00D4AA":data.summary.avgScore>=5?"#F59E0B":"#F87171"}
              icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/></svg>}
            />
            <Stat label="Ready to Use" value={data?.summary.readyInterviews??0} sub="interviews with questions" color="#4F9EFF"
              icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>}
            />
          </div>

          {/* Resume Upload Section */}
          {!resumeResult ? (
            <div className="card anim-fade-up-delay-1" style={{ padding: "32px", marginBottom: 24, background: "linear-gradient(135deg, rgba(0,212,170,0.08) 0%, rgba(79,158,255,0.08) 100%)", border: "1px solid rgba(0,212,170,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>📄 Quick Resume Upload</h3>
                  <p style={{ fontSize: 13, color: "var(--text-3)" }}>Upload a resume to instantly screen it and generate AI questions</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                <div>
                  <label className="label" style={{ display: "block", marginBottom: 8 }}>Job Role</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g. Senior Frontend Engineer"
                    value={quickFormData.jobRole}
                    onChange={e => setQuickFormData(f => ({ ...f, jobRole: e.target.value }))}
                    style={{ marginBottom: 14 }}
                  />

                  <label className="label" style={{ display: "block", marginBottom: 8 }}>Level</label>
                  <select
                    className="input"
                    value={quickFormData.level}
                    onChange={e => setQuickFormData(f => ({ ...f, level: e.target.value }))}
                    style={{ marginBottom: 14 }}
                  >
                    <option>Junior</option>
                    <option>Mid-Level</option>
                    <option>Senior</option>
                    <option>Lead</option>
                  </select>
                </div>

                <div>
                  <label className="label" style={{ display: "block", marginBottom: 8 }}>Job Description (optional)</label>
                  <textarea
                    className="input"
                    placeholder="Paste key responsibilities and requirements..."
                    value={quickFormData.jobDescription}
                    onChange={e => setQuickFormData(f => ({ ...f, jobDescription: e.target.value }))}
                    style={{ marginBottom: 14, minHeight: 70, fontFamily: "inherit", resize: "vertical" }}
                  />

                  <label className="label" style={{ display: "block", marginBottom: 8 }}>Tech Stack (comma-separated, optional)</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g. React, TypeScript, Node.js"
                    value={quickFormData.techStack}
                    onChange={e => setQuickFormData(f => ({ ...f, techStack: e.target.value }))}
                  />
                </div>
              </div>

              <input
                ref={resumeInputRef}
                type="file"
                accept="application/pdf"
                style={{ display: "none" }}
                onChange={e => handleResumeUpload(e.target.files?.[0] || null)}
              />

              <button
                onClick={() => resumeInputRef.current?.click()}
                className="btn btn-brand"
                disabled={resumeUploading}
              >
                {resumeUploading
                  ? <><div className="spinner" style={{ width: 14, height: 14, border: "2px solid rgba(5,18,15,0.3)", borderTop: "2px solid #05120F", borderRadius: "50%" }} /> Processing...</>
                  : <><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 4v16" /><path d="M8 8l4-4 4 4" /></svg> Upload Resume (PDF)</>
                }
              </button>
            </div>
          ) : (
            <div className="card anim-fade-up-delay-1" style={{ padding: "28px", marginBottom: 24, border: "2px solid var(--brand)", background: "rgba(0,212,170,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>✅ Resume Screening Results</h3>
                <button
                  onClick={() => setResumeResult(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-3)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "underline",
                  }}
                >
                  Clear
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                <div style={{ background: "var(--surface)", padding: 12, borderRadius: 10, textAlign: "center" }}>
                  <p style={{ fontSize: 24, fontWeight: 900, color: resumeResult.screening.score >= 75 ? "var(--brand)" : resumeResult.screening.score >= 50 ? "#F59E0B" : "#F87171" }}>
                    {resumeResult.screening.score}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600 }}>Score</p>
                </div>

                <div style={{ background: "var(--surface)", padding: 12, borderRadius: 10, textAlign: "center" }}>
                  <p style={{ fontSize: 24, fontWeight: 900, color: "#4F9EFF" }}>
                    {resumeResult.screening.strengths.length}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600 }}>Strengths</p>
                </div>

                <div style={{ background: "var(--surface)", padding: 12, borderRadius: 10, textAlign: "center" }}>
                  <p style={{ fontSize: 24, fontWeight: 900, color: "#00D4AA" }}>
                    {resumeResult.screening.matchedSkills.length}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600 }}>Matched Skills</p>
                </div>

                <div style={{ background: "var(--surface)", padding: 12, borderRadius: 10, textAlign: "center" }}>
                  <p style={{ fontSize: 24, fontWeight: 900, color: "#F87171" }}>
                    {resumeResult.screening.missingSkills.length}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600 }}>Missing Skills</p>
                </div>
              </div>

              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, marginBottom: 20, padding: 14, background: "var(--surface)", borderRadius: 10 }}>
                {resumeResult.screening.summary}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                <div>
                  <p className="label" style={{ marginBottom: 8 }}>Top Strengths</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {resumeResult.screening.strengths.slice(0, 3).map((s, i) => (
                      <p key={i} style={{ fontSize: 12, color: "var(--text-2)" }}>✓ {s}</p>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="label" style={{ marginBottom: 8 }}>Skills to Develop</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {resumeResult.screening.missingSkills.slice(0, 3).map((s, i) => (
                      <p key={i} style={{ fontSize: 12, color: "var(--text-2)" }}>⚡ {s}</p>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={createInterviewFromResume}
                  className="btn btn-brand"
                  disabled={creatingInterview}
                  style={{ flex: 1 }}
                >
                  {creatingInterview ? "Creating..." : `Create Interview (${resumeResult.questions.length} Questions)`}
                </button>
                <button
                  onClick={() => setResumeResult(null)}
                  className="btn btn-outline"
                >
                  Upload Another
                </button>
              </div>
            </div>
          )}

          {/* Charts row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:24 }}>
            <div className="card anim-fade-up-delay-1" style={{ padding:"22px 24px" }}>
              <p className="label" style={{ marginBottom:12 }}>Session Activity</p>
              {data?.monthly && <BarChart data={data.monthly}/>}
              {!data?.monthly?.some(m=>m.sessions>0) && (
                <p style={{ fontSize:13, color:"var(--text-4)", textAlign:"center", paddingTop:24 }}>No sessions yet</p>
              )}
            </div>

            <div className="card anim-fade-up-delay-2" style={{ padding:"22px 24px" }}>
              <p className="label" style={{ marginBottom:16 }}>Score Distribution</p>
              {!data?.summary.completedSessions ? (
                <p style={{ fontSize:13, color:"var(--text-4)", textAlign:"center", paddingTop:20 }}>Complete sessions to see data</p>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {data?.dist.map((d,i) => {
                    const max = Math.max(...(data.dist.map(x=>x.count)||[1]),1);
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:11, fontFamily:"'JetBrains Mono',monospace", color:"var(--text-3)", width:34, flexShrink:0 }}>{d.range}</span>
                        <div style={{ flex:1, height:7, background:"var(--surface-hover)", borderRadius:3, overflow:"hidden" }}>
                          <div style={{ width:`${(d.count/max)*100}%`, height:"100%", background:DIST_COLORS[i], borderRadius:3, transition:"width 0.8s ease" }}/>
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, color:DIST_COLORS[i], width:16, textAlign:"right" }}>{d.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="card anim-fade-up-delay-3" style={{ padding:"22px 24px" }}>
              <p className="label" style={{ marginBottom:16 }}>Quick Actions</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[
                  { href:"/interviews/new", label:"Create Interview", icon:"+" },
                  { href:"/interviews", label:"All Interviews", icon:"→" },
                  { href:"/analytics", label:"Full Analytics", icon:"↗" },
                ].map(a => (
                  <Link key={a.href} href={a.href} style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"11px 14px", borderRadius:10, textDecoration:"none",
                    background:"var(--surface)", border:"1px solid var(--border)",
                    color:"var(--text-2)", fontSize:13, fontWeight:500, transition:"all 0.2s",
                  }}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="var(--surface-hover)";(e.currentTarget as HTMLElement).style.color="var(--text)";}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="var(--surface)";(e.currentTarget as HTMLElement).style.color="var(--text-2)";}}
                  >
                    {a.label}
                    <span style={{ color:"var(--brand)", fontWeight:700 }}>{a.icon}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Recent sessions */}
          <div className="card anim-fade-up-delay-4" style={{ padding:"22px 24px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <p className="label">Recent Sessions</p>
              <Link href="/analytics" style={{ fontSize:12, color:"var(--brand)", textDecoration:"none", fontWeight:600 }}>View all →</Link>
            </div>

            {!data?.recent?.length ? (
              <div style={{ textAlign:"center", padding:"40px 0" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🎯</div>
                <p style={{ fontWeight:700, color:"var(--text)", marginBottom:6 }}>No completed sessions yet</p>
                <p style={{ fontSize:13, color:"var(--text-3)", marginBottom:20 }}>Create an interview, generate questions, and start practicing.</p>
                <Link href="/interviews/new" className="btn btn-brand" style={{ display:"inline-flex" }}>Create First Interview</Link>
              </div>
            ) : (
              <div>
                {data.recent.map((r,i) => {
                  const rs = r.recommendation ? recStyle(r.recommendation) : { color:"#6B7280", bg:"rgba(107,114,128,0.1)", border:"rgba(107,114,128,0.2)" };
                  return (
                    <Link key={r.id} href={`/interviews/${r.interviewId}`} style={{
                      display:"flex", alignItems:"center", gap:14,
                      padding:"12px 0", textDecoration:"none",
                      borderBottom: i < data.recent.length-1 ? "1px solid var(--border)" : "none",
                      transition:"opacity 0.2s",
                    }}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.opacity="0.7"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.opacity="1"}
                    >
                      <div style={{
                        width:44, height:44, borderRadius:"50%", flexShrink:0,
                        background:rs.bg, border:`2px solid ${rs.border}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:15, fontWeight:800, color:rs.color,
                      }}>{r.score??"-"}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:14, fontWeight:600, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:3 }}>{r.title}</p>
                        <p style={{ fontSize:12, color:"var(--text-3)" }}>{r.jobRole} · {formatDate(r.date)} · {formatDuration(r.duration)}</p>
                      </div>
                      {r.recommendation && (
                        <span style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:8, background:rs.bg, border:`1px solid ${rs.border}`, color:rs.color, flexShrink:0 }}>
                          {r.recommendation}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}
