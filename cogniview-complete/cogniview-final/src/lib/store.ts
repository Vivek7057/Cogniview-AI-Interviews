import { Interview, Session } from "@/types";

interface Store {
  interviews: Interview[];
  sessions: Session[];
}

const g = globalThis as typeof globalThis & { __cv?: Store };
if (!g.__cv) g.__cv = { interviews: [], sessions: [] };
export const store = g.__cv;
