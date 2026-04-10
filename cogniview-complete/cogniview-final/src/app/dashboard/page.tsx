"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem("cv_auth");
    if (!raw) {
      router.replace("/signin");
      return;
    }

    const auth = JSON.parse(raw);
    router.replace(auth?.role === "candidate" ? "/candidate/dashboard" : "/company/dashboard");
  }, [router]);

  return null;
}
