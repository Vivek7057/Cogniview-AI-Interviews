export type InterviewStatus = "draft" | "ready";
export type QuestionSource = "role" | "resume";
export type CandidateStatus = "in_progress" | "rejected" | "selected";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type Category = "Technical" | "Behavioral" | "System Design" | "Problem Solving";
export type SessionStatus = "in_progress" | "completed";
export type Recommendation = "Strong Hire" | "Hire" | "Maybe" | "No Hire";
export type Grade = "Excellent" | "Good" | "Fair" | "Needs Improvement";

export interface HiringStage {
  id: string;
  name: string;
  passingScore: number;
  order: number;
}

export interface StageResult {
  stageId: string;
  stageName: string;
  score: number;
  passed: boolean;
  sessionId: string;
  evaluatedAt: string;
}

export interface DecisionMail {
  id: string;
  type: "selection" | "rejection";
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  status: "sent";
}

export interface ResumeScreening {
  score: number;
  strengths: string[];
  matchedSkills: string[];
  missingSkills: string[];
  summary: string;
}

export interface Question {
  id: string;
  question: string;
  category: Category;
  difficulty: Difficulty;
  expectedDuration: number;
  hints: string[];
  idealAnswer: string;
}

export interface Interview {
  id: string;
  title: string;
  jobRole: string;
  candidateName?: string;
  candidateEmail?: string;
  jobDescription: string;
  level: string;
  techStack: string[];
  numQuestions: number;
  stages: HiringStage[];
  activeStageIndex: number;
  candidateStatus: CandidateStatus;
  stageResults: StageResult[];
  decisionMails: DecisionMail[];
  questions: Question[];
  status: InterviewStatus;
  questionSource?: QuestionSource;
  resumeFileName?: string;
  resumeUploadedAt?: string;
  resumeText?: string;
  screening?: ResumeScreening;
  createdAt: string;
  updatedAt: string;
  completedSessions: number;
  lastSessionScore?: number;
}

export interface Evaluation {
  score: number;
  grade: Grade;
  strengths: string[];
  improvements: string[];
  feedback: string;
  followUpQuestion: string | null;
}

export interface SessionResponse {
  questionId: string;
  question: string;
  answer: string;
  evaluation: Evaluation;
  answeredAt: string;
}

export interface OverallFeedback {
  summary: string;
  recommendation: Recommendation;
  topStrengths: string[];
  topImprovements: string[];
}

export interface Session {
  id: string;
  interviewId: string;
  stageId?: string;
  stageName?: string;
  stagePassingScore?: number;
  status: SessionStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  responses: SessionResponse[];
  scores: number[];
  overallScore: number | null;
  feedback: OverallFeedback | null;
  startedAt: string;
  endedAt: string | null;
  duration: number | null;
}
