"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { toast } from "sonner";

const LEVELS = ["Junior","Mid-level","Senior","Lead","Principal"];
const Q_COUNTS = [3,5,7,10];
const DEFAULT_STAGES = [
  { id: "stage-1", name: "Resume Screening", passingScore: 6 },
  { id: "stage-2", name: "Technical Interview", passingScore: 7 },
];
const TECH_SUGGESTIONS = ["React","TypeScript","Node.js","Python","AWS","Docker","PostgreSQL","GraphQL","Kubernetes","Go","Java","Next.js","Vue.js","MongoDB","Redis","Terraform","Swift","Kotlin","Flutter","Django"];

export default function NewInterviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [techInput, setTechInput] = useState("");
  const [form, setForm] = useState({
    title: "", jobRole: "", candidateName: "", candidateEmail: "", jobDescription: "",
    level: "Mid-level", techStack: [] as string[], numQuestions: 5,
    stages: DEFAULT_STAGES,
  });

  const addStage = () => {
    setForm(f => ({
      ...f,
      stages: [...f.stages, { id: `stage-${f.stages.length + 1}`, name: `Stage ${f.stages.length + 1}`, passingScore: 6.5 }],
    }));
  };

  const removeStage = (idx: number) => {
    setForm(f => ({ ...f, stages: f.stages.filter((_, i) => i !== idx) }));
  };

  const updateStage = (idx: number, field: "name" | "passingScore", value: string) => {
    setForm(f => ({
      ...f,
      stages: f.stages.map((s, i) => i === idx
        ? { ...s, [field]: field === "passingScore" ? Number(value || 0) : value }
        : s),
    }));
  };

  const addTech = (t: string) => {
    const v = t.trim();
    if (v && !form.techStack.includes(v)) setForm(f => ({ ...f, techStack: [...f.techStack, v] }));
    setTechInput("");
  };
  const removeTech = (t: string) => setForm(f => ({ ...f, techStack: f.techStack.filter(x => x !== t) }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.jobRole.trim()) { toast.error("Title and job role required"); return; }
    if (!form.stages.length || form.stages.some(s => !s.name.trim())) { toast.error("At least one valid stage is required"); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        stages: form.stages.map((s, idx) => ({
          id: s.id || `stage-${idx + 1}`,
          name: s.name.trim(),
          passingScore: Math.max(0, Math.min(10, Number(s.passingScore || 0))),
          order: idx + 1,
        })),
      };
      const res = await fetch("/api/interviews", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Interview created!");
      router.push(`/interviews/${data.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create");
    } finally { setLoading(false); }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 700 }}>
        <Link href="/interviews" className="btn btn-ghost" style={{ marginBottom:28, paddingLeft:0 }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="15,18 9,12 15,6"/></svg>
          Back to Interviews
        </Link>

        <div className="anim-fade-up">
          <h1 style={{ fontSize:28, fontWeight:800, color:"var(--text)", letterSpacing:-0.5, marginBottom:6 }}>New Interview</h1>
          <p style={{ fontSize:14, color:"var(--text-3)", marginBottom:36 }}>Fill in the details — Groq will generate tailored questions automatically.</p>
        </div>

        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:24 }}>
          {/* Title */}
          <div className="anim-fade-up-delay-1">
            <label className="label" style={{ display:"block", marginBottom:8 }}>Interview Title *</label>
            <input className="input" placeholder="e.g. Frontend Engineer — Q2 Hiring Round"
              value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required/>
          </div>

          {/* Job Role */}
          <div className="anim-fade-up-delay-1">
            <label className="label" style={{ display:"block", marginBottom:8 }}>Job Role *</label>
            <input className="input" placeholder="e.g. Senior Frontend Engineer"
              value={form.jobRole} onChange={e=>setForm(f=>({...f,jobRole:e.target.value}))} required/>
          </div>

          <div className="anim-fade-up-delay-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="label" style={{ display:"block", marginBottom:8 }}>Candidate Name (optional)</label>
              <input className="input" placeholder="e.g. Priya Sharma"
                value={form.candidateName} onChange={e=>setForm(f=>({...f,candidateName:e.target.value}))}/>
            </div>
            <div>
              <label className="label" style={{ display:"block", marginBottom:8 }}>Candidate Email (optional)</label>
              <input className="input" type="email" placeholder="candidate@email.com"
                value={form.candidateEmail} onChange={e=>setForm(f=>({...f,candidateEmail:e.target.value}))}/>
            </div>
          </div>

          {/* Level */}
          <div className="anim-fade-up-delay-2">
            <label className="label" style={{ display:"block", marginBottom:10 }}>Experience Level</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {LEVELS.map(l=>(
                <button key={l} type="button"
                  onClick={()=>setForm(f=>({...f,level:l}))}
                  style={{
                    padding:"9px 18px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", transition:"all 0.2s", fontFamily:"inherit",
                    ...(form.level===l
                      ? { background:"var(--brand-dim)", border:"1px solid var(--brand-glow)", color:"var(--brand)" }
                      : { background:"var(--surface)", border:"1px solid var(--border)", color:"var(--text-3)" }
                    )
                  }}
                >{l}</button>
              ))}
            </div>
          </div>

          {/* Job Description */}
          <div className="anim-fade-up-delay-2">
            <label className="label" style={{ display:"block", marginBottom:8 }}>Job Description</label>
            <textarea className="input" rows={6}
              placeholder="Paste the full job description here. The more detail you provide, the more tailored and relevant your interview questions will be…"
              value={form.jobDescription} onChange={e=>setForm(f=>({...f,jobDescription:e.target.value}))}/>
            <p style={{ fontSize:11, color:"var(--text-4)", marginTop:6 }}>Optional — strongly recommended for best question quality</p>
          </div>

          {/* Tech Stack */}
          <div className="anim-fade-up-delay-3">
            <label className="label" style={{ display:"block", marginBottom:10 }}>Tech Stack</label>
            {form.techStack.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
                {form.techStack.map(t=>(
                  <span key={t} style={{
                    display:"inline-flex", alignItems:"center", gap:6,
                    padding:"5px 12px", borderRadius:8, fontSize:13, fontWeight:600,
                    background:"var(--brand-dim)", border:"1px solid var(--brand-glow)", color:"var(--brand)",
                  }}>
                    {t}
                    <button type="button" onClick={()=>removeTech(t)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(0,212,170,0.6)", lineHeight:1, fontSize:14, fontWeight:400 }}>×</button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display:"flex", gap:8 }}>
              <input className="input" placeholder="Type a technology and press Enter"
                value={techInput}
                onChange={e=>setTechInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addTech(techInput);}}}
                style={{ flex:1 }}
              />
              <button type="button" className="btn btn-outline" onClick={()=>addTech(techInput)}>Add</button>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:10 }}>
              {TECH_SUGGESTIONS.filter(t=>!form.techStack.includes(t)).map(t=>(
                <button key={t} type="button" onClick={()=>addTech(t)}
                  style={{ padding:"4px 10px", borderRadius:7, fontSize:12, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s", background:"var(--surface)", border:"1px solid var(--border)", color:"var(--text-4)" }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color="var(--text-2)";(e.currentTarget as HTMLElement).style.borderColor="var(--border-hover)";}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color="var(--text-4)";(e.currentTarget as HTMLElement).style.borderColor="var(--border)";}}
                >+ {t}</button>
              ))}
            </div>
          </div>

          {/* Num questions */}
          <div className="anim-fade-up-delay-3">
            <label className="label" style={{ display:"block", marginBottom:10 }}>Number of Questions</label>
            <div style={{ display:"flex", gap:8 }}>
              {Q_COUNTS.map(n=>(
                <button key={n} type="button" onClick={()=>setForm(f=>({...f,numQuestions:n}))}
                  style={{
                    width:60, padding:"10px 0", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s",
                    ...(form.numQuestions===n
                      ? { background:"var(--brand-dim)", border:"1px solid var(--brand-glow)", color:"var(--brand)" }
                      : { background:"var(--surface)", border:"1px solid var(--border)", color:"var(--text-3)" }
                    )
                  }}
                >{n}</button>
              ))}
            </div>
          </div>

          <div className="anim-fade-up-delay-4">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <label className="label">Custom Hiring Stages</label>
              <button type="button" className="btn btn-outline" onClick={addStage} style={{ padding: "6px 10px" }}>+ Add Stage</button>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {form.stages.map((stage, idx) => (
                <div key={stage.id} className="card" style={{ padding: 10, display: "grid", gridTemplateColumns: "1.4fr 0.8fr auto", gap: 8, alignItems: "center" }}>
                  <input
                    className="input"
                    value={stage.name}
                    onChange={e => updateStage(idx, "name", e.target.value)}
                    placeholder="Stage name"
                  />
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={stage.passingScore}
                    onChange={e => updateStage(idx, "passingScore", e.target.value)}
                    title="Passing score out of 10"
                  />
                  <button type="button" className="btn btn-danger" onClick={() => removeStage(idx)} disabled={form.stages.length <= 1}>Remove</button>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--text-4)", marginTop: 8 }}>
              If candidate score is below stage passing score, the candidate is auto-rejected at that stage.
            </p>
          </div>

          {/* Submit */}
          <div className="anim-fade-up-delay-4" style={{ paddingTop:8, borderTop:"1px solid var(--border)" }}>
            <button type="submit" className="btn btn-brand" disabled={loading}
              style={{ width:"100%", justifyContent:"center", padding:"14px", fontSize:15 }}>
              {loading
                ? <><div className="spinner" style={{ width:16,height:16,border:"2px solid rgba(5,18,15,0.3)",borderTop:"2px solid #05120F",borderRadius:"50%" }}/> Creating…</>
                : <><svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Create Interview</>
              }
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
