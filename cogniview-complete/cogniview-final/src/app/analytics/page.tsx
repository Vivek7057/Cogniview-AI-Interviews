"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { formatDate, formatDuration, recStyle, scoreColor } from "@/lib/utils";

interface Data {
  summary: { totalInterviews:number; completedSessions:number; totalSessions:number; avgScore:number; readyInterviews:number };
  dist: { range:string; count:number }[];
  monthly: { month:string; sessions:number; avgScore:number }[];
  recent: { id:string; interviewId:string; title:string; jobRole:string; score:number|null; recommendation:string; date:string; duration:number|null }[];
}

const DIST_COLORS = ["#F87171","#F59E0B","#4F9EFF","#00D4AA"];

function BarChart({ data, valueKey, color }: { data: any[]; valueKey: string; color: string }) {
  const max = Math.max(...data.map(d => d[valueKey] ?? 0), 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:96 }}>
      {data.map((d,i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
          {d[valueKey] > 0 && <span style={{ fontSize:10, color:"var(--text-3)", fontWeight:600 }}>{d[valueKey]}</span>}
          <div style={{ width:"100%", borderRadius:"4px 4px 0 0", background: d[valueKey]?`linear-gradient(180deg,${color},${color}55)`:"var(--surface-hover)", height: d[valueKey]?`${Math.max((d[valueKey]/max)*100,6)}%`:"4%", minHeight:3, transition:"height 0.8s ease" }}/>
          <span style={{ fontSize:9, color:"var(--text-4)" }}>{d.month}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Data|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics").then(r=>r.json()).then(setData).finally(()=>setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="anim-fade-up" style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:-0.5, marginBottom:4 }}>Analytics</h1>
        <p style={{ fontSize:14, color:"var(--text-3)" }}>Interview performance metrics and trends</p>
      </div>

      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
            {[...Array(4)].map((_,i)=><div key={i} className="skeleton" style={{height:100}}/>)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {[...Array(2)].map((_,i)=><div key={i} className="skeleton" style={{height:180}}/>)}
          </div>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }} className="anim-fade-up-delay-1">
            {[
              { label:"Total Interviews", value:data?.summary.totalInterviews??0, color:"#A78BFA" },
              { label:"Completed Sessions", value:data?.summary.completedSessions??0, color:"#00D4AA" },
              { label:"Average Score", value:data?.summary.avgScore?`${data.summary.avgScore}/10`:"—", color:!data?.summary.avgScore?"#6B7280":data.summary.avgScore>=7?"#00D4AA":data.summary.avgScore>=5?"#F59E0B":"#F87171" },
              { label:"Ready Interviews", value:data?.summary.readyInterviews??0, color:"#4F9EFF" },
            ].map(s=>(
              <div key={s.label} className="card" style={{ padding:"20px 22px", position:"relative", overflow:"hidden" }}>
                <div style={{ fontSize:32, fontWeight:900, color:s.color, marginBottom:4, letterSpacing:-0.5 }}>{s.value}</div>
                <div style={{ fontSize:13, color:"var(--text-2)", fontWeight:500 }}>{s.label}</div>
                <div style={{ position:"absolute", bottom:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${s.color},transparent)` }}/>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }} className="anim-fade-up-delay-2">
            <div className="card" style={{ padding:"22px 24px" }}>
              <p className="label" style={{ marginBottom:14 }}>Monthly Sessions</p>
              {data?.monthly?.some(m=>m.sessions>0)
                ? <BarChart data={data.monthly} valueKey="sessions" color="#00D4AA"/>
                : <div style={{ height:96, display:"flex", alignItems:"center", justifyContent:"center" }}><p style={{ fontSize:13, color:"var(--text-4)" }}>No sessions yet</p></div>
              }
            </div>
            <div className="card" style={{ padding:"22px 24px" }}>
              <p className="label" style={{ marginBottom:14 }}>Score Distribution</p>
              {!data?.summary.completedSessions
                ? <div style={{ height:96, display:"flex", alignItems:"center", justifyContent:"center" }}><p style={{ fontSize:13, color:"var(--text-4)" }}>Complete sessions to see data</p></div>
                : (
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {data?.dist.map((d,i)=>{
                      const max = Math.max(...(data.dist.map(x=>x.count)||[]),1);
                      return (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <span style={{ fontSize:11, fontFamily:"monospace", color:"var(--text-3)", width:32, flexShrink:0 }}>{d.range}</span>
                          <div style={{ flex:1, height:8, background:"var(--surface-hover)", borderRadius:4, overflow:"hidden" }}>
                            <div style={{ width:`${(d.count/max)*100}%`, height:"100%", background:DIST_COLORS[i], borderRadius:4, transition:"width 0.8s ease" }}/>
                          </div>
                          <span style={{ fontSize:12, fontWeight:700, color:DIST_COLORS[i], width:18, textAlign:"right" }}>{d.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          </div>

          <div className="card anim-fade-up-delay-3" style={{ padding:"22px 24px", marginBottom:20 }}>
            <p className="label" style={{ marginBottom:14 }}>Average Score Trend</p>
            {data?.monthly?.some(m=>m.avgScore>0)
              ? <BarChart data={data.monthly} valueKey="avgScore" color="#A78BFA"/>
              : <div style={{ height:96, display:"flex", alignItems:"center", justifyContent:"center" }}><p style={{ fontSize:13, color:"var(--text-4)" }}>No scored sessions yet</p></div>
            }
          </div>

          {/* Recent sessions table */}
          <div className="card anim-fade-up-delay-4" style={{ padding:"22px 24px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <p className="label">Recent Sessions</p>
            </div>
            {!data?.recent?.length ? (
              <div style={{ textAlign:"center", padding:"40px 0" }}>
                <p style={{ fontSize:14, color:"var(--text-4)", marginBottom:14 }}>No completed sessions yet.</p>
                <Link href="/interviews" className="btn btn-brand" style={{ display:"inline-flex" }}>Start an Interview</Link>
              </div>
            ) : (
              <div>
                {data.recent.map((r,i)=>{
                  const rs = r.recommendation ? recStyle(r.recommendation) : { color:"#6B7280", bg:"rgba(107,114,128,0.1)", border:"rgba(107,114,128,0.2)" };
                  const sc = r.score !== null ? scoreColor(r.score) : "#6B7280";
                  return (
                    <Link key={r.id} href={`/interviews/${r.interviewId}`} style={{
                      display:"flex", alignItems:"center", gap:14, padding:"12px 0", textDecoration:"none",
                      borderBottom: i<data.recent.length-1?"1px solid var(--border)":"none", transition:"opacity 0.2s",
                    }}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.opacity="0.7"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.opacity="1"}
                    >
                      <div style={{ width:42,height:42,borderRadius:"50%",background:`${sc}14`,border:`2px solid ${sc}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:sc,flexShrink:0 }}>{r.score??"-"}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:14, fontWeight:600, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:2 }}>{r.title}</p>
                        <p style={{ fontSize:12, color:"var(--text-3)" }}>{r.jobRole} · {formatDate(r.date)} · {formatDuration(r.duration)}</p>
                      </div>
                      {r.recommendation && (
                        <span style={{ fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:8,background:rs.bg,border:`1px solid ${rs.border}`,color:rs.color,flexShrink:0 }}>{r.recommendation}</span>
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
