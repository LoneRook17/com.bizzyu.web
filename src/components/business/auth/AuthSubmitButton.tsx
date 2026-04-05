"use client"

interface AuthSubmitButtonProps {
  loading: boolean
  children: React.ReactNode
  disabled?: boolean
}

export default function AuthSubmitButton({ loading, children, disabled }: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Please wait...
        </span>
      ) : (
        children
      )}
    </button>
  )
}
