import { useState, useEffect, useRef, useCallback } from "react";

// ─── Design Tokens ──────────────────────────────────────────────────────────────
const C = {
  bg: "#07080C", bg2: "#0C0E15", bg3: "#11141E",
  brand: "#00D4AA", brandDim: "rgba(0,212,170,0.12)", brandGlow: "rgba(0,212,170,0.25)",
  brandDark: "#00A887",
  surface: "rgba(255,255,255,0.04)", surfaceHover: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.07)", borderHover: "rgba(255,255,255,0.12)",
  text: "#F1F2F6", text2: "rgba(241,242,246,0.6)", text3: "rgba(241,242,246,0.35)", text4: "rgba(241,242,246,0.2)",
};

const DIFF = {
  Easy:   { color: "#00D4AA", bg: "rgba(0,212,170,0.1)",   border: "rgba(0,212,170,0.22)"   },
  Medium: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.22)"  },
  Hard:   { color: "#F87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.22)" },
};
const LEVEL_COLOR = { Junior:"#00D4AA", "Mid-level":"#4F9EFF", Senior:"#A78BFA", Lead:"#F59E0B", Principal:"#F87171" };
const REC_STYLE = {
  "Strong Hire": { color:"#00D4AA", bg:"rgba(0,212,170,0.1)",   border:"rgba(0,212,170,0.25)"   },
  "Hire":        { color:"#4F9EFF", bg:"rgba(79,158,255,0.1)",  border:"rgba(79,158,255,0.25)"  },
  "Maybe":       { color:"#F59E0B", bg:"rgba(245,158,11,0.1)",  border:"rgba(245,158,11,0.25)"  },
  "No Hire":     { color:"#F87171", bg:"rgba(248,113,113,0.1)", border:"rgba(248,113,113,0.25)" },
};
const DIST_COLORS = ["#F87171","#F59E0B","#4F9EFF","#00D4AA"];

const scoreColor = (s) => s >= 8 ? "#00D4AA" : s >= 6 ? "#4F9EFF" : s >= 4 ? "#F59E0B" : "#F87171";
const fmtTimer = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
const fmtDate = (d) => new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
const fmtDur = (s) => !s ? "—" : `${Math.floor(s/60)}m ${s%60}s`;
const uuid = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36);

// ─── Shared Styles ──────────────────────────────────────────────────────────────
const card = { background: C.surface, border:`1px solid ${C.border}`, borderRadius:16, transition:"all 0.2s" };
const btn = (variant="brand") => ({
  display:"inline-flex", alignItems:"center", gap:8, padding:"10px 20px",
  borderRadius:12, fontFamily:"inherit", fontWeight:700, fontSize:14, cursor:"pointer",
  border:"none", transition:"all 0.2s",
  ...(variant==="brand"
    ? { background:C.brand, color:"#05120F", boxShadow:`0 0 24px ${C.brandGlow}` }
    : variant==="outline"
    ? { background:C.surface, border:`1px solid ${C.border}`, color:C.text2 }
    : variant==="ghost"
    ? { background:"transparent", color:C.text3, border:"none" }
    : variant==="danger"
    ? { background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.2)", color:"#F87171" }
    : {}
  ),
});
const input = {
  width:"100%", padding:"12px 16px", background:C.surface, border:`1px solid ${C.border}`,
  borderRadius:12, color:C.text, fontFamily:"inherit", fontSize:14, outline:"none",
};

