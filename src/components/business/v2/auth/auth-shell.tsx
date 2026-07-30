"use client"

import * as React from "react"
import Link from "next/link"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/business/v2/ui/button"
import { Input } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { cn } from "@/lib/v2/utils"

interface AuthCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/bizzy-logo.png" alt="Bizzy" className="mx-auto h-14" />
        </Link>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="mb-1 text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{title}</h1>
        {subtitle ? (
          <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>
        ) : (
          <div className="mb-6" />
        )}
        {children}
      </div>
    </div>
  )
}

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  name: string
  error?: string
}

export function AuthField({ label, name, error, required, className, ...props }: AuthFieldProps) {
  return (
    <div className="mb-4">
      <Label htmlFor={name} className="mb-1.5 block">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(
          "h-10",
          error && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/20",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface AuthPasswordFieldProps extends Omit<AuthFieldProps, "type"> {
  label: string
  name: string
  error?: string
}

export function AuthPasswordField({ label, name, error, required, className, ...props }: AuthPasswordFieldProps) {
  const [visible, setVisible] = React.useState(false)
  return (
    <div className="mb-4">
      <Label htmlFor={name} className="mb-1.5 block">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          aria-invalid={error ? true : undefined}
          className={cn(
            "h-10 pr-12",
            error && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/20",
            className
          )}
          {...props}
        />
        {/* Full-height 44px-wide zone, not an icon-sized button: a fingertip
            needs ~44px, and misses land on the input (focus + keyboard, no
            toggle) — which read as the eye "doing nothing" on phones. */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 z-10 flex w-11 touch-manipulation items-center justify-center text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface AuthSubmitProps {
  loading: boolean
  disabled?: boolean
  children: React.ReactNode
}

export function AuthSubmit({ loading, disabled, children }: AuthSubmitProps) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={loading || disabled}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Button>
  )
}

type AlertTone = "success" | "error" | "info" | "warning"

const alertTones: Record<AlertTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  error: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
  warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
}

export function AuthAlert({
  tone = "info",
  className,
  children,
}: {
  tone?: AlertTone
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("rounded-lg border p-3.5 text-sm leading-relaxed", alertTones[tone], className)}>
      {children}
    </div>
  )
}

export function AuthSpinner() {
  return (
    <div className="flex justify-center py-8">
      <Loader2 className="size-7 animate-spin text-[#05EB54]" />
    </div>
  )
}

export function AuthFooterLink({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">{children}</p>
}
