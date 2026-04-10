import OpenAI from "openai";
import { Question, ResumeScreening } from "@/types";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

if (!GROQ_API_KEY) {
  console.warn("Warning: GROQ_API_KEY environment variable is not set");
}

const groqClient = GROQ_API_KEY
  ? new OpenAI({
      apiKey: GROQ_API_KEY,
      baseURL: GROQ_BASE_URL,
    })
  : null;

const SAFETY_SYSTEM_PROMPT = `You are an interview copilot that must return strict JSON only.
Safety filter rules:
- Never output instructions for illegal, violent, hateful, or sexual exploitation content.
- Keep content professional and workplace-safe.
- If the user input is unsafe or missing key details, return conservative, safe JSON while preserving schema.
- Never include markdown, code fences, XML, or prose outside the JSON object.
- Do not mention provider limitations or model support in the output; always return schema-valid JSON.`;

function stripCodeFences(text: string) {
  let jsonText = text.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return jsonText;
}

function asStringArray(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(v => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .slice(0, max);
}

function toQuestion(q: any, i: number): Question {
  const categoryMap = new Set(["Technical", "Behavioral", "System Design", "Problem Solving"]);
  const difficultyMap = new Set(["Easy", "Medium", "Hard"]);

  const category = (categoryMap.has(q?.category) ? q.category : "Technical") as Question["category"];
  const difficulty = (difficultyMap.has(q?.difficulty) ? q.difficulty : "Medium") as Question["difficulty"];

  return {
    id: typeof q?.id === "string" && q.id.trim() ? q.id.trim() : `q${i + 1}`,
    question: typeof q?.question === "string" ? q.question.trim() : "",
    category,
    difficulty,
    expectedDuration:
      typeof q?.expectedDuration === "number" && Number.isFinite(q.expectedDuration)
        ? Math.max(60, Math.min(900, Math.round(q.expectedDuration)))
        : 120,
    hints: asStringArray(q?.hints, 4),
    idealAnswer: typeof q?.idealAnswer === "string" ? q.idealAnswer.trim() : "",
  };
}

async function callGroqJson(prompt: string) {
  if (!groqClient) {
    throw new Error("GROQ_API_KEY is not configured. Please set the environment variable.");
  }

  const completion = await groqClient.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.6,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SAFETY_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  });

  const text = completion.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") {
    throw new Error("Groq response did not include text output");
  }

  return stripCodeFences(text);
}

export async function generateQuestions(
  jobRole: string,
  jobDesc: string,
  level: string,
  techStack: string[],
  num: number
): Promise<Question[]> {
  const stack = techStack.length ? techStack.join(", ") : "general";

  try {
    const prompt = `Create ${num} interview questions for a ${level} ${jobRole} role.
Job Description: ${jobDesc || "Not provided"}
Tech Stack: ${stack}

Return ONLY valid JSON with this exact shape:
{
  "questions": [
    {
      "id": "q1",
      "question": "...",
      "category": "Technical|Behavioral|System Design|Problem Solving",
      "difficulty": "Easy|Medium|Hard",
      "expectedDuration": 120,
      "hints": ["hint1", "hint2"],
      "idealAnswer": "Brief outline of the ideal answer"
    }
  ]
}

Balance categories for the role and level, and make questions specific.`;

    const jsonText = await callGroqJson(prompt);
    const parsed = JSON.parse(jsonText);
    const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
    const normalized = (questions as any[])
      .map((q, i) => toQuestion(q, i))
      .filter((q: Question) => q.question.length > 0)
      .slice(0, num);

    if (!normalized.length) {
      throw new Error("Invalid questions format: expected non-empty array");
    }

    return normalized;
  } catch (error: any) {
    console.error("Groq API Error (generateQuestions):", error);
    const message = error?.message || "Unknown error";
    if (message.includes("API key") || message.includes("401") || message.includes("403")) {
      throw new Error("Groq API key is invalid. Check your GROQ_API_KEY.");
    }
    if (message.includes("quota") || message.includes("429")) {
      throw new Error("Groq API quota exceeded. Check your usage in Groq Console.");
    }
    throw new Error(`Failed to generate questions: ${message}`);
  }
}

