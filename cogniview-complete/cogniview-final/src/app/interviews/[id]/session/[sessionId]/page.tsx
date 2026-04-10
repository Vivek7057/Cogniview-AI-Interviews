"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Question, Evaluation, OverallFeedback, Session } from "@/types";
import { formatTimer, scoreColor, recStyle, formatDuration } from "@/lib/utils";
import { toast } from "sonner";

/* ─── Speech Recognition ──────────────────────────────────────────── */
function useSpeech(onResult: (t:string)=>void) {
  const ref = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const supported = typeof window!=="undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const start = useCallback(()=>{
    if (!supported) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    ref.current = new SR();
    ref.current.continuous = true; ref.current.interimResults = true; ref.current.lang = "en-US";
    ref.current.onresult = (e:any) => onResult(Array.from(e.results).map((r:any)=>r[0].transcript).join(""));
    ref.current.onend = ()=>setListening(false);
    ref.current.start(); setListening(true);
  },[supported,onResult]);

  const stop = useCallback(()=>{ ref.current?.stop(); setListening(false); },[]);
  return { listening, start, stop, supported };
}

/* ─── Score Ring ──────────────────────────────────────────────────── */
function Ring({ score, size=88 }:{score:number;size?:number}) {
  const r = size/2 - 8, circ = 2*Math.PI*r;
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
        <span style={{ fontSize:size*0.27, fontWeight:900, color:c, lineHeight:1 }}>{score}</span>
        <span style={{ fontSize:size*0.12, color:"var(--text-4)" }}>/10</span>
      </div>
    </div>
  );
}

