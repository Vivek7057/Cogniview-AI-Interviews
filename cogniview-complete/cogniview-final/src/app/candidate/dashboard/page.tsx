"use client";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { Interview } from "@/types";

export default function CandidateDashboardPage() {
  const [items, setItems] = useState<Interview[]>([]);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("cv_auth");
    const auth = raw ? JSON.parse(raw) : null;
    setEmail(auth?.email || "");

    fetch("/api/interviews")
      .then(r => r.json())
      .then((all: Interview[]) => {
        setItems(all.filter(i => i.candidateEmail && auth?.email && i.candidateEmail === auth.email));
      });
  }, []);

  const summary = useMemo(() => {
    return {
      total: items.length,
      selected: items.filter(i => i.candidateStatus === "selected").length,
      rejected: items.filter(i => i.candidateStatus === "rejected").length,
      inProgress: items.filter(i => i.candidateStatus === "in_progress").length,
    };
  }, [items]);

  return (
    <AppLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800 }}>Candidate Dashboard</h1>
          <p style={{ color: "var(--text-3)", fontSize: 14 }}>Track your stage progress and interview outcomes</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Applications", value: summary.total, color: "#4F9EFF" },
          { label: "In Progress", value: summary.inProgress, color: "#F59E0B" },
          { label: "Selected", value: summary.selected, color: "#00D4AA" },
          { label: "Rejected", value: summary.rejected, color: "#F87171" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 18 }}>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 28, color: s.color, fontWeight: 900 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 22 }}>
        <p className="label" style={{ marginBottom: 12 }}>Your Applications ({email || "not signed in"})</p>
        {!items.length ? (
          <p style={{ color: "var(--text-3)", fontSize: 14 }}>No applications mapped to this account yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map(iv => {
              const currentStage = iv.stages?.[iv.activeStageIndex];
              const lastMail = iv.decisionMails?.[iv.decisionMails.length - 1];
              return (
                <Link href={`/interviews/${iv.id}`} key={iv.id} className="card card-interactive" style={{ textDecoration: "none", padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div>
                      <p style={{ fontWeight: 700 }}>{iv.title}</p>
                      <p style={{ fontSize: 13, color: "var(--text-3)" }}>{iv.jobRole} • Current Stage: {currentStage?.name || "-"}</p>
                      {lastMail && <p style={{ fontSize: 12, color: "var(--text-4)" }}>Latest mail: {lastMail.type} ({new Date(lastMail.sentAt).toLocaleDateString()})</p>}
                    </div>
                    <span className={`badge ${iv.candidateStatus === "selected" ? "badge-brand" : iv.candidateStatus === "rejected" ? "badge-red" : "badge-amber"}`}>
                      {iv.candidateStatus}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