export async function screenResume(
  jobRole: string,
  jobDesc: string,
  level: string,
  techStack: string[],
  resumeText: string
): Promise<ResumeScreening> {
  const stack = techStack.length ? techStack.join(", ") : "general";
  const resumeExcerpt = resumeText.slice(0, 18000);

  try {
    const prompt = `Screen this resume for a ${level} ${jobRole} role.
Job Description: ${jobDesc || "Not provided"}
Tech Stack: ${stack}
Resume Text:
${resumeExcerpt}

Return ONLY valid JSON:
{
  "score": 0,
  "strengths": ["strength1", "strength2"],
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["gap1", "gap2"],
  "summary": "3-4 sentence screening summary"
}

Scoring rules:
- score must be an integer from 0 to 100.
- strengths and missingSkills should be concrete and role-relevant.
- If resume is weak or sparse, still return schema-valid conservative output.`;

    const jsonText = await callGroqJson(prompt);
    const parsed = JSON.parse(jsonText);

    const scoreRaw = Number(parsed?.score);
    const score = Number.isFinite(scoreRaw) ? Math.max(0, Math.min(100, Math.round(scoreRaw))) : 0;

    return {
      score,
      strengths: asStringArray(parsed?.strengths),
      matchedSkills: asStringArray(parsed?.matchedSkills),
      missingSkills: asStringArray(parsed?.missingSkills),
      summary: typeof parsed?.summary === "string" ? parsed.summary.trim() : "No summary generated.",
    };
  } catch (error: any) {
    console.error("Groq API Error (screenResume):", error);
    const message = error?.message || "Unknown error";
    throw new Error(`Failed to screen resume: ${message}`);
  }
}

export async function generateQuestionsFromResume(
  jobRole: string,
  jobDesc: string,
  level: string,
  techStack: string[],
  resumeText: string,
  num: number
): Promise<Question[]> {
  const stack = techStack.length ? techStack.join(", ") : "general";
  const resumeExcerpt = resumeText.slice(0, 18000);

  try {
    const prompt = `Create ${num} interview questions for a ${level} ${jobRole} role based on this candidate's resume.
Job Description: ${jobDesc || "Not provided"}
Tech Stack: ${stack}
Resume Text:
${resumeExcerpt}

Return ONLY valid JSON:
{
  "questions": [
    {
      "id": "q1",
      "question": "...",
      "category": "Technical|Behavioral|System Design|Problem Solving",
      "difficulty": "Easy|Medium|Hard",
      "expectedDuration": 120,
      "hints": ["hint1", "hint2"],
      "idealAnswer": "Brief outline of the ideal answer"
    }
  ]
}

Question design rules:
- Keep interview quality high and role-relevant.
- Include targeted probes for missing skills.
- Include depth questions around strongest resume claims.
- Avoid asking only resume trivia.`;

    const jsonText = await callGroqJson(prompt);
    const parsed = JSON.parse(jsonText);
    const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
    const normalized = (questions as any[])
      .map((q, i) => toQuestion(q, i))
      .filter((q: Question) => q.question.length > 0)
      .slice(0, num);

    if (!normalized.length) {
      throw new Error("Invalid questions format: expected non-empty array");
    }

    return normalized;
  } catch (error: any) {
    console.error("Groq API Error (generateQuestionsFromResume):", error);
    const message = error?.message || "Unknown error";
    throw new Error(`Failed to generate resume-based questions: ${message}`);
  }
}

export async function evaluateAnswer(
  question: string,
  category: string,
  difficulty: string,
  idealAnswer: string,
  jobRole: string,
  level: string,
  answer: string
) {
  try {
    const prompt = `Evaluate this interview answer as a senior ${level} ${jobRole} interviewer.

Question: ${question}
Category: ${category} | Difficulty: ${difficulty}
Ideal Answer: ${idealAnswer || "N/A"}
Candidate Answer: ${answer || "(No answer provided)"}

Return ONLY valid JSON:
{
  "score": <integer 0-10>,
  "grade": "Excellent|Good|Fair|Needs Improvement",
  "strengths": ["strength1", "strength2"],
  "improvements": ["area1", "area2"],
  "feedback": "2-3 sentences of constructive feedback",
  "followUpQuestion": "a follow-up question to probe deeper, or null"
}`;

    const jsonText = await callGroqJson(prompt);
    return JSON.parse(jsonText);
  } catch (error: any) {
    console.error("Groq API Error (evaluateAnswer):", error);
    const message = error?.message || "Unknown error";
    if (message.includes("API key") || message.includes("401") || message.includes("403")) {
      throw new Error("Groq API key is invalid.");
    }
    throw new Error(`Failed to evaluate answer: ${message}`);
  }
}

export async function summarizeInterview(
  jobRole: string,
  level: string,
  scores: number[],
  responses: { question: string; grade: string }[]
) {
  try {
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const prompt = `Summarize this ${level} ${jobRole} interview.
Scores: ${scores.join(", ")} /10 (Average: ${avg})
Questions answered: ${responses.length}
Grades: ${responses.map(r => r.grade).join(", ")}

Return ONLY valid JSON:
{
  "summary": "3-4 sentences summarizing overall performance",
  "recommendation": "Strong Hire|Hire|Maybe|No Hire",
  "topStrengths": ["strength1", "strength2"],
  "topImprovements": ["area1", "area2"]
}`;

    const jsonText = await callGroqJson(prompt);
    return JSON.parse(jsonText);
  } catch (error: any) {
    console.error("Groq API Error (summarizeInterview):", error);
    const message = error?.message || "Unknown error";
    if (message.includes("API key") || message.includes("401") || message.includes("403")) {
      throw new Error("Groq API key is invalid.");
    }
    throw new Error(`Failed to summarize interview: ${message}`);
  }
}
