// Single source of truth for the line-skip checkout modal panel's classes
// (LS-UI-2 scroll fix).
//
// The `pay` step mounts the in-page Payment Element — express wallets + card
// tabs + the Link "save your info" section — which is far taller than a short
// laptop or phone viewport. The modal panel MUST cap its height and scroll its
// own overflow, or the buyer is trapped: the Pay button falls below the fold
// with no way to reach it (reproduced desktop 1280×640: Pay button at y≈900,
// viewport 640, unreachable even after scroll attempts).
//
// The scroll affordance lives here so the regression guard test can assert it
// never silently disappears again.

export const CHECKOUT_PANEL_CLASS =
  "ls-rise max-h-[90dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl border border-[#1e1e2e] bg-[#141420] p-6 sm:rounded-3xl"