/* ─── Eval Card ───────────────────────────────────────────────────── */
function EvalCard({ ev }:{ ev:Evaluation }) {
  const gc = ev.grade==="Excellent"?"#00D4AA":ev.grade==="Good"?"#4F9EFF":ev.grade==="Fair"?"#F59E0B":"#F87171";
  return (
    <div className="anim-fade-up" style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${gc}22`, borderRadius:16, padding:"20px 22px", marginBottom:16 }}>
      <div style={{ display:"flex", gap:20, alignItems:"center", marginBottom:16 }}>
        <Ring score={ev.score}/>
        <div style={{ flex:1 }}>
          <span style={{ display:"inline-block", fontSize:12, fontWeight:700, padding:"4px 12px", borderRadius:8, background:`${gc}15`, border:`1px solid ${gc}30`, color:gc, marginBottom:8 }}>{ev.grade}</span>
          <p style={{ fontSize:14, color:"var(--text-2)", lineHeight:1.65 }}>{ev.feedback}</p>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div>
          <p className="label" style={{ marginBottom:8, color:"#00D4AA" }}>Strengths</p>
          {ev.strengths.map((s,i)=>(
            <div key={i} style={{ display:"flex", gap:8, marginBottom:6 }}>
              <span style={{ color:"#00D4AA", fontSize:13 }}>✓</span>
              <span style={{ fontSize:13, color:"var(--text-2)" }}>{s}</span>
            </div>
          ))}
        </div>
        <div>
          <p className="label" style={{ marginBottom:8, color:"#F59E0B" }}>Improve</p>
          {ev.improvements.map((s,i)=>(
            <div key={i} style={{ display:"flex", gap:8, marginBottom:6 }}>
              <span style={{ color:"#F59E0B", fontSize:13 }}>→</span>
              <span style={{ fontSize:13, color:"var(--text-2)" }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
      {ev.followUpQuestion && (
        <div style={{ marginTop:14, padding:"12px 14px", borderRadius:10, background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.2)" }}>
          <p className="label" style={{ marginBottom:6, color:"#A78BFA" }}>Follow-up Probe</p>
          <p style={{ fontSize:13, color:"var(--text-2)" }}>{ev.followUpQuestion}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Results ─────────────────────────────────────────────────────── */
function Results({ session, fb, onBack }:{ session:Session; fb:OverallFeedback; onBack:()=>void }) {
  const rs = recStyle(fb.recommendation);
  const avg = session.overallScore??0;
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ maxWidth:740, margin:"0 auto", padding:"52px 24px" }}>
        <div style={{ textAlign:"center", marginBottom:44 }}>
          <p className="label" style={{ marginBottom:12 }}>Interview Complete</p>
          <h1 style={{ fontSize:40, fontWeight:900, letterSpacing:-1, marginBottom:10 }}>Your Results</h1>
          <p style={{ fontSize:15, color:"var(--text-3)" }}>{session.totalQuestions} questions · {formatDuration(session.duration)}</p>
        </div>

        {/* Score + recommendation */}
        <div className="card" style={{ padding:"28px 32px", display:"flex", gap:28, alignItems:"center", marginBottom:20 }}>
          <Ring score={avg} size={104}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:30, fontWeight:900, marginBottom:10, letterSpacing:-0.5 }}>{avg}/10</div>
            <span style={{ display:"inline-block", fontSize:13, fontWeight:700, padding:"6px 16px", borderRadius:10, background:rs.bg, border:`1px solid ${rs.border}`, color:rs.color, marginBottom:14 }}>
              {fb.recommendation}
            </span>
            <p style={{ fontSize:14, color:"var(--text-2)", lineHeight:1.7 }}>{fb.summary}</p>
          </div>
        </div>

        {/* Strengths + Improvements */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>
          {[
            { title:"Top Strengths", items:fb.topStrengths, c:"#00D4AA" },
            { title:"Areas to Improve", items:fb.topImprovements, c:"#F59E0B" },
          ].map(col=>(
            <div key={col.title} className="card" style={{ padding:"18px 20px", borderColor:`${col.c}18` }}>
              <p className="label" style={{ marginBottom:12, color:col.c }}>{col.title}</p>
              {col.items.map((item,i)=>(
                <div key={i} style={{ display:"flex", gap:9, marginBottom:8 }}>
                  <span style={{ color:col.c, flexShrink:0 }}>★</span>
                  <span style={{ fontSize:13, color:"var(--text-2)" }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Breakdown */}
        <div className="card" style={{ padding:"18px 22px", marginBottom:28 }}>
          <p className="label" style={{ marginBottom:16 }}>Question Breakdown</p>
          {session.responses.map((r,i)=>{
            const c = scoreColor(r.evaluation?.score??0);
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"10px 0", borderBottom: i<session.responses.length-1?"1px solid var(--border)":"none" }}>
                <div style={{ width:34,height:34,borderRadius:"50%", background:`${c}14`, border:`2px solid ${c}35`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:c, flexShrink:0 }}>{i+1}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:2 }}>{r.question}</p>
                  <p style={{ fontSize:11, color:"var(--text-4)" }}>{r.evaluation?.grade}</p>
                </div>
                <span style={{ fontSize:16, fontWeight:900, color:c, flexShrink:0 }}>{r.evaluation?.score}/10</span>
              </div>
            );
          })}
        </div>

        <button onClick={onBack} className="btn btn-brand" style={{ width:"100%", justifyContent:"center", padding:"15px", fontSize:15 }}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

/* ─── Main Session Page ───────────────────────────────────────────── */
export default function SessionPage() {
  const { id, sessionId } = useParams<{id:string;sessionId:string}>();
  const router = useRouter();
  const [q, setQ] = useState<Question|null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [total, setTotal] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation|null>(null);
  const [session, setSession] = useState<Session|null>(null);
  const [fb, setFb] = useState<OverallFeedback|null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  const onTranscript = useCallback((t:string)=>setAnswer(t),[]);
  const { listening, start:startMic, stop:stopMic, supported:micOk } = useSpeech(onTranscript);

  useEffect(()=>{
    fetch(`/api/sessions/${sessionId}`).then(r=>r.json()).then(({session:s,interview:iv})=>{
      setSession(s); setTotal(s.totalQuestions); setQIdx(s.currentQuestionIndex);
      if (s.status==="completed") { setDone(true); setFb(s.feedback); }
      else setQ(iv?.questions[s.currentQuestionIndex]);
    }).catch(()=>toast.error("Failed to load session")).finally(()=>setLoading(false));
  },[sessionId]);

  useEffect(()=>{
    if (!done && !loading && q && !submitting) timerRef.current = setInterval(()=>setTimer(t=>t+1),1000);
    return ()=>clearInterval(timerRef.current);
  },[done,loading,q,submitting]);

  const submit = async ()=>{
    if (!q || submitting) return;
    if (listening) stopMic();
    clearInterval(timerRef.current);
    setSubmitting(true); setShowHint(false);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/respond`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ answer, questionId:q.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEvaluation(data.evaluation); setSession(data.session);
      if (data.isComplete) { setDone(true); setFb(data.overallFeedback); }
      else {
        setTimeout(()=>{
          setQ(data.nextQuestion); setQIdx(data.nextIndex);
          setAnswer(""); setEvaluation(null); setSubmitting(false); setTimer(0);
          timerRef.current = setInterval(()=>setTimer(t=>t+1),1000);
        }, 4200);
      }
    } catch(e:any) { toast.error(e.message||"Submission failed"); setSubmitting(false); }
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div className="spinner" style={{ width:40,height:40,border:"3px solid var(--border)",borderTop:"3px solid var(--brand)",borderRadius:"50%" }}/>
    </div>
  );

  if (done && session && fb) return <Results session={session} fb={fb} onBack={()=>router.push("/dashboard")}/>;

  const dStyle = q?.difficulty==="Hard"
    ? { color:"#F87171",bg:"rgba(248,113,113,0.1)",border:"rgba(248,113,113,0.2)" }
    : q?.difficulty==="Medium"
    ? { color:"#F59E0B",bg:"rgba(245,158,11,0.1)",border:"rgba(245,158,11,0.2)" }
    : { color:"#00D4AA",bg:"rgba(0,212,170,0.1)",border:"rgba(0,212,170,0.2)" };
  const pct = total > 0 ? (qIdx/total)*100 : 0;
  const timerOver = timer > (q?.expectedDuration??180);

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(155deg,#07080C 0%,#0C0F18 55%,#080C12 100%)", color:"var(--text)", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ maxWidth:820, margin:"0 auto", padding:"38px 24px" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:26 }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div style={{ width:8,height:8,borderRadius:"50%", background:submitting?"#F59E0B":"#00D4AA", animation:"pulse-dot 2s infinite", boxShadow:submitting?"0 0 8px rgba(245,158,11,0.5)":"0 0 10px rgba(0,212,170,0.5)" }}/>
            <span style={{ fontSize:13, color:"var(--text-3)", fontWeight:500 }}>{submitting?"AI Evaluating…":"Live Interview"}</span>
            {session?.stageName && <span className="badge badge-purple">{session.stageName}</span>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:22 }}>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:22, fontWeight:700, color:timerOver?"#F87171":"var(--text-2)", letterSpacing:1 }}>{formatTimer(timer)}</span>
            <span style={{ fontSize:13, color:"var(--text-4)" }}>{qIdx+1} / {total}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height:2, background:"var(--surface-hover)", borderRadius:1, marginBottom:32 }}>
          <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#00D4AA,#00A887)", borderRadius:1, transition:"width 0.6s cubic-bezier(0.16,1,0.3,1)" }}/>
        </div>

        {/* Question card */}
        {q && !submitting && (
          <div className="anim-fade-up" style={{ background:"rgba(255,255,255,0.035)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:18, padding:"24px 26px", marginBottom:16 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:14, flexWrap:"wrap" }}>
              <span style={{ fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:6, background:dStyle.bg, border:`1px solid ${dStyle.border}`, color:dStyle.color, letterSpacing:0.3 }}>{q.difficulty?.toUpperCase()}</span>
              <span style={{ fontSize:11,color:"var(--text-3)",padding:"3px 10px",borderRadius:6,background:"rgba(255,255,255,0.05)" }}>{q.category}</span>
              <span style={{ fontSize:11,color:"var(--text-4)",marginLeft:"auto" }}>~{Math.round((q.expectedDuration??120)/60)} min</span>
            </div>
            <p style={{ fontSize:20, fontWeight:700, color:"var(--text)", lineHeight:1.5, letterSpacing:-0.2 }}>{q.question}</p>
            {q.hints?.length > 0 && (
              <div style={{ marginTop:14 }}>
                <button onClick={()=>setShowHint(h=>!h)} style={{ background:"none", border:"1px solid rgba(167,139,250,0.3)", color:"#A78BFA", borderRadius:8, padding:"5px 14px", fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:600, transition:"all 0.2s" }}>
                  💡 {showHint?"Hide Hints":"Show Hints"}
                </button>
                {showHint && (
                  <div className="anim-fade-up" style={{ marginTop:10, padding:"12px 14px", background:"rgba(167,139,250,0.07)", borderRadius:10 }}>
                    {q.hints.map((h,i)=><p key={i} style={{ fontSize:13,color:"var(--text-2)",marginBottom:4,paddingLeft:12,borderLeft:"2px solid #A78BFA" }}>{h}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Evaluation shown between questions */}
        {evaluation && submitting && <EvalCard ev={evaluation}/>}

        {/* Answer area */}
        {!submitting && (
          <div className="anim-fade-up">
            <textarea
              value={answer} onChange={e=>setAnswer(e.target.value)}
              placeholder="Type your answer here… or click Voice Input to speak"
              rows={8}
              style={{ width:"100%", padding:"16px 18px", background:"rgba(255,255,255,0.035)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:14, color:"var(--text)", fontSize:14, lineHeight:1.7, resize:"vertical", fontFamily:"inherit", boxSizing:"border-box", transition:"border-color 0.2s", outline:"none" }}
              onFocus={e=>(e.target.style.borderColor="rgba(0,212,170,0.4)")}
              onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,0.09)")}
            />
            <div style={{ display:"flex", gap:10, marginTop:10 }}>
              {micOk && (
                <button onClick={listening?stopMic:startMic} className="btn" style={{
                  background:listening?"rgba(248,113,113,0.1)":"rgba(255,255,255,0.05)",
                  border:`1px solid ${listening?"rgba(248,113,113,0.35)":"rgba(255,255,255,0.1)"}`,
                  color:listening?"#F87171":"var(--text-3)",
                }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {listening
                      ? <><rect x="4" y="4" width="16" height="16" rx="2"/></>
                      : <><path d="M12 2a3 3 0 013 3v7a3 3 0 01-6 0V5a3 3 0 013-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>
                    }
                  </svg>
                  {listening ? "Stop Recording" : "Voice Input"}
                </button>
              )}
              <button onClick={submit} disabled={!answer.trim()} className="btn btn-brand" style={{ flex:1, justifyContent:"center" }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9 22,2"/></svg>
                Submit Answer
              </button>
            </div>
          </div>
        )}

        {submitting && evaluation && (
          <p style={{ textAlign:"center", fontSize:13, color:"var(--text-4)", paddingTop:12 }}>Next question loading in a moment…</p>
        )}
      </div>
      <style>{`@keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.8)} }`}</style>
    </div>
  );
}
