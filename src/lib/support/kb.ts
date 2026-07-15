import fs from "fs"
import path from "path"
import type { SupportAudience } from "./auth"

// The support bot's knowledge base lives in per-audience markdown packs at the
// repo root: /support-kb/*.md (students, loaded in the iOS WebView) and
// /business-kb/*.md (business owners, loaded in the dashboard help bubble).
// Files in a pack are concatenated in filename order into one system-prompt
// string. Module-scope cache: each pack is read once per serverless instance,
// so editing a pack takes effect on the next deploy.
//
// NOTE: any new pack directory must be added to outputFileTracingIncludes in
// next.config.ts, or the .md files won't ship inside the serverless bundle.
const PACK_DIRS: Record<SupportAudience, string> = {
  student: "support-kb",
  business: "business-kb",
}

const cached: Partial<Record<SupportAudience, string>> = {}

export function loadKnowledgePack(audience: SupportAudience): string {
  const hit = cached[audience]
  if (hit) return hit
  const dir = path.join(process.cwd(), PACK_DIRS[audience])
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort()
  const pack = files
    .map((f) => fs.readFileSync(path.join(dir, f), "utf8").trim())
    .join("\n\n---\n\n")
  cached[audience] = pack
  return pack
}
