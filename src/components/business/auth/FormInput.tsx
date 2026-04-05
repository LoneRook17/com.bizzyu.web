"use client"

interface FormInputProps {
  label: string
  name: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  placeholder?: string
  required?: boolean
  autoComplete?: string
  disabled?: boolean
  maxLength?: number
}

export default function FormInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  required,
  autoComplete,
  disabled,
  maxLength,
}: FormInputProps) {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        disabled={disabled}
        maxLength={maxLength}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm transition-colors outline-none
          ${error ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"}
          ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white text-ink"}`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
