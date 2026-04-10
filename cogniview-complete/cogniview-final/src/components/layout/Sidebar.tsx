"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const COMPANY_NAV = [
  { href: "/company/dashboard", label: "Company Dashboard", icon: (
    <svg className="sidebar-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  )},
];

const CANDIDATE_NAV = [
  { href: "/candidate/dashboard", label: "Candidate Dashboard", icon: (
    <svg className="sidebar-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 21c1.8-4 5-6 8-6s6.2 2 8 6"/>
    </svg>
  )},
  { href: "/interviews", label: "My Applications", icon: (
    <svg className="sidebar-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z"/>
      <path d="M8 9h8M8 13h8M8 17h5"/>
    </svg>
  )},
];

const SHARED_NAV = [
  { href: "/interviews", label: "Interviews", icon: (
    <svg className="sidebar-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  )},
  { href: "/analytics", label: "Analytics", icon: (
    <svg className="sidebar-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
    </svg>
  )},
];

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<"company" | "candidate">("company");

  useEffect(() => {
    const raw = localStorage.getItem("cv_auth");
    const auth = raw ? JSON.parse(raw) : null;
    setRole(auth?.role === "candidate" ? "candidate" : "company");
  }, []);

  const nav = useMemo(() => {
    if (role === "candidate") return CANDIDATE_NAV;
    return [...COMPANY_NAV, ...SHARED_NAV];
  }, [role]);

  const signOut = () => {
    localStorage.removeItem("cv_auth");
    router.replace("/signin");
  };

  return (
    <aside style={{
      position: "fixed", top: 0, left: 0, bottom: 0, width: 228,
      background: "rgba(7,8,12,0.97)", borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column", padding: "24px 14px",
      backdropFilter: "blur(20px)", zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 10px", marginBottom: 28 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "linear-gradient(135deg, #00D4AA 0%, #00A887 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 20px rgba(0,212,170,0.3)", flexShrink: 0,
        }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#05120F" strokeWidth={2.5}>
            <path strokeLinecap="round" d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path strokeLinecap="round" d="M2 17l10 5 10-5"/>
            <path strokeLinecap="round" d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div>
          <p style={{ fontWeight: 800, fontSize: 15, color: "var(--text)", letterSpacing: -0.3 }}>Cogniview</p>
          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>AI Interviews</p>
        </div>
      </div>

      {/* New Interview CTA */}
      {role === "company" && <Link href="/interviews/new" style={{
        display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
        marginBottom: 20, borderRadius: 12, textDecoration: "none",
        background: "var(--brand-dim)", border: "1px solid var(--brand-glow)",
        color: "var(--brand)", fontWeight: 700, fontSize: 13,
        transition: "all 0.2s",
      }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,212,170,0.2)")}
        onMouseLeave={e => (e.currentTarget.style.background = "var(--brand-dim)")}
      >
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Post Job
      </Link>}

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {nav.map(({ href, label, icon }) => {
          const active = path === href || (href !== "/dashboard" && path.startsWith(href));
          return (
            <Link key={href} href={href}
              className={`sidebar-link${active ? " active" : ""}`}
            >
              <span className="sidebar-icon" style={{ color: active ? "var(--brand)" : undefined }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid var(--border)" }}>
        <button className="btn btn-ghost" onClick={signOut} style={{ width: "100%", justifyContent: "center", marginBottom: 8 }}>
          Sign out
        </button>
        <p style={{ fontSize: 11, color: "var(--text-4)", lineHeight: 1.6 }}>
          Powered by <span style={{ color: "var(--brand)", fontWeight: 600 }}>Groq Llama 3.3 70B</span>
        </p>
        <p style={{ fontSize: 11, color: "var(--text-4)" }}>Cogniview v1.0</p>
      </div>
    </aside>
  );
}
