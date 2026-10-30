"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/v2/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn("inline-flex items-center gap-1", className)}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // BETA visual polish: no tray. The active segment is a quiet filled
      // surface (neutral, never a second green), the rest plain text.
      "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-transparent px-3 text-sm font-medium text-neutral-600 outline-none transition-colors cursor-pointer hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-[#05EB54]/40 data-[state=active]:border-neutral-200 data-[state=active]:bg-neutral-100 data-[state=active]:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 dark:data-[state=active]:border-neutral-800 dark:data-[state=active]:bg-neutral-800/70 dark:data-[state=active]:text-neutral-100",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-5 outline-none", className)} {...props} />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
