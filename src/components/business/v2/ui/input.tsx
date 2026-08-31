"use client"

import * as React from "react"
import { useWeeklyCoverAccent } from "@/components/business/v2/door-access/WeeklyCoverAccent"
import { cn } from "@/lib/v2/utils"

const inputChrome =
  "flex w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-sm outline-none transition-colors placeholder:text-neutral-400 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"

export const EVENT_INPUT_FOCUS_CLASS =
  "caret-[#05EB54] accent-[#05EB54] focus-visible:border-[#05EB54] focus-visible:ring-[#05EB54]/30 dark:focus-visible:border-[#05EB54] dark:focus-visible:ring-[#05EB54]/30"

export const ACCESS_INPUT_FOCUS_CLASS =
  "caret-access accent-access focus-visible:border-access focus-visible:ring-access/30 dark:focus-visible:border-access dark:focus-visible:ring-access/30"

function useInputBase() {
  return cn(inputChrome, useWeeklyCoverAccent() ? ACCESS_INPUT_FOCUS_CLASS : EVENT_INPUT_FOCUS_CLASS)
}

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input type={type} ref={ref} className={cn(useInputBase(), "h-9 py-2", className)} {...props} />
  )
)
Input.displayName = "Input"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(useInputBase(), "min-h-[80px] py-2", className)} {...props} />
  )
)
Textarea.displayName = "Textarea"

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(useInputBase(), "h-9", className)} {...props} />
  )
)
Select.displayName = "Select"

export { Input, Textarea, Select }
