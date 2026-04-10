import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cogniview — AI Interview Platform",
  description: "AI-powered interview creation and candidate evaluation platform",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "rgba(12,14,21,0.98)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#F1F2F6",
              fontSize: "14px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              backdropFilter: "blur(16px)",
            },
          }}
        />
      </body>
    </html>
  );
}
