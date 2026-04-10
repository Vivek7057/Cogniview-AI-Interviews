"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { Interview } from "@/types";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

const LEVEL_COLOR: Record<string,string> = { "Junior":"#00D4AA","Mid-level":"#4F9EFF","Senior":"#A78BFA","Lead":"#F59E0B","Principal":"#F87171" };

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"company" | "candidate">("company");
  const [email, setEmail] = useState("");

  const load = () => {
    const raw = localStorage.getItem("cv_auth");
    const auth = raw ? JSON.parse(raw) : null;
    const userRole = auth?.role === "candidate" ? "candidate" : "company";
    setRole(userRole);
    setEmail(auth?.email || "");

    fetch("/api/interviews")
      .then(r=>r.json())
      .then((items: Interview[]) => {
        if (userRole === "candidate") {
          setInterviews(items.filter(i => i.candidateEmail && auth?.email && i.candidateEmail === auth.email));
          return;
        }
        setInterviews(items);
      })
      .finally(()=>setLoading(false));
  };
  useEffect(load, []);

  const del = async (id:string, e:React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm("Delete this interview and all sessions?")) return;
    await fetch(`/api/interviews/${id}`, { method:"DELETE" });
    toast.success("Interview deleted");
    load();
  };

  return (
    <AppLayout>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:32 }}>
        <div className="anim-fade-up">
          <h1 style={{ fontSize:28, fontWeight:800, color:"var(--text)", letterSpacing:-0.5, marginBottom:4 }}>{role === "candidate" ? "My Applications" : "Interviews"}</h1>
          <p style={{ fontSize:14, color:"var(--text-3)" }}>{interviews.length} interview{interviews.length!==1?"s":""} created</p>
        </div>
        {role === "company" && <Link href="/interviews/new" className="btn btn-brand anim-fade-up">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Interview
        </Link>}
      </div>

      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[...Array(3)].map((_,i)=><div key={i} className="skeleton" style={{height:100}}/>)}
        </div>
      ) : interviews.length === 0 ? (
        <div className="card anim-fade-up" style={{ padding:"80px 40px", textAlign:"center" }}>
          <div style={{ fontSize:56, marginBottom:16 }}>📋</div>
          <h2 style={{ fontSize:20, fontWeight:800, color:"var(--text)", marginBottom:8 }}>No interviews yet</h2>
                <p style={{ fontSize:14, color:"var(--text-3)", marginBottom:24 }}>
                  {role === "candidate" ? `No applications for ${email || "your account"} yet.` : "Create your first AI-powered interview in seconds."}
                </p>
                {role === "company" && <Link href="/interviews/new" className="btn btn-brand" style={{ display:"inline-flex" }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Interview
                </Link>}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {interviews.map((iv,i) => {
            const lc = LEVEL_COLOR[iv.level]||"#6B7280";
            const lastScore = iv.lastSessionScore;
            return (
              <Link key={iv.id} href={`/interviews/${iv.id}`}
                className={`card card-interactive anim-fade-up`}
                style={{ padding:"18px 22px", display:"block", textDecoration:"none", animationDelay:`${i*0.05}s` }}
              >
                <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                  {/* Status dot */}
                  <div style={{ width:8, height:8, borderRadius:"50%", background: iv.status==="ready"?"var(--brand)":"#F59E0B", flexShrink:0, boxShadow: iv.status==="ready"?"0 0 8px var(--brand-glow)":"none" }}/>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                      <span style={{ fontSize:16, fontWeight:700, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{iv.title}</span>
                      <span className={`badge ${iv.status==="ready"?"badge-brand":"badge-amber"}`}>{iv.status}</span>
                      <span className="badge" style={{ background:`${lc}14`, border:`1px solid ${lc}28`, color:lc }}>{iv.level}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                      <span style={{ fontSize:13, color:"var(--text-3)" }}>{iv.jobRole}</span>
                      {iv.techStack.slice(0,4).map(t=><span key={t} className="badge badge-gray">{t}</span>)}
                      {iv.techStack.length>4 && <span className="badge badge-gray">+{iv.techStack.length-4}</span>}
                    </div>
                  </div>

                  <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                    {/* Stats */}
                    <div style={{ textAlign:"right", marginRight:4 }}>
                      <p style={{ fontSize:12, color:"var(--text-3)" }}>{iv.questions.length} questions · {iv.completedSessions} sessions</p>
                      <p style={{ fontSize:11, color:"var(--text-4)", marginTop:2 }}>{formatDate(iv.createdAt)}</p>
                    </div>

                    {/* Last score */}
                    {lastScore !== undefined && (
                      <div style={{
                        width:48, height:48, borderRadius:12, flexShrink:0,
                        background:"var(--surface-hover)", border:"1px solid var(--border)",
                        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                      }}>
                        <span style={{ fontSize:16, fontWeight:800, color: lastScore>=7?"var(--brand)":lastScore>=5?"#F59E0B":"#F87171", lineHeight:1 }}>{lastScore}</span>
                        <span style={{ fontSize:9, color:"var(--text-4)" }}>/10</span>
                      </div>
                    )}

                    {/* Delete */}
                    {role === "company" && <button onClick={e=>del(iv.id,e)} className="btn btn-danger" style={{ padding:"8px 10px", borderRadius:10, opacity:0.6 }}
                      onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.opacity="1"}
                      onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.opacity="0.6"}
                      title="Delete"
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M10,11v6"/><path d="M14,11v6"/><path d="M9,6V4h6v2"/></svg>
                    </button>}

                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color:"var(--text-4)" }}>
                      <polyline points="9,18 15,12 9,6"/>
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
