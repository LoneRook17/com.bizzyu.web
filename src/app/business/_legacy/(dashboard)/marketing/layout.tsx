// The Marketing page now hosts its own Events / Following tab UI inline,
// so the old "Attendees | Campaigns" sub-nav is gone. This layout exists
// only as a thin pass-through to keep the route segment valid.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
