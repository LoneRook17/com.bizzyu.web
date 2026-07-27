// Small self-contained canvas confetti burst for the line-skip checkout
// success screen. No dependency: the repo had no confetti lib and the PI/
// Elements rework never carried one over, so this is a lightweight inline
// implementation. It paints to a throwaway full-screen canvas that is
// pointer-events:none and removes itself when the animation finishes, so it
// never interferes with the receipt/confirmation content underneath.

const COLORS = ["#D4AF37", "#F0CD6E", "#FCE38A", "#E8B923", "#FFFFFF"]

interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rot: number
  vr: number
  color: string
  round: boolean
}

/** Fire a single confetti burst. Safe to no-op on the server or when the user
 *  prefers reduced motion. Caller is responsible for firing it only once. */
export function fireConfetti(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return

  const w = window.innerWidth
  const h = window.innerHeight
  const dpr = window.devicePixelRatio || 1

  const canvas = document.createElement("canvas")
  canvas.width = w * dpr
  canvas.height = h * dpr
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "9999",
  } as CSSStyleDeclaration)

  const ctx = canvas.getContext("2d")
  if (!ctx) return
  ctx.scale(dpr, dpr)
  document.body.appendChild(canvas)

  const COUNT = 150
  const pieces: Piece[] = Array.from({ length: COUNT }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.4,
    y: h * 0.32 + (Math.random() - 0.5) * 60,
    vx: (Math.random() - 0.5) * 13,
    vy: Math.random() * -15 - 4,
    size: Math.random() * 6 + 4,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.32,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    round: Math.random() > 0.55,
  }))

  const GRAVITY = 0.36
  const DURATION = 2600
  const FADE = 700
  const start = performance.now()

  const tick = (now: number) => {
    const elapsed = now - start
    const alpha = elapsed > DURATION - FADE ? Math.max(0, (DURATION - elapsed) / FADE) : 1
    ctx.clearRect(0, 0, w, h)
    for (const p of pieces) {
      p.vy += GRAVITY
      p.vx *= 0.99
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      if (p.round) {
        ctx.beginPath()
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      }
      ctx.restore()
    }
    if (elapsed < DURATION) {
      requestAnimationFrame(tick)
    } else {
      canvas.remove()
    }
  }
  requestAnimationFrame(tick)
}
