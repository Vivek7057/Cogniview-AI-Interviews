"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"company" | "candidate">("company");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    localStorage.setItem("cv_auth", JSON.stringify({
      email: email.trim(),
      role,
      name: email.split("@")[0],
    }));

    router.push(role === "company" ? "/company/dashboard" : "/candidate/dashboard");
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 460, padding: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Sign In</h1>
        <p style={{ color: "var(--text-3)", marginBottom: 20 }}>Access company or candidate dashboard</p>

        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <label className="label">Role</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setRole("company")} className={`btn ${role === "company" ? "btn-brand" : "btn-outline"}`}>Company</button>
            <button type="button" onClick={() => setRole("candidate")} className={`btn ${role === "candidate" ? "btn-brand" : "btn-outline"}`}>Candidate</button>
          </div>

          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />

          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />

          <button className="btn btn-brand" type="submit" style={{ justifyContent: "center", marginTop: 8 }}>Sign In</button>
        </form>

        <p style={{ marginTop: 16, fontSize: 13, color: "var(--text-3)" }}>
          New user? <Link href="/signup" style={{ color: "var(--brand)" }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
