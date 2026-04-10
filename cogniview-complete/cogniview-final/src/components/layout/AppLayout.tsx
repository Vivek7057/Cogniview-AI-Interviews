"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("cv_auth");
    if (!raw) {
      router.replace("/signin");
      return;
    }

    const auth = JSON.parse(raw);
    const role = auth?.role === "candidate" ? "candidate" : "company";
    if (role === "candidate" && pathname.startsWith("/company")) {
      router.replace("/candidate/dashboard");
      return;
    }
    if (role === "company" && pathname.startsWith("/candidate")) {
      router.replace("/company/dashboard");
      return;
    }
    setReady(true);
  }, [pathname, router]);

  if (!ready) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{
        marginLeft: 228,
        flex: 1,
        padding: "44px 52px",
        maxWidth: "calc(100vw - 228px)",
        minHeight: "100vh",
      }}>
        {children}
      </main>
    </div>
  );
}
