import { promises as fs } from "fs";
import path from "path";
import type { Submission } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const SUBMISSIONS_FILE = path.join(DATA_DIR, "submissions.json");

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // directory exists
  }
}

async function readSubmissions(): Promise<Submission[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(SUBMISSIONS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeSubmissions(submissions: Submission[]) {
  await ensureDataDir();
  await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
}

export async function createSubmission(
  submission: Omit<Submission, "id" | "status" | "source" | "createdAt" | "updatedAt">
): Promise<Submission> {
  const submissions = await readSubmissions();
  const now = new Date().toISOString();
  const newSubmission: Submission = {
    ...submission,
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: "pending",
    source: "website_business_signup",
    createdAt: now,
    updatedAt: now,
  };
  submissions.push(newSubmission);
  await writeSubmissions(submissions);
  return newSubmission;
}

export async function getAllSubmissions(): Promise<Submission[]> {
  const submissions = await readSubmissions();
  return submissions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getSubmissionById(id: string): Promise<Submission | null> {
  const submissions = await readSubmissions();
  return submissions.find((s) => s.id === id) || null;
}

export async function updateSubmissionStatus(
  id: string,
  status: Submission["status"]
): Promise<Submission | null> {
  const submissions = await readSubmissions();
  const index = submissions.findIndex((s) => s.id === id);
  if (index === -1) return null;
  submissions[index].status = status;
  submissions[index].updatedAt = new Date().toISOString();
  await writeSubmissions(submissions);
  return submissions[index];
}
