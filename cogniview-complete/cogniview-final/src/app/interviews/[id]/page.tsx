"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { DecisionMail, Interview, Question, ResumeScreening } from "@/types";
import { toast } from "sonner";

const DIFF_STYLE: Record<string,{color:string;bg:string;border:string}> = {
  Easy:   { color:"#00D4AA", bg:"rgba(0,212,170,0.1)",  border:"rgba(0,212,170,0.22)"  },
  Medium: { color:"#F59E0B", bg:"rgba(245,158,11,0.1)", border:"rgba(245,158,11,0.22)" },
  Hard:   { color:"#F87171", bg:"rgba(248,113,113,0.1)",border:"rgba(248,113,113,0.22)" },
};
const CAT_ICON: Record<string,string> = { Technical:"⚙️", Behavioral:"🧠", "System Design":"🏗️", "Problem Solving":"🔍" };

function QCard({ q, idx }: { q:Question; idx:number }) {
  const [open, setOpen] = useState(false);
  const d = DIFF_STYLE[q.difficulty] || DIFF_STYLE.Medium;
  return (
    <div className="card" style={{ overflow:"hidden" }}>
      <button onClick={()=>setOpen(o=>!o)} style={{
        width:"100%", display:"flex", alignItems:"center", gap:14, padding:"16px 20px",
        background:"none", border:"none", cursor:"pointer", textAlign:"left",
      }}>
        <div style={{ width:34, height:34, borderRadius:9, background:d.bg, border:`1px solid ${d.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:d.color, flexShrink:0 }}>{idx+1}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:14, fontWeight:600, color:"var(--text)", marginBottom:5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace: open?"normal":"nowrap" }}>{q.question}</p>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:5, background:d.bg, border:`1px solid ${d.border}`, color:d.color }}>{q.difficulty}</span>
            <span style={{ fontSize:12, color:"var(--text-3)" }}>{CAT_ICON[q.category]||"•"} {q.category}</span>
            <span style={{ fontSize:11, color:"var(--text-4)" }}>~{Math.round((q.expectedDuration||120)/60)}m</span>
          </div>
        </div>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color:"var(--text-4)", transform: open?"rotate(90deg)":"none", transition:"transform 0.2s", flexShrink:0 }}>
          <polyline points="9,18 15,12 9,6"/>
        </svg>
      </button>

      {open && (
        <div style={{ padding:"0 20px 18px", borderTop:"1px solid var(--border)" }} className="anim-fade-up">
          {q.hints?.length > 0 && (
            <div style={{ marginTop:14 }}>
              <p className="label" style={{ marginBottom:8 }}>💡 Hints</p>
              {q.hints.map((h,i)=><p key={i} style={{ fontSize:13, color:"var(--text-2)", marginBottom:4, paddingLeft:12, borderLeft:"2px solid var(--brand)" }}>{h}</p>)}
            </div>
          )}
          {q.idealAnswer && (
            <div style={{ marginTop:14, padding:"12px 16px", borderRadius:10, background:"rgba(79,158,255,0.07)", border:"1px solid rgba(79,158,255,0.18)" }}>
              <p className="label" style={{ marginBottom:8, color:"#4F9EFF" }}>✦ Ideal Answer Outline</p>
              <p style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.7 }}>{q.idealAnswer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function InterviewDetailPage() {
  const { id } = useParams<{ id:string }>();
  const router = useRouter();
  const [interview, setInterview] = useState<Interview|null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [resumeGenerating, setResumeGenerating] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [screeningResume, setScreeningResume] = useState(false);
  const [starting, setStarting] = useState(false);
  const [sendingMail, setSendingMail] = useState<"selection" | "rejection" | null>(null);
  const [mailLog, setMailLog] = useState<DecisionMail[]>([]);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/interviews/${id}`)
      .then(r=>r.json())
      .then((data) => {
        setInterview(data);
        setMailLog(data?.decisionMails || []);
      })
      .finally(()=>setLoading(false));
  }, [id]);

  const sendDecisionMail = async (type: "selection" | "rejection") => {
    setSendingMail(type);
    try {
      const res = await fetch(`/api/interviews/${id}/mail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send mail");
      setMailLog(prev => [data.mail, ...prev]);
      toast.success(`${type === "selection" ? "Selection" : "Rejection"} mail sent`);
    } catch (e: any) {
      toast.error(e.message || "Mail sending failed");
    } finally {
      setSendingMail(null);
    }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/interviews/${id}/generate-questions`, { method:"POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!Array.isArray(data.questions)) throw new Error("Invalid questions format from server");
      setInterview(p => p ? { ...p, questions:data.questions, status:"ready", questionSource: "role" } : p);
      toast.success(`${data.questions.length} questions generated!`);
    } catch(e:any) { toast.error(e.message||"Generation failed"); }
    finally { setGenerating(false); }
  };

  const uploadResume = async (file?: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF resume");
      return;
    }

    setUploadingResume(true);
    try {
      const formData = new FormData();
      formData.append("resume", file);

      const res = await fetch(`/api/interviews/${id}/resume`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setInterview(prev =>
        prev
          ? {
              ...prev,
              resumeFileName: data.resumeFileName,
              resumeUploadedAt: data.resumeUploadedAt,
              screening: undefined,
            }
          : prev
      );

      toast.success("Resume uploaded and parsed successfully");
    } catch (e: any) {
      toast.error(e.message || "Resume upload failed");
    } finally {
      setUploadingResume(false);
      if (resumeInputRef.current) resumeInputRef.current.value = "";
    }
  };

  const screen = async () => {
    setScreeningResume(true);
    try {
      const res = await fetch(`/api/interviews/${id}/screen-resume`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setInterview(prev => (prev ? { ...prev, screening: data.screening as ResumeScreening } : prev));
      toast.success("Resume screening complete");
    } catch (e: any) {
      toast.error(e.message || "Resume screening failed");
    } finally {
      setScreeningResume(false);
    }
  };

  const generateFromResume = async () => {
    setResumeGenerating(true);
    try {
      const res = await fetch(`/api/interviews/${id}/generate-questions-resume`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!Array.isArray(data.questions)) throw new Error("Invalid questions format from server");

      setInterview(prev =>
        prev ? { ...prev, questions: data.questions, status: "ready", questionSource: "resume" } : prev
      );
      toast.success(`${data.questions.length} resume-based questions generated!`);
    } catch (e: any) {
      toast.error(e.message || "Resume-based generation failed");
    } finally {
      setResumeGenerating(false);
    }
  };

  const start = async () => {
    setStarting(true);
    try {
      const res = await fetch(`/api/interviews/${id}/sessions`, { method:"POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/interviews/${id}/session/${data.sessionId}`);
    } catch(e:any) { toast.error(e.message||"Failed to start"); setStarting(false); }
  };

  if (loading) return (
    <AppLayout>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div className="skeleton" style={{ height:200 }}/>
        <div className="skeleton" style={{ height:60 }}/>
        <div className="skeleton" style={{ height:60 }}/>
      </div>
    </AppLayout>
  );

  if (!interview) return (
    <AppLayout>
      <div style={{ textAlign:"center", padding:"80px 0" }}>
        <p style={{ color:"#F87171", marginBottom:16 }}>Interview not found.</p>
        <Link href="/interviews" className="btn btn-outline">Back</Link>
      </div>
    </AppLayout>
  );

  const hasQ = interview.questions?.length > 0;
  const activeStage = interview.stages?.[interview.activeStageIndex];

  return (
    <AppLayout>
      <Link href="/interviews" className="btn btn-ghost" style={{ marginBottom:24, paddingLeft:0 }}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="15,18 9,12 15,6"/></svg>
        All Interviews
      </Link>

      {/* Header card */}
      <div className="card anim-fade-up" style={{ padding:"26px 28px", marginBottom:18 }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:20, marginBottom:20 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
              <span className={`badge ${interview.status==="ready"?"badge-brand":"badge-amber"}`}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:"currentColor", display:"inline-block" }}/>{interview.status}
              </span>
              <span className="badge badge-gray">{interview.level}</span>
              <span className="badge badge-gray">{interview.numQuestions} questions</span>
              {interview.questionSource && (
                <span className={`badge ${interview.questionSource === "resume" ? "badge-blue" : "badge-purple"}`}>
                  {interview.questionSource === "resume" ? "resume-based" : "role-based"}
                </span>
              )}
              {interview.resumeFileName && <span className="badge badge-gray">resume: {interview.resumeFileName}</span>}
              {interview.completedSessions>0 && <span className="badge badge-blue">{interview.completedSessions} sessions done</span>}
              <span className={`badge ${interview.candidateStatus === "selected" ? "badge-brand" : interview.candidateStatus === "rejected" ? "badge-red" : "badge-amber"}`}>
                candidate: {interview.candidateStatus}
              </span>
              {activeStage && <span className="badge badge-purple">stage: {activeStage.name}</span>}
            </div>
            <h1 style={{ fontSize:24, fontWeight:800, color:"var(--text)", letterSpacing:-0.4, marginBottom:6 }}>{interview.title}</h1>
            <p style={{ fontSize:14, color:"var(--text-3)", marginBottom:12 }}>{interview.jobRole}</p>
            {interview.techStack?.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {interview.techStack.map(t=><span key={t} className="badge badge-gray">{t}</span>)}
              </div>
            )}
          </div>
          {interview.lastSessionScore !== undefined && (
            <div style={{ width:70, height:70, borderRadius:16, background:"var(--surface-hover)", border:"1px solid var(--border)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ fontSize:24, fontWeight:900, color: interview.lastSessionScore>=7?"var(--brand)":interview.lastSessionScore>=5?"#F59E0B":"#F87171", lineHeight:1 }}>{interview.lastSessionScore}</span>
              <span style={{ fontSize:10, color:"var(--text-4)", marginTop:2 }}>last score</span>
            </div>
          )}
        </div>

        {interview.jobDescription && (
          <p style={{ fontSize:13, color:"var(--text-3)", lineHeight:1.65, marginBottom:20, maxHeight:72, overflow:"hidden" }}>
            {interview.jobDescription.slice(0,300)}{interview.jobDescription.length>300?"…":""}
          </p>
        )}

        <input
          ref={resumeInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={e => uploadResume(e.target.files?.[0])}
        />

        <div style={{ borderTop:"1px solid var(--border)", paddingTop:18, display:"flex", gap:10, flexWrap:"wrap" }}>
          <button onClick={() => resumeInputRef.current?.click()} className="btn btn-outline" disabled={uploadingResume}>
            {uploadingResume
              ? <><div className="spinner" style={{ width:14,height:14,border:"2px solid var(--border)",borderTop:"2px solid var(--text-2)",borderRadius:"50%" }}/> Uploading Resume…</>
              : <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 20h16"/></svg> Upload Resume (PDF)</>
            }
          </button>

          <button onClick={screen} className="btn btn-outline" disabled={screeningResume || !interview.resumeFileName}>
            {screeningResume
              ? <><div className="spinner" style={{ width:14,height:14,border:"2px solid var(--border)",borderTop:"2px solid var(--text-2)",borderRadius:"50%" }}/> Screening…</>
              : <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 3"/></svg> Screen Resume</>
            }
          </button>

          <button onClick={generate} className="btn btn-outline" disabled={generating}>
            {generating
              ? <><div className="spinner" style={{ width:14,height:14,border:"2px solid var(--border)",borderTop:"2px solid var(--text-2)",borderRadius:"50%" }}/> Generating…</>
              : <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                {hasQ ? "Regenerate Role-Based Questions" : "Generate Role-Based Questions"}</>
            }
          </button>

          <button onClick={generateFromResume} className="btn btn-brand" disabled={resumeGenerating || !interview.resumeFileName}>
            {resumeGenerating
              ? <><div className="spinner" style={{ width:14,height:14,border:"2px solid rgba(5,18,15,0.3)",borderTop:"2px solid #05120F",borderRadius:"50%" }}/> Generating from Resume…</>
              : <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 4h10l4 4v12H5z"/><path d="M9 13h6"/><path d="M9 17h6"/></svg> Generate Questions from Resume</>
            }
          </button>

          {hasQ && (
            <button onClick={start} className="btn btn-brand" disabled={starting || interview.candidateStatus !== "in_progress"}>
              {starting
                ? <><div className="spinner" style={{ width:14,height:14,border:"2px solid rgba(5,18,15,0.3)",borderTop:"2px solid #05120F",borderRadius:"50%" }}/> Starting…</>
                : <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polygon points="5,3 19,12 5,21 5,3"/></svg> Start Interview Session</>
              }
            </button>
          )}
        </div>
      </div>

      <div className="card anim-fade-up" style={{ padding: "18px 20px", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p className="label">Hiring Pipeline Stages</p>
          {interview.candidateEmail && <span className="badge badge-gray">{interview.candidateEmail}</span>}
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {interview.stages?.map((stage, idx) => {
            const result = interview.stageResults?.find(s => s.stageId === stage.id);
            return (
              <div key={stage.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{idx + 1}. {stage.name}</p>
                  <p style={{ fontSize: 12, color: "var(--text-3)" }}>Passing score: {stage.passingScore}/10</p>
                </div>
                {result ? (
                  <span className={`badge ${result.passed ? "badge-brand" : "badge-red"}`}>{result.score}/10</span>
                ) : idx === interview.activeStageIndex ? (
                  <span className="badge badge-amber">active</span>
                ) : (
                  <span className="badge badge-gray">pending</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card anim-fade-up" style={{ padding: "18px 20px", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p className="label">Selection / Rejection Mail</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-outline" onClick={() => sendDecisionMail("selection")} disabled={sendingMail !== null || !interview.candidateEmail}>Send Selection</button>
            <button className="btn btn-danger" onClick={() => sendDecisionMail("rejection")} disabled={sendingMail !== null || !interview.candidateEmail}>Send Rejection</button>
          </div>
        </div>
        {!interview.candidateEmail && <p style={{ color: "var(--text-3)", fontSize: 13 }}>Add candidate email in job details to enable mailing.</p>}
        {!!mailLog.length && (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {mailLog.slice(0, 4).map((mail) => (
              <div key={mail.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "var(--surface)" }}>
                <p style={{ fontSize: 12, color: "var(--text-3)" }}>{mail.type.toUpperCase()} • {new Date(mail.sentAt).toLocaleString()}</p>
                <p style={{ fontSize: 13, fontWeight: 700 }}>{mail.subject}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {interview.screening && (
        <div className="card anim-fade-up" style={{ padding: "24px 26px", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>Resume Screening</h3>
            <span className={`badge ${interview.screening.score >= 75 ? "badge-brand" : interview.screening.score >= 50 ? "badge-amber" : "badge-red"}`}>
              score {interview.screening.score}/100
            </span>
          </div>

          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, marginBottom: 14 }}>
            {interview.screening.summary}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
              <p className="label" style={{ marginBottom: 8 }}>Strengths</p>
              {interview.screening.strengths.length ? interview.screening.strengths.map((s, i) => (
                <p key={`st-${i}`} style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 6 }}>- {s}</p>
              )) : <p style={{ fontSize: 12, color: "var(--text-4)" }}>No strengths found.</p>}
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
              <p className="label" style={{ marginBottom: 8 }}>Missing Skills</p>
              {interview.screening.missingSkills.length ? interview.screening.missingSkills.map((s, i) => (
                <p key={`ms-${i}`} style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 6 }}>- {s}</p>
              )) : <p style={{ fontSize: 12, color: "var(--text-4)" }}>No major gaps found.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Generating state */}
      {(generating || resumeGenerating) && (
        <div className="card anim-fade-up" style={{ padding:"56px 40px", textAlign:"center", marginBottom:18 }}>
          <div className="spinner" style={{ width:40,height:40,border:"3px solid var(--border)",borderTop:`3px solid var(--brand)`,borderRadius:"50%",margin:"0 auto 18px" }}/>
          <p style={{ fontSize:16, fontWeight:700, color:"var(--text)", marginBottom:6 }}>
            {resumeGenerating ? "Groq is crafting resume-based questions..." : "Groq is crafting role-based questions..."}
          </p>
          <p style={{ fontSize:13, color:"var(--text-3)" }}>
            {resumeGenerating
              ? "Using screening context to probe strengths and missing skills. Usually takes 10-20 seconds."
              : "Analyzing role details and generating tailored questions. Usually takes 10-20 seconds."}
          </p>
        </div>
      )}

      {/* Questions */}
      {!(generating || resumeGenerating) && hasQ && (
        <div className="anim-fade-up">
          <p className="label" style={{ marginBottom:12 }}>{interview.questions.length} Questions</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {interview.questions.map((q,i)=><QCard key={q.id} q={q} idx={i}/>)}
          </div>
        </div>
      )}

      {!(generating || resumeGenerating) && !hasQ && (
        <div className="card anim-fade-up" style={{ padding:"64px 40px", textAlign:"center" }}>
          <div style={{ fontSize:52, marginBottom:14 }}>✨</div>
          <h3 style={{ fontSize:18, fontWeight:800, color:"var(--text)", marginBottom:8 }}>No questions yet</h3>
          <p style={{ fontSize:14, color:"var(--text-3)" }}>Use "Generate Role-Based Questions" or upload a resume and use "Generate Questions from Resume".</p>
        </div>
      )}
    </AppLayout>
  );
}
