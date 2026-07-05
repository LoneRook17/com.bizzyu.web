import fs from "fs"
import path from "path"

// The support bot's entire knowledge base lives in /support-kb/*.md (repo root).
// Files are concatenated in filename order into one system-prompt string.
// Module-scope cache: the pack is read once per serverless instance. Editing
// the pack takes effect on the next deploy.
let cached: string | null = null

export function loadKnowledgePack(): string {
  if (cached) return cached
  const dir = path.join(process.cwd(), "support-kb")
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort()
  cached = files
    .map((f) => fs.readFileSync(path.join(dir, f), "utf8").trim())
    .join("\n\n---\n\n")
  return cached
}
