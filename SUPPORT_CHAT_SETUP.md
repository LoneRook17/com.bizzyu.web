# Support Chatbot — Setup & Ops (`/support-chat`)

The in-app support bot that replaced the Zapier bot. It lives entirely in this
repo (`com.bizzyu.web`):

- **Page:** `/support-chat` — loaded inside the iOS app's WebView (no marketing
  chrome; `LayoutShell` hides Navbar/Footer for this path).
- **API:** `POST /api/support-chat` — streams answers from Claude Haiku 4.5 via
  the Anthropic SDK. Knowledge base = `support-kb/*.md`, concatenated into a
  cached system prompt.
- **Auth:** every request must carry a valid Laravel **Sanctum** token, verified
  against `POST {LARAVEL_API_URL}/api/profile` (`src/lib/support/auth.ts`). No
  token → no answer. This is the main defense against the endpoint being farmed
  as a free LLM.
- **Abuse/cost controls:** 20 msgs / 10 min + 60 / rolling 24 h per user, 12-turn
  history window, 600-token replies, `SUPPORT_CHAT_DISABLED` kill switch,
  per-request usage log line (`tag:"support-chat-usage"`) in Vercel logs.

> This doc is the **dev (`com-bizzyu-web-l2gp`) Vercel project** checklist. Prod
> (`com-bizzyu-web` / bizzyu.com) is a separate flip-on that is **not** covered
> here — do not copy dev values to prod.

---

## Flip-on order (dev = `com-bizzyu-web-l2gp` Vercel project)

Set these in the l2gp project's **Environment Variables** (Vercel dashboard →
Settings → Environment Variables). **After any env change you must redeploy** —
Vercel bakes env vars at build time, so a change does nothing until the project
redeploys.

Do these **in order**. Ship dark first, prove the plumbing, then open the valve.

### 1. `SUPPORT_CHAT_DISABLED=1` — ship dark FIRST

Set this **before** anything else and land the branch with it on. While `=1`,
`POST /api/support-chat` returns `503 {"error":"disabled"}` and the app shows its
generic "email support" fallback. This lets the page + route deploy with zero
spend and zero risk while you wire up the key. Flip it to `0` (or delete the var)
only once steps 2–3 are verified. Redeploy to apply.

### 2. `ANTHROPIC_API_KEY` — from a SPEND-CAPPED workspace

The key that bills the bot. **Luke must create a dedicated Anthropic workspace
with a monthly spend cap in the Anthropic console** (console.anthropic.com →
Settings → Workspaces → set a monthly limit) and mint the key there. Do **not**
reuse a general/uncapped org key — the cap is the backstop if auth or rate limits
are ever bypassed. Paste the key into the l2gp project env. Redeploy.

### 3. `LARAVEL_API_URL` — the DEV Laravel base (NOT prod)

Base URL for the Sanctum token check (`{base}/api/profile`). Set **without** a
trailing `/api`.

```
LARAVEL_API_URL=http://3.80.143.224
```

`http://3.80.143.224` is the **dev Laravel EC2** (`ubuntu@3.80.143.224`, app at
`/var/www/com.bizzyu.core`). It is the same host the l2gp project already uses for
`CHECKOUT_REDIRECT_BASE` and the next.config `LARAVEL_API_URL` rewrite.

> ⛔ **NEVER set `https://bizzy-deals.com` (PROD) on the l2gp/dev project.** That
> would verify **dev** app tokens against the **prod** user table — wrong users,
> and a cross-environment leak. Prod Laravel (`https://bizzy-deals.com`) belongs
> only to the prod web project. See the loud comment in
> `src/lib/support/auth.ts`.

| Environment | `LARAVEL_API_URL` |
|-------------|-------------------|
| Dev (l2gp)  | `http://3.80.143.224` |
| Prod (`com-bizzyu-web`) | `https://bizzy-deals.com` |
| Local       | `http://127.0.0.1:8001` (code fallback if unset) |

### 4. `SUPPORT_CHAT_DEV_BYPASS` — NEVER on Vercel

Leave this **unset** on every Vercel project (dev and prod). It's a **local-dev
only** escape hatch: when `=1` *and* `NODE_ENV !== "production"`, `auth.ts` returns
a fake user so you can hit the route without a real token on your laptop. It is a
no-op on Vercel production builds by design, but do not set it anyway — it exists
only for `npm run dev` on localhost.

---

## Smoke test (after step 3, before flipping step 1 off)

You need a **real Sanctum token** for a user that exists in the **dev** Laravel DB
(e.g. `luke-dev@bizzytest.com`). Grab one from the app (dev build) or by logging
in against dev Laravel. Then:

```bash
# Against the live l2gp deploy. Streams plain text back if it works.
curl -N https://com-bizzyu-web-l2gp.vercel.app/api/support-chat \
  -H "Authorization: Bearer <DEV_SANCTUM_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"How do I claim a deal?"}]}'
```

Expected responses:
- **Streaming text** → working (valid token, key set, `SUPPORT_CHAT_DISABLED` off).
- `503 {"error":"disabled"}` → `SUPPORT_CHAT_DISABLED=1` still set (step 1).
- `401 {"error":"unauthorized"}` → bad/expired token, or `LARAVEL_API_URL` points
  at the wrong Laravel (token not found in that DB).
- `429 {"error":"rate_limited"}` / `{"error":"daily_limit"}` → you hit the limits.

Local equivalent (needs `SUPPORT_CHAT_DEV_BYPASS=1` in your local `.env`, or a
local Sanctum token): same body against `http://localhost:3001/api/support-chat`.

---

## Accepted v1 tradeoff — token in the WebView URL (`?token=`)

The iOS app opens the page as `…/support-chat?token=<sanctum token>`; `page.tsx`
reads it from the query string and forwards it as `Authorization: Bearer <token>`
to the API. Putting the token in the URL is a **known, accepted v1 tradeoff**
(WebView plumbing simplicity) — **do not redesign it here.** Mitigations already in
place: tokens are short-lived Sanctum tokens, the route requires them server-side,
the page sets `no-store`, and abuse is rate-limited per user. If this is ever
revisited, it's an app-side change (post the token in the WebView bridge instead of
the URL), not a change to this route.
