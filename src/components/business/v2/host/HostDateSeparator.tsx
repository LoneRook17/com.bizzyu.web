/**
 * Day header on the Host live list ("Sat Aug 29").
 * Tonight and Upcoming group cards under these so the list is not a stack.
 */
export function HostDateSeparator({ label }: { label: string }) {
  return (
    <h3 className="pt-1 text-[13px] font-semibold tracking-tight text-neutral-600 dark:text-neutral-400">
      {label}
    </h3>
  )
}