// ─── Global CSS ─────────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');
    * { box-sizing: border-box; margin:0; padding:0; }
    body { background: #07080C; color: #F1F2F6; font-family: 'Plus Jakarta Sans', sans-serif; }
    ::selection { background: rgba(0,212,170,0.2); }
    ::-webkit-scrollbar { width:4px; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius:2px; }
    textarea { font-family: inherit; resize: vertical; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes spin { to{transform:rotate(360deg)} }
    @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
    .fade-up { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
    .spin { animation: spin 0.7s linear infinite; }
    .pulse-dot { animation: pulseDot 2s infinite; }
    a { text-decoration: none; }
    button:disabled { opacity:0.45; cursor:not-allowed; }
  `}</style>
);

// ─── AI Call (Anthropic API) ────────────────────────────────────────────────────
async function callAI(prompt, systemPrompt = "") {
  const messages = [{ role:"user", content: prompt }];
  const body = { model:"claude-sonnet-4-20250514", max_tokens:1800, messages };
  if (systemPrompt) body.system = systemPrompt;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify(body),
  });
  const data = await res.json();
  const raw = data.content?.[0]?.text || "{}";
  const clean = raw.replace(/```json|```/g,"").trim();
  return JSON.parse(clean);
}

async function genQuestions(jobRole, jobDesc, level, techStack, num) {
  return callAI(
    `Create exactly ${num} interview questions for a ${level} ${jobRole}.
Job Description: ${jobDesc || "Not provided"}
Tech Stack: ${techStack.join(", ") || "General"}

Return ONLY valid JSON — no markdown:
{
  "questions": [
    {
      "id": "q1", "question": "...",
      "category": "Technical|Behavioral|System Design|Problem Solving",
      "difficulty": "Easy|Medium|Hard",
      "expectedDuration": 120,
      "hints": ["hint 1", "hint 2"],
      "idealAnswer": "Brief outline of ideal answer"
    }
  ]
}
Mix question types. Make questions specific to the role and tech stack.`,
    "You are an expert technical interviewer. Return ONLY valid JSON, no markdown, no explanation."
  ).then(d => (d.questions||[]).map((q,i)=>({...q,id:q.id||`q${i+1}`})));
}

async function evalAnswer(question, category, difficulty, idealAnswer, jobRole, level, answer) {
  return callAI(
    `Evaluate this interview answer for a ${level} ${jobRole}.
Question: ${question}
Category: ${category} | Difficulty: ${difficulty}
Ideal Answer: ${idealAnswer || "N/A"}
Candidate Answer: ${answer || "(No answer provided)"}

Return ONLY valid JSON:
{
  "score": <0-10>,
  "grade": "Excellent|Good|Fair|Needs Improvement",
  "strengths": ["point1", "point2"],
  "improvements": ["area1", "area2"],
  "feedback": "2-3 sentences of constructive feedback",
  "followUpQuestion": "follow-up question string or null"
}`,
    "You are an expert technical interviewer. Return ONLY valid JSON. Be fair and constructive."
  );
}

async function summarize(jobRole, level, scores, responses) {
  const avg = (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1);
  return callAI(
    `Summarize this ${level} ${jobRole} interview.
Scores: ${scores.join(", ")} /10 (Average: ${avg})
Grades: ${responses.map(r=>r.evaluation?.grade).join(", ")}

Return ONLY valid JSON:
{
  "summary": "3-4 sentences on overall performance",
  "recommendation": "Strong Hire|Hire|Maybe|No Hire",
  "topStrengths": ["strength1", "strength2"],
  "topImprovements": ["area1", "area2"]
}`,
    "You are an expert technical interviewer. Return ONLY valid JSON."
  );
}

// ─── Components ─────────────────────────────────────────────────────────────────

function Spinner({ size=18, color=C.brand }) {
  return <div className="spin" style={{ width:size, height:size, border:`2px solid ${color}30`, borderTop:`2px solid ${color}`, borderRadius:"50%", flexShrink:0 }}/>;
}

function Badge({ children, variant="gray", style:s={} }) {
  const variants = {
    brand: { background:C.brandDim, border:`1px solid ${C.brandGlow}`, color:C.brand },
    amber: { background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)", color:"#F59E0B" },
    blue:  { background:"rgba(79,158,255,0.1)", border:"1px solid rgba(79,158,255,0.25)", color:"#4F9EFF" },
    red:   { background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.25)", color:"#F87171" },
    gray:  { background:C.surface, border:`1px solid ${C.border}`, color:C.text3 },
    purple:{ background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.25)", color:"#A78BFA" },
  };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:700, letterSpacing:0.3, ...variants[variant], ...s }}>
      {children}
    </span>
  );
}

function Ring({ score, size=88 }) {
  const r = size/2-8, circ = 2*Math.PI*r;
  const c = scoreColor(score);
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={7}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={7}
          strokeDasharray={circ} strokeDashoffset={circ-(score/10)*circ} strokeLinecap="round"
          style={{ transition:"stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:size*0.27, fontWeight:900, color:c, lineHeight:1, fontFamily:"'JetBrains Mono',monospace" }}>{score}</span>
        <span style={{ fontSize:size*0.12, color:C.text4 }}>/10</span>
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────────
function Sidebar({ page, setPage }) {
  const nav = [
    { id:"dashboard", label:"Dashboard", icon:<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" fill="currentColor" rx="1"/> },
    { id:"interviews", label:"Interviews", icon:<><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></> },
    { id:"analytics", label:"Analytics", icon:<polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/> },
  ];
  return (
    <div style={{ position:"fixed", top:0, left:0, bottom:0, width:228, background:"rgba(7,8,12,0.97)", borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", padding:"24px 14px", zIndex:50 }}>
      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"4px 10px", marginBottom:28 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#00D4AA,#00A887)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 20px rgba(0,212,170,0.3)", flexShrink:0 }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#05120F" strokeWidth={2.5}>
            <path strokeLinecap="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight:800, fontSize:15, color:C.text, letterSpacing:-0.3 }}>Cogniview</div>
          <div style={{ fontSize:11, color:C.text3, marginTop:1 }}>AI Interviews</div>
        </div>
      </div>

      {/* New Interview */}
      <button onClick={()=>setPage("new")} style={{ ...btn("ghost"), justifyContent:"flex-start", marginBottom:20, padding:"10px 14px", background:C.brandDim, border:`1px solid ${C.brandGlow}`, color:C.brand, fontWeight:700, fontSize:13, borderRadius:12, width:"100%" }}>
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Interview
      </button>

      {/* Nav */}
      <nav style={{ display:"flex", flexDirection:"column", gap:4 }}>
        {nav.map(({ id, label, icon }) => {
          const active = page===id || (id==="interviews" && ["interviews","detail","new","session","results"].includes(page));
          return (
            <button key={id} onClick={()=>setPage(id)} style={{
              display:"flex", alignItems:"center", gap:10, padding:"9px 12px",
              borderRadius:10, fontSize:14, fontWeight:500, cursor:"pointer",
              border: active ? `1px solid ${C.border}` : "1px solid transparent",
              background: active ? C.surfaceHover : "transparent",
              color: active ? C.text : C.text3, fontFamily:"inherit", transition:"all 0.15s",
            }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: active ? C.brand : "inherit", flexShrink:0 }}>
                {icon}
              </svg>
              {label}
            </button>
          );
        })}
      </nav>

      <div style={{ flex:1 }}/>
      <div style={{ padding:"12px 10px", borderTop:`1px solid ${C.border}` }}>
        <div style={{ fontSize:11, color:C.text4 }}>Powered by <span style={{ color:C.brand, fontWeight:700 }}>GPT-4o</span></div>
        <div style={{ fontSize:11, color:C.text4, marginTop:2 }}>Cogniview v1.0</div>
      </div>
    </div>
  );
}

function AppLayout({ children }) {
  return (
    <div style={{ marginLeft:228, flex:1, padding:"44px 52px", minHeight:"100vh", maxWidth:"calc(100vw - 228px)" }}>
      {children}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────────
function Dashboard({ interviews, sessions, setPage, setCurrentId }) {
  const done = sessions.filter(s=>s.status==="completed");
  const avgScore = done.length ? Math.round(done.reduce((a,s)=>a+(s.overallScore||0),0)/done.length*10)/10 : 0;
  const dist = [
    { range:"0–4", count:done.filter(s=>(s.overallScore||0)<=4).length },
    { range:"5–6", count:done.filter(s=>{const x=s.overallScore||0;return x>=5&&x<=6;}).length },
    { range:"7–8", count:done.filter(s=>{const x=s.overallScore||0;return x>=7&&x<=8;}).length },
    { range:"9–10",count:done.filter(s=>(s.overallScore||0)>=9).length },
  ];
  const recent = done.slice(-5).reverse().map(s=>{
    const iv = interviews.find(i=>i.id===s.interviewId);
    return { ...s, title:iv?.title||"—", jobRole:iv?.jobRole||"—" };
  });

  const stats = [
    { label:"Interviews Created", value:interviews.length, color:"#A78BFA" },
    { label:"Sessions Completed", value:done.length, sub:`${sessions.length} started`, color:C.brand },
    { label:"Avg Score", value:avgScore?`${avgScore}/10`:"—", color:!avgScore?"#6B7280":avgScore>=7?C.brand:avgScore>=5?"#F59E0B":"#F87171" },
    { label:"Ready to Use", value:interviews.filter(i=>i.status==="ready").length, color:"#4F9EFF" },
  ];

  const distMax = Math.max(...dist.map(d=>d.count),1);

  return (
    <AppLayout>
      <div className="fade-up">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:36 }}>
          <div>
            <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>Dashboard</h1>
            <p style={{ fontSize:14, color:C.text3 }}>Your AI interview platform overview</p>
          </div>
          <button onClick={()=>setPage("new")} style={{ ...btn(), display:"inline-flex" }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Interview
          </button>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
          {stats.map(s=>(
            <div key={s.label} style={{ ...card, padding:"22px 24px", position:"relative", overflow:"hidden" }}>
              <div style={{ fontSize:34, fontWeight:900, color:s.color, letterSpacing:-0.5, marginBottom:4 }}>{s.value}</div>
              <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom: s.sub?2:0 }}>{s.label}</div>
              {s.sub && <div style={{ fontSize:11, color:C.text3 }}>{s.sub}</div>}
              <div style={{ position:"absolute", bottom:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${s.color},transparent)` }}/>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:22 }}>
          {/* Score dist */}
          <div style={{ ...card, padding:"20px 22px" }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:C.text3, marginBottom:14 }}>Score Distribution</div>
            {!done.length ? (
              <p style={{ fontSize:13, color:C.text4, paddingTop:20, textAlign:"center" }}>Complete sessions to see data</p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {dist.map((d,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:11, fontFamily:"monospace", color:C.text3, width:30, flexShrink:0 }}>{d.range}</span>
                    <div style={{ flex:1, height:8, background:C.surfaceHover, borderRadius:4, overflow:"hidden" }}>
                      <div style={{ width:`${(d.count/distMax)*100}%`, height:"100%", background:DIST_COLORS[i], borderRadius:4 }}/>
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color:DIST_COLORS[i], width:16, textAlign:"right" }}>{d.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div style={{ ...card, padding:"20px 22px" }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:C.text3, marginBottom:14 }}>Quick Actions</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { label:"Create Interview", pg:"new", icon:"+" },
                { label:"All Interviews", pg:"interviews", icon:"→" },
                { label:"View Analytics", pg:"analytics", icon:"↗" },
              ].map(a=>(
                <button key={a.pg} onClick={()=>setPage(a.pg)} style={{
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  padding:"11px 14px", borderRadius:10, background:C.surface, border:`1px solid ${C.border}`,
                  color:C.text2, fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
                }}>
                  {a.label}
                  <span style={{ color:C.brand, fontWeight:700 }}>{a.icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stats box */}
          <div style={{ ...card, padding:"20px 22px" }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:C.text3, marginBottom:14 }}>Platform Stats</div>
            {[
              { label:"Total Questions Generated", value: interviews.reduce((a,iv)=>a+iv.questions.length,0) },
              { label:"Total Sessions Started", value: sessions.length },
              { label:"Draft Interviews", value: interviews.filter(i=>i.status==="draft").length },
              { label:"Ready Interviews", value: interviews.filter(i=>i.status==="ready").length },
            ].map(s=>(
              <div key={s.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:13, color:C.text3 }}>{s.label}</span>
                <span style={{ fontSize:14, fontWeight:700, color:C.text }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent sessions */}
        <div style={{ ...card, padding:"22px 24px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:C.text3 }}>Recent Sessions</div>
            <button onClick={()=>setPage("analytics")} style={{ fontSize:12, color:C.brand, fontWeight:600, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>View all →</button>
          </div>
          {!recent.length ? (
            <div style={{ textAlign:"center", padding:"40px 0" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🎯</div>
              <p style={{ fontWeight:700, color:C.text, marginBottom:6 }}>No completed sessions yet</p>
              <p style={{ fontSize:13, color:C.text3, marginBottom:20 }}>Create an interview, generate questions, and start practicing.</p>
              <button onClick={()=>setPage("new")} style={{ ...btn(), display:"inline-flex" }}>Create First Interview</button>
            </div>
          ) : recent.map((s,i) => {
            const rs = s.feedback?.recommendation ? REC_STYLE[s.feedback.recommendation] : null;
            const sc = scoreColor(s.overallScore||0);
            return (
              <div key={s.id} onClick={()=>{ setCurrentId(s.interviewId); setPage("detail"); }} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 0", borderBottom: i<recent.length-1?`1px solid ${C.border}`:"none", cursor:"pointer" }}>
                <div style={{ width:44,height:44,borderRadius:"50%",background:`${sc}14`,border:`2px solid ${sc}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:sc,flexShrink:0 }}>{s.overallScore||"-"}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:2 }}>{s.title}</div>
                  <div style={{ fontSize:12, color:C.text3 }}>{s.jobRole} · {fmtDate(s.startedAt)} · {fmtDur(s.duration)}</div>
                </div>
                {rs && <span style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:8, background:rs.bg, border:`1px solid ${rs.border}`, color:rs.color, flexShrink:0 }}>{s.feedback.recommendation}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

// ─── Interviews List ──────────────────────────────────────────────────────────────
function InterviewsList({ interviews, setInterviews, setSessions, sessions, setPage, setCurrentId }) {
  const del = (id) => {
    if (!confirm("Delete this interview?")) return;
    setInterviews(prev=>prev.filter(i=>i.id!==id));
    setSessions(prev=>prev.filter(s=>s.interviewId!==id));
  };

  return (
    <AppLayout>
      <div className="fade-up">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:32 }}>
          <div>
            <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>Interviews</h1>
            <p style={{ fontSize:14, color:C.text3 }}>{interviews.length} interview{interviews.length!==1?"s":""} created</p>
          </div>
          <button onClick={()=>setPage("new")} style={{ ...btn(), display:"inline-flex" }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Interview
          </button>
        </div>

        {!interviews.length ? (
          <div style={{ ...card, padding:"80px 40px", textAlign:"center" }}>
            <div style={{ fontSize:56, marginBottom:16 }}>📋</div>
            <h2 style={{ fontSize:20, fontWeight:800, marginBottom:8 }}>No interviews yet</h2>
            <p style={{ fontSize:14, color:C.text3, marginBottom:24 }}>Create your first AI-powered interview in seconds.</p>
            <button onClick={()=>setPage("new")} style={{ ...btn(), display:"inline-flex" }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create Interview
            </button>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {interviews.map((iv,i) => {
              const lc = LEVEL_COLOR[iv.level]||"#6B7280";
              return (
                <div key={iv.id} onClick={()=>{ setCurrentId(iv.id); setPage("detail"); }}
                  style={{ ...card, padding:"18px 22px", cursor:"pointer", transition:"all 0.2s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.background=C.surfaceHover; e.currentTarget.style.borderColor=C.borderHover; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background=C.surface; e.currentTarget.style.borderColor=C.border; }}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:iv.status==="ready"?C.brand:"#F59E0B", flexShrink:0, boxShadow:iv.status==="ready"?`0 0 8px ${C.brandGlow}`:"none" }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                        <span style={{ fontSize:15, fontWeight:700, color:C.text }}>{iv.title}</span>
                        <Badge variant={iv.status==="ready"?"brand":"amber"}>{iv.status}</Badge>
                        <Badge style={{ background:`${lc}14`, border:`1px solid ${lc}28`, color:lc }}>{iv.level}</Badge>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                        <span style={{ fontSize:13, color:C.text3 }}>{iv.jobRole}</span>
                        {iv.techStack.slice(0,4).map(t=><Badge key={t}>{t}</Badge>)}
                        {iv.techStack.length>4 && <Badge>+{iv.techStack.length-4}</Badge>}
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                      <div style={{ textAlign:"right" }}>
                        <p style={{ fontSize:12, color:C.text3 }}>{iv.questions.length} questions · {iv.completedSessions} sessions</p>
                        <p style={{ fontSize:11, color:C.text4, marginTop:2 }}>{fmtDate(iv.createdAt)}</p>
                      </div>
                      {iv.lastSessionScore !== undefined && (
                        <div style={{ width:46, height:46, borderRadius:12, background:C.surfaceHover, border:`1px solid ${C.border}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                          <span style={{ fontSize:16, fontWeight:800, color:scoreColor(iv.lastSessionScore), lineHeight:1 }}>{iv.lastSessionScore}</span>
                          <span style={{ fontSize:9, color:C.text4 }}>/10</span>
                        </div>
                      )}
                      <button onClick={e=>{ e.stopPropagation(); del(iv.id); }} style={{ ...btn("danger"), padding:"8px 10px", borderRadius:10 }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M10,11v6M14,11v6"/><path d="M9,6V4h6v2"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// ─── New Interview ────────────────────────────────────────────────────────────────
const LEVELS = ["Junior","Mid-level","Senior","Lead","Principal"];
const Q_COUNTS = [3,5,7,10];
const TECH_SUGGESTIONS = ["React","TypeScript","Node.js","Python","AWS","Docker","PostgreSQL","GraphQL","Kubernetes","Go","Java","Next.js","Vue.js","MongoDB","Redis","Terraform"];

function NewInterview({ setInterviews, setPage, setCurrentId }) {
  const [loading, setLoading] = useState(false);
  const [techInput, setTechInput] = useState("");
  const [form, setForm] = useState({ title:"", jobRole:"", jobDescription:"", level:"Mid-level", techStack:[], numQuestions:5 });

  const addTech = (t) => {
    const v = t.trim();
    if (v && !form.techStack.includes(v)) setForm(f=>({...f, techStack:[...f.techStack,v]}));
    setTechInput("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.jobRole.trim()) { alert("Title and job role required"); return; }
    setLoading(true);
    const iv = { id:uuid(), ...form, questions:[], status:"draft", createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), completedSessions:0 };
    setInterviews(prev=>[iv,...prev]);
    setCurrentId(iv.id);
    setPage("detail");
    setLoading(false);
  };

  return (
    <AppLayout>
      <div style={{ maxWidth:700 }} className="fade-up">
        <button onClick={()=>setPage("interviews")} style={{ ...btn("ghost"), marginBottom:28, paddingLeft:0 }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="15,18 9,12 15,6"/></svg>
          Back to Interviews
        </button>
        <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:-0.5, marginBottom:6 }}>New Interview</h1>
        <p style={{ fontSize:14, color:C.text3, marginBottom:36 }}>Fill in the details — GPT-4o will generate tailored questions automatically.</p>

        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:24 }}>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:C.text3, marginBottom:8 }}>Interview Title *</label>
            <input style={input} placeholder="e.g. Frontend Engineer — Q2 Hiring Round" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required/>
          </div>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:C.text3, marginBottom:8 }}>Job Role *</label>
            <input style={input} placeholder="e.g. Senior Frontend Engineer" value={form.jobRole} onChange={e=>setForm(f=>({...f,jobRole:e.target.value}))} required/>
          </div>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:C.text3, marginBottom:10 }}>Experience Level</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {LEVELS.map(l=>(
                <button key={l} type="button" onClick={()=>setForm(f=>({...f,level:l}))} style={{ padding:"9px 18px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s", ...(form.level===l ? { background:C.brandDim, border:`1px solid ${C.brandGlow}`, color:C.brand } : { background:C.surface, border:`1px solid ${C.border}`, color:C.text3 }) }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:C.text3, marginBottom:8 }}>Job Description</label>
            <textarea style={{ ...input, height:140 }} placeholder="Paste the full job description here. The more detail you provide, the better the AI questions will be…" value={form.jobDescription} onChange={e=>setForm(f=>({...f,jobDescription:e.target.value}))}/>
            <p style={{ fontSize:11, color:C.text4, marginTop:6 }}>Optional — strongly recommended</p>
          </div>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:C.text3, marginBottom:10 }}>Tech Stack</label>
            {form.techStack.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:10 }}>
                {form.techStack.map(t=>(
                  <span key={t} style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:8, fontSize:13, fontWeight:600, background:C.brandDim, border:`1px solid ${C.brandGlow}`, color:C.brand }}>
                    {t}
                    <button type="button" onClick={()=>setForm(f=>({...f,techStack:f.techStack.filter(x=>x!==t)}))} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(0,212,170,0.6)", fontSize:16, lineHeight:1 }}>×</button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display:"flex", gap:8 }}>
              <input style={{ ...input, flex:1 }} placeholder="Type a technology and press Enter" value={techInput} onChange={e=>setTechInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"){e.preventDefault();addTech(techInput);} }}/>
              <button type="button" onClick={()=>addTech(techInput)} style={{ ...btn("outline"), flexShrink:0 }}>Add</button>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:10 }}>
              {TECH_SUGGESTIONS.filter(t=>!form.techStack.includes(t)).map(t=>(
                <button key={t} type="button" onClick={()=>addTech(t)} style={{ padding:"4px 10px", borderRadius:7, fontSize:12, cursor:"pointer", fontFamily:"inherit", background:C.surface, border:`1px solid ${C.border}`, color:C.text4, transition:"all 0.15s" }}>+ {t}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:C.text3, marginBottom:10 }}>Number of Questions</label>
            <div style={{ display:"flex", gap:8 }}>
              {Q_COUNTS.map(n=>(
                <button key={n} type="button" onClick={()=>setForm(f=>({...f,numQuestions:n}))} style={{ width:60, padding:"10px 0", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s", ...(form.numQuestions===n ? { background:C.brandDim, border:`1px solid ${C.brandGlow}`, color:C.brand } : { background:C.surface, border:`1px solid ${C.border}`, color:C.text3 }) }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div style={{ paddingTop:8, borderTop:`1px solid ${C.border}` }}>
            <button type="submit" disabled={loading} style={{ ...btn(), width:"100%", justifyContent:"center", padding:"14px", fontSize:15 }}>
              {loading ? <Spinner color="#05120F"/> : <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
              {loading ? "Creating…" : "Create Interview"}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

// ─── Interview Detail ─────────────────────────────────────────────────────────────
function InterviewDetail({ interviews, setInterviews, sessions, setSessions, currentId, setPage, setCurrentSessionId }) {
  const iv = interviews.find(i=>i.id===currentId);
  const [generating, setGenerating] = useState(false);
  const [openQ, setOpenQ] = useState(null);
  const [starting, setStarting] = useState(false);

  if (!iv) return <AppLayout><p style={{ color:"#F87171" }}>Interview not found.</p></AppLayout>;

  const generate = async () => {
    setGenerating(true);
    try {
      const questions = await genQuestions(iv.jobRole, iv.jobDescription, iv.level, iv.techStack, iv.numQuestions);
      setInterviews(prev=>prev.map(i=>i.id===currentId?{...i,questions,status:"ready"}:i));
    } catch(e) { alert("AI generation failed. Check browser console."); }
    finally { setGenerating(false); }
  };

  const startSession = () => {
    if (!iv.questions.length) return;
    setStarting(true);
    const s = { id:uuid(), interviewId:iv.id, status:"in_progress", currentQuestionIndex:0, totalQuestions:iv.questions.length, responses:[], scores:[], overallScore:null, feedback:null, startedAt:new Date().toISOString(), endedAt:null, duration:null };
    setSessions(prev=>[...prev,s]);
    setCurrentSessionId(s.id);
    setPage("session");
    setStarting(false);
  };

  const hasQ = iv.questions.length > 0;
  const DIFF_ST = (d) => DIFF[d] || DIFF.Medium;

  return (
    <AppLayout>
      <button onClick={()=>setPage("interviews")} style={{ ...btn("ghost"), marginBottom:24, paddingLeft:0 }}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="15,18 9,12 15,6"/></svg>
        All Interviews
      </button>

      <div style={{ ...card, padding:"26px 28px", marginBottom:18 }} className="fade-up">
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:20, marginBottom:20 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
              <Badge variant={iv.status==="ready"?"brand":"amber"}>
                <span style={{ width:5,height:5,borderRadius:"50%",background:"currentColor",display:"inline-block" }}/>{iv.status}
              </Badge>
              <Badge>{iv.level}</Badge>
              <Badge>{iv.numQuestions} questions</Badge>
              {iv.completedSessions>0 && <Badge variant="blue">{iv.completedSessions} sessions</Badge>}
            </div>
            <h1 style={{ fontSize:24, fontWeight:800, letterSpacing:-0.4, marginBottom:6 }}>{iv.title}</h1>
            <p style={{ fontSize:14, color:C.text3, marginBottom:10 }}>{iv.jobRole}</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {iv.techStack.map(t=><Badge key={t}>{t}</Badge>)}
            </div>
          </div>
          {iv.lastSessionScore !== undefined && (
            <div style={{ width:70,height:70,borderRadius:16,background:C.surfaceHover,border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <span style={{ fontSize:24, fontWeight:900, color:scoreColor(iv.lastSessionScore), lineHeight:1 }}>{iv.lastSessionScore}</span>
              <span style={{ fontSize:10, color:C.text4, marginTop:2 }}>last score</span>
            </div>
          )}
        </div>
        {iv.jobDescription && (
          <p style={{ fontSize:13, color:C.text3, lineHeight:1.65, marginBottom:20, maxHeight:64, overflow:"hidden" }}>
            {iv.jobDescription.slice(0,250)}{iv.jobDescription.length>250?"…":""}
          </p>
        )}
        <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:18, display:"flex", gap:10, flexWrap:"wrap" }}>
          <button onClick={generate} disabled={generating} style={{ ...btn("outline") }}>
            {generating ? <Spinner/> : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
            {generating ? "Generating…" : hasQ ? "Regenerate with AI" : "Generate Questions with AI"}
          </button>
          {hasQ && (
            <button onClick={startSession} disabled={starting} style={{ ...btn() }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polygon points="5,3 19,12 5,21 5,3"/></svg>
              Start Interview Session
            </button>
          )}
        </div>
      </div>

      {generating && (
        <div style={{ ...card, padding:"56px 40px", textAlign:"center", marginBottom:18 }}>
          <Spinner size={36} color={C.brand}/>
          <p style={{ fontSize:16, fontWeight:700, marginTop:20, marginBottom:6 }}>GPT-4o is crafting your questions…</p>
          <p style={{ fontSize:13, color:C.text3 }}>Analyzing the job description and generating tailored questions. Usually 10–20 seconds.</p>
        </div>
      )}

      {!generating && hasQ && (
        <div className="fade-up">
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:C.text3, marginBottom:12 }}>{iv.questions.length} Questions</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {iv.questions.map((q,i) => {
              const d = DIFF_ST(q.difficulty);
              const isOpen = openQ===i;
              return (
                <div key={q.id} style={{ ...card, overflow:"hidden" }}>
                  <button onClick={()=>setOpenQ(isOpen?null:i)} style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"16px 20px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
                    <div style={{ width:34,height:34,borderRadius:9,background:d.bg,border:`1px solid ${d.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:d.color,flexShrink:0 }}>{i+1}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:5, overflow:isOpen?"visible":"hidden", textOverflow:"ellipsis", whiteSpace:isOpen?"normal":"nowrap" }}>{q.question}</p>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <span style={{ fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:5,background:d.bg,border:`1px solid ${d.border}`,color:d.color }}>{q.difficulty}</span>
                        <span style={{ fontSize:12, color:C.text3 }}>{q.category}</span>
                        <span style={{ fontSize:11, color:C.text4 }}>~{Math.round((q.expectedDuration||120)/60)}m</span>
                      </div>
                    </div>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color:C.text4, transform:isOpen?"rotate(90deg)":"none", transition:"transform 0.2s", flexShrink:0 }}><polyline points="9,18 15,12 9,6"/></svg>
                  </button>
                  {isOpen && (
                    <div style={{ padding:"0 20px 18px", borderTop:`1px solid ${C.border}` }}>
                      {q.hints?.length > 0 && (
                        <div style={{ marginTop:14 }}>
                          <div style={{ fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:C.text3,marginBottom:8 }}>💡 Hints</div>
                          {q.hints.map((h,j)=><p key={j} style={{ fontSize:13,color:C.text2,marginBottom:4,paddingLeft:12,borderLeft:`2px solid ${C.brand}` }}>{h}</p>)}
                        </div>
                      )}
                      {q.idealAnswer && (
                        <div style={{ marginTop:14, padding:"12px 16px", borderRadius:10, background:"rgba(79,158,255,0.07)", border:"1px solid rgba(79,158,255,0.18)" }}>
                          <div style={{ fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:"#4F9EFF",marginBottom:8 }}>✦ Ideal Answer</div>
                          <p style={{ fontSize:13, color:C.text2, lineHeight:1.7 }}>{q.idealAnswer}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!generating && !hasQ && (
        <div style={{ ...card, padding:"64px 40px", textAlign:"center" }} className="fade-up">
          <div style={{ fontSize:52, marginBottom:14 }}>✨</div>
          <h3 style={{ fontSize:18, fontWeight:800, marginBottom:8 }}>No questions yet</h3>
          <p style={{ fontSize:14, color:C.text3 }}>Click "Generate Questions with AI" to let GPT-4o create perfectly tailored questions.</p>
        </div>
      )}
    </AppLayout>
  );
}

// ─── Session Page ─────────────────────────────────────────────────────────────────
function SessionPage({ interviews, sessions, setSessions, setInterviews, currentSessionId, setPage }) {
  const session = sessions.find(s=>s.id===currentSessionId);
  const iv = interviews.find(i=>i.id===session?.interviewId);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [done, setDone] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [listening, setListening] = useState(false);
  const timerRef = useRef(null);
  const srRef = useRef(null);

  const curIdx = session?.currentQuestionIndex || 0;
  const curQ = iv?.questions[curIdx];

  useEffect(() => {
    if (!done && !submitting && curQ) {
      timerRef.current = setInterval(()=>setTimer(t=>t+1),1000);
    }
    return ()=>clearInterval(timerRef.current);
  },[done,submitting,curIdx]);

  useEffect(()=>{ if(session?.status==="completed") setDone(true); },[session]);

  const startMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice input not supported. Use Chrome or Edge."); return; }
    srRef.current = new SR();
    srRef.current.continuous = true; srRef.current.interimResults = true;
    srRef.current.onresult = (e) => setAnswer(Array.from(e.results).map(r=>r[0].transcript).join(""));
    srRef.current.onend = ()=>setListening(false);
    srRef.current.start(); setListening(true);
  };
  const stopMic = ()=>{ srRef.current?.stop(); setListening(false); };

  const submit = async () => {
    if (!curQ || submitting) return;
    if (listening) stopMic();
    clearInterval(timerRef.current);
    setSubmitting(true); setShowHint(false);
    try {
      const ev = await evalAnswer(curQ.question, curQ.category, curQ.difficulty, curQ.idealAnswer, iv.jobRole, iv.level, answer);
      const resp = { questionId:curQ.id, question:curQ.question, answer, evaluation:ev, answeredAt:new Date().toISOString() };

      const nextIdx = curIdx+1;
      const isComplete = nextIdx >= iv.questions.length;

      setSessions(prev=>prev.map(s=>{
        if (s.id!==currentSessionId) return s;
        return { ...s, responses:[...s.responses,resp], scores:[...s.scores,ev.score], currentQuestionIndex:nextIdx };
      }));

      setEvaluation(ev);

      if (isComplete) {
        const allScores = [...session.scores, ev.score];
        const avg = Math.round(allScores.reduce((a,b)=>a+b,0)/allScores.length*10)/10;
        const fb = await summarize(iv.jobRole, iv.level, allScores, [...session.responses, resp]);
        setSessions(prev=>prev.map(s=>{
          if (s.id!==currentSessionId) return s;
          return { ...s, status:"completed", overallScore:avg, feedback:fb, endedAt:new Date().toISOString(), duration:Math.round((Date.now()-new Date(s.startedAt).getTime())/1000) };
        }));
        setInterviews(prev=>prev.map(i=>{
          if (i.id!==iv.id) return i;
          return { ...i, completedSessions:i.completedSessions+1, lastSessionScore:avg };
        }));
        setDone(true);
      } else {
        setTimeout(()=>{ setAnswer(""); setEvaluation(null); setSubmitting(false); setTimer(0); },4200);
      }
    } catch(e) { alert("AI evaluation failed. Check console."); setSubmitting(false); }
  };

  if (!session || !iv) return <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}><p style={{ color:"#F87171" }}>Session not found.</p></div>;

  // Results screen
  if (done && session.status==="completed") {
    const fb = session.feedback; const avg = session.overallScore||0;
    const rs = fb?.recommendation ? REC_STYLE[fb.recommendation] : REC_STYLE["Maybe"];
    return (
      <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
        <div style={{ maxWidth:740, margin:"0 auto", padding:"52px 24px" }}>
          <div style={{ textAlign:"center", marginBottom:44 }}>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:C.text3, marginBottom:12 }}>Interview Complete</p>
            <h1 style={{ fontSize:40, fontWeight:900, letterSpacing:-1, marginBottom:10 }}>Your Results</h1>
            <p style={{ fontSize:15, color:C.text3 }}>{session.totalQuestions} questions · {fmtDur(session.duration)}</p>
          </div>
          <div style={{ ...card, padding:"28px 32px", display:"flex", gap:28, alignItems:"center", marginBottom:18 }}>
            <Ring score={avg} size={100}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:30, fontWeight:900, marginBottom:10, letterSpacing:-0.5 }}>{avg}/10</div>
              <span style={{ display:"inline-block", fontSize:13, fontWeight:700, padding:"6px 16px", borderRadius:10, background:rs.bg, border:`1px solid ${rs.border}`, color:rs.color, marginBottom:14 }}>{fb?.recommendation}</span>
              <p style={{ fontSize:14, color:C.text2, lineHeight:1.7 }}>{fb?.summary}</p>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
            {[{title:"Top Strengths",items:fb?.topStrengths||[],c:"#00D4AA"},{title:"Areas to Improve",items:fb?.topImprovements||[],c:"#F59E0B"}].map(col=>(
              <div key={col.title} style={{ ...card, padding:"18px 20px" }}>
                <p style={{ fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:col.c,marginBottom:12 }}>{col.title}</p>
                {col.items.map((item,i)=>(
                  <div key={i} style={{ display:"flex", gap:9, marginBottom:8 }}>
                    <span style={{ color:col.c,flexShrink:0 }}>★</span>
                    <span style={{ fontSize:13, color:C.text2 }}>{item}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ ...card, padding:"18px 22px", marginBottom:28 }}>
            <p style={{ fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:C.text3,marginBottom:16 }}>Question Breakdown</p>
            {session.responses.map((r,i)=>{
              const c = scoreColor(r.evaluation?.score||0);
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"10px 0", borderBottom:i<session.responses.length-1?`1px solid ${C.border}`:"none" }}>
                  <div style={{ width:34,height:34,borderRadius:"50%",background:`${c}14`,border:`2px solid ${c}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:c,flexShrink:0 }}>{i+1}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2 }}>{r.question}</p>
                    <p style={{ fontSize:11, color:C.text4 }}>{r.evaluation?.grade}</p>
                  </div>
                  <span style={{ fontSize:16, fontWeight:900, color:c, flexShrink:0 }}>{r.evaluation?.score}/10</span>
                </div>
              );
            })}
          </div>
          <button onClick={()=>setPage("dashboard")} style={{ ...btn(), width:"100%", justifyContent:"center", padding:"15px", fontSize:15 }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Live session
  const pct = session.totalQuestions > 0 ? (curIdx/session.totalQuestions)*100 : 0;
  const timerOver = timer > (curQ?.expectedDuration||180);
  const dStyle = curQ ? (DIFF[curQ.difficulty]||DIFF.Medium) : DIFF.Medium;

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(155deg,#07080C 0%,#0C0F18 55%,#080C12 100%)", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ maxWidth:820, margin:"0 auto", padding:"38px 24px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:26 }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div className="pulse-dot" style={{ width:8,height:8,borderRadius:"50%",background:submitting?"#F59E0B":C.brand,boxShadow:submitting?"0 0 8px rgba(245,158,11,0.5)":`0 0 10px ${C.brandGlow}` }}/>
            <span style={{ fontSize:13,color:C.text3,fontWeight:500 }}>{submitting?"AI Evaluating…":"Live Interview"}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:22 }}>
            <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:22,fontWeight:700,color:timerOver?"#F87171":C.text2,letterSpacing:1 }}>{fmtTimer(timer)}</span>
            <span style={{ fontSize:13,color:C.text4 }}>{curIdx+1} / {session.totalQuestions}</span>
          </div>
        </div>

        <div style={{ height:2,background:C.surfaceHover,borderRadius:1,marginBottom:32 }}>
          <div style={{ height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#00D4AA,#00A887)",borderRadius:1,transition:"width 0.6s ease" }}/>
        </div>

        {curQ && !submitting && (
          <div className="fade-up" style={{ background:"rgba(255,255,255,0.035)",border:`1px solid rgba(255,255,255,0.08)`,borderRadius:18,padding:"24px 26px",marginBottom:16 }}>
            <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:14,flexWrap:"wrap" }}>
              <span style={{ fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:6,background:dStyle.bg,border:`1px solid ${dStyle.border}`,color:dStyle.color,letterSpacing:0.3 }}>{curQ.difficulty?.toUpperCase()}</span>
              <span style={{ fontSize:11,color:C.text3,padding:"3px 10px",borderRadius:6,background:"rgba(255,255,255,0.05)" }}>{curQ.category}</span>
              <span style={{ fontSize:11,color:C.text4,marginLeft:"auto" }}>~{Math.round((curQ.expectedDuration||120)/60)} min</span>
            </div>
            <p style={{ fontSize:20,fontWeight:700,color:C.text,lineHeight:1.5,letterSpacing:-0.2 }}>{curQ.question}</p>
            {curQ.hints?.length > 0 && (
              <div style={{ marginTop:14 }}>
                <button onClick={()=>setShowHint(h=>!h)} style={{ background:"none",border:"1px solid rgba(167,139,250,0.3)",color:"#A78BFA",borderRadius:8,padding:"5px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600 }}>
                  💡 {showHint?"Hide Hints":"Show Hints"}
                </button>
                {showHint && (
                  <div style={{ marginTop:10,padding:"12px 14px",background:"rgba(167,139,250,0.07)",borderRadius:10 }}>
                    {curQ.hints.map((h,i)=><p key={i} style={{ fontSize:13,color:C.text2,marginBottom:4,paddingLeft:12,borderLeft:"2px solid #A78BFA" }}>{h}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {evaluation && submitting && (
          <div className="fade-up" style={{ background:"rgba(255,255,255,0.03)",border:`1px solid ${scoreColor(evaluation.score)}22`,borderRadius:16,padding:"20px 22px",marginBottom:16 }}>
            <div style={{ display:"flex",gap:20,alignItems:"center",marginBottom:16 }}>
              <Ring score={evaluation.score}/>
              <div style={{ flex:1 }}>
                <span style={{ display:"inline-block",fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:8,background:`${scoreColor(evaluation.score)}15`,border:`1px solid ${scoreColor(evaluation.score)}30`,color:scoreColor(evaluation.score),marginBottom:8 }}>{evaluation.grade}</span>
                <p style={{ fontSize:14,color:C.text2,lineHeight:1.65 }}>{evaluation.feedback}</p>
              </div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
              {[{label:"Strengths",items:evaluation.strengths,c:"#00D4AA"},{label:"Improve",items:evaluation.improvements,c:"#F59E0B"}].map(col=>(
                <div key={col.label}>
                  <p style={{ fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:col.c,marginBottom:8 }}>{col.label}</p>
                  {col.items.map((s,i)=>(<div key={i} style={{ display:"flex",gap:8,marginBottom:6 }}><span style={{ color:col.c,fontSize:13 }}>{col.label==="Strengths"?"✓":"→"}</span><span style={{ fontSize:13,color:C.text2 }}>{s}</span></div>))}
                </div>
              ))}
            </div>
            {evaluation.followUpQuestion && (
              <div style={{ marginTop:14,padding:"12px 14px",borderRadius:10,background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.2)" }}>
                <p style={{ fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:"#A78BFA",marginBottom:6 }}>Follow-up Probe</p>
                <p style={{ fontSize:13,color:C.text2 }}>{evaluation.followUpQuestion}</p>
              </div>
            )}
          </div>
        )}

        {!submitting && (
          <div className="fade-up">
            <textarea value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Type your answer here… or click Voice Input to speak" rows={8}
              style={{ ...input, borderRadius:14, lineHeight:1.7, border:"1px solid rgba(255,255,255,0.09)", background:"rgba(255,255,255,0.035)" }}
              onFocus={e=>e.target.style.borderColor="rgba(0,212,170,0.4)"}
              onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.09)"}
            />
            <div style={{ display:"flex",gap:10,marginTop:10 }}>
              <button onClick={listening?stopMic:startMic} style={{ ...btn(listening?"danger":"outline") }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {listening ? <><rect x="4" y="4" width="16" height="16" rx="2"/></> : <><path d="M12 2a3 3 0 013 3v7a3 3 0 01-6 0V5a3 3 0 013-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>}
                </svg>
                {listening?"Stop Recording":"Voice Input"}
              </button>
              <button onClick={submit} disabled={!answer.trim()} style={{ ...btn(), flex:1, justifyContent:"center" }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9 22,2"/></svg>
                Submit Answer
              </button>
            </div>
          </div>
        )}
        {submitting && evaluation && <p style={{ textAlign:"center",fontSize:13,color:C.text4,paddingTop:12 }}>Next question loading in a moment…</p>}
      </div>
    </div>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────────
function Analytics({ interviews, sessions, setPage, setCurrentId }) {
  const done = sessions.filter(s=>s.status==="completed");
  const avgScore = done.length ? Math.round(done.reduce((a,s)=>a+(s.overallScore||0),0)/done.length*10)/10 : 0;
  const dist = [
    { range:"0–4", count:done.filter(s=>(s.overallScore||0)<=4).length },
    { range:"5–6", count:done.filter(s=>{const x=s.overallScore||0;return x>=5&&x<=6;}).length },
    { range:"7–8", count:done.filter(s=>{const x=s.overallScore||0;return x>=7&&x<=8;}).length },
    { range:"9–10",count:done.filter(s=>(s.overallScore||0)>=9).length },
  ];
  const distMax = Math.max(...dist.map(d=>d.count),1);
  const recent = done.slice(-8).reverse().map(s=>({...s, iv:interviews.find(i=>i.id===s.interviewId)}));

  const stats = [
    { label:"Total Interviews", value:interviews.length, color:"#A78BFA" },
    { label:"Completed Sessions", value:done.length, color:C.brand },
    { label:"Avg Score", value:avgScore?`${avgScore}/10`:"—", color:!avgScore?"#6B7280":avgScore>=7?C.brand:avgScore>=5?"#F59E0B":"#F87171" },
    { label:"Ready Interviews", value:interviews.filter(i=>i.status==="ready").length, color:"#4F9EFF" },
  ];

  return (
    <AppLayout>
      <div className="fade-up">
        <div style={{ marginBottom:32 }}>
          <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>Analytics</h1>
          <p style={{ fontSize:14, color:C.text3 }}>Interview performance metrics and trends</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
          {stats.map(s=>(
            <div key={s.label} style={{ ...card, padding:"20px 22px", position:"relative", overflow:"hidden" }}>
              <div style={{ fontSize:32, fontWeight:900, color:s.color, letterSpacing:-0.5, marginBottom:4 }}>{s.value}</div>
              <div style={{ fontSize:13, fontWeight:500, color:C.text2 }}>{s.label}</div>
              <div style={{ position:"absolute",bottom:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${s.color},transparent)` }}/>
            </div>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:22 }}>
          <div style={{ ...card, padding:"22px 24px" }}>
            <div style={{ fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:C.text3,marginBottom:14 }}>Score Distribution</div>
            {!done.length ? <p style={{ fontSize:13,color:C.text4,paddingTop:20,textAlign:"center" }}>Complete sessions to see data</p> : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {dist.map((d,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:11,fontFamily:"monospace",color:C.text3,width:30,flexShrink:0 }}>{d.range}</span>
                    <div style={{ flex:1,height:8,background:C.surfaceHover,borderRadius:4,overflow:"hidden" }}>
                      <div style={{ width:`${(d.count/distMax)*100}%`,height:"100%",background:DIST_COLORS[i],borderRadius:4,transition:"width 0.8s ease" }}/>
                    </div>
                    <span style={{ fontSize:12,fontWeight:700,color:DIST_COLORS[i],width:16,textAlign:"right" }}>{d.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ ...card, padding:"22px 24px" }}>
            <div style={{ fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:C.text3,marginBottom:14 }}>Summary</div>
            {[
              { label:"Total Questions Generated", value:interviews.reduce((a,i)=>a+i.questions.length,0) },
              { label:"Total Sessions Started", value:sessions.length },
              { label:"Completion Rate", value:sessions.length?`${Math.round(done.length/sessions.length*100)}%`:"—" },
              { label:"Highest Score", value:done.length?`${Math.max(...done.map(s=>s.overallScore||0))}/10`:"—" },
            ].map(s=>(
              <div key={s.label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:13,color:C.text3 }}>{s.label}</span>
                <span style={{ fontSize:14,fontWeight:700,color:C.text }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, padding:"22px 24px" }}>
          <div style={{ fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:C.text3,marginBottom:20 }}>Recent Sessions</div>
          {!recent.length ? (
            <div style={{ textAlign:"center", padding:"32px 0" }}>
              <p style={{ fontSize:14,color:C.text4,marginBottom:14 }}>No completed sessions yet.</p>
              <button onClick={()=>setPage("interviews")} style={{ ...btn(), display:"inline-flex" }}>Start an Interview</button>
            </div>
          ) : recent.map((s,i)=>{
            const rs = s.feedback?.recommendation ? REC_STYLE[s.feedback.recommendation] : null;
            const sc = scoreColor(s.overallScore||0);
            return (
              <div key={s.id} onClick={()=>{ setCurrentId(s.interviewId); setPage("detail"); }} style={{ display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:i<recent.length-1?`1px solid ${C.border}`:"none",cursor:"pointer" }}>
                <div style={{ width:42,height:42,borderRadius:"50%",background:`${sc}14`,border:`2px solid ${sc}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:sc,flexShrink:0 }}>{s.overallScore||"-"}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <p style={{ fontSize:14,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2 }}>{s.iv?.title||"—"}</p>
                  <p style={{ fontSize:12,color:C.text3 }}>{s.iv?.jobRole||"—"} · {fmtDate(s.startedAt)} · {fmtDur(s.duration)}</p>
                </div>
                {rs && <span style={{ fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:8,background:rs.bg,border:`1px solid ${rs.border}`,color:rs.color,flexShrink:0 }}>{s.feedback.recommendation}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [interviews, setInterviews] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // Session & Interview pages don't show sidebar
  const fullscreen = page === "session";

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text }}>
      <GlobalStyles/>
      {!fullscreen && <Sidebar page={page} setPage={setPage}/>}
      {page==="dashboard" && <Dashboard interviews={interviews} sessions={sessions} setPage={setPage} setCurrentId={setCurrentId}/>}
      {page==="interviews" && <InterviewsList interviews={interviews} setInterviews={setInterviews} sessions={sessions} setSessions={setSessions} setPage={setPage} setCurrentId={setCurrentId}/>}
      {page==="new" && <NewInterview setInterviews={setInterviews} setPage={setPage} setCurrentId={setCurrentId}/>}
      {page==="detail" && <InterviewDetail interviews={interviews} setInterviews={setInterviews} sessions={sessions} setSessions={setSessions} currentId={currentId} setPage={setPage} setCurrentSessionId={setCurrentSessionId}/>}
      {page==="session" && <SessionPage interviews={interviews} sessions={sessions} setSessions={setSessions} setInterviews={setInterviews} currentSessionId={currentSessionId} setPage={setPage}/>}
      {page==="analytics" && <Analytics interviews={interviews} sessions={sessions} setPage={setPage} setCurrentId={setCurrentId}/>}
    </div>
  );
}
