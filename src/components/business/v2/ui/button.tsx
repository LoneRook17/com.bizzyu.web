"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { useWeeklyCoverAccent } from "@/components/business/v2/door-access/WeeklyCoverAccent"
import { cn } from "@/lib/v2/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#05EB54]/40 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-neutral-950 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] text-white shadow-md shadow-[#05EB54]/25 hover:brightness-110",
        /** Weekly Cover primary — ACCESS_ACCENT / --color-access, not Bizzy green. */
        access: "bg-gradient-to-br from-access-deep to-access text-white shadow-md shadow-access/25 hover:brightness-110 focus-visible:ring-access/40",
        secondary: "bg-white text-neutral-700 border border-neutral-300 shadow-sm hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800",
        "access-secondary": "bg-white text-access border border-access/40 shadow-sm hover:bg-access/10 dark:bg-neutral-900 dark:text-access dark:border-access/50 dark:hover:bg-access/15",
        ghost: "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
        danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
        subtle: "bg-neutral-100 text-neutral-800 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700",
        link: "text-[#05EB54] underline-offset-4 hover:underline dark:text-[#05EB54]",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-9 px-4 text-sm",
        lg: "h-11 px-5 text-[15px]",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const weekly = useWeeklyCoverAccent()
    // Inside Weekly Cover, the default/primary CTA is pink. Explicit variants
    // (secondary, danger, access, …) stay as written so Cancel/Back stay gray.
    const resolvedVariant =
      weekly && (variant == null || variant === "primary") ? "access" : variant
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant: resolvedVariant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
