import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/v2/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
        /* BETA visual polish: the mock's Live chip, a pale mint with
           green-text #0A8038 in both themes. */
        success: "bg-[#E3F9EA] text-[#0A8038] dark:bg-[#DDF7E6] dark:text-[#0A8038]",
        warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
        info: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
        danger: "bg-red-50 text-red-700 dark:bg-[#FF6B72]/15 dark:text-[#FF6B72]",
        brand: "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400",
        access: "bg-[#FF3ED1] text-[#33052A]",
        custom: "bg-[#05EB54] text-[#0A2A12]",
        outline: "border border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[11px]",
        md: "px-2 py-1 text-xs leading-none",
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { Badge, badgeVariants }
