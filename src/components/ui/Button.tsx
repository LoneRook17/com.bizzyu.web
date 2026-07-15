import Link from "next/link";
import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "outline" | "white";
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  external?: boolean;
}

export default function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  onClick,
  external = false,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 cursor-pointer";

  // Brand green only ever FILLS; ink letters it. White on #05EB54 is 1.61:1
  // and on the gradient's dark end 2.15:1 — both fail AA at any size. Green
  // text on white is 1.61:1 too, so `outline` uses the accessible green
  // (#0A8038, 5.05:1). Fixed here rather than at each call site: this had been
  // patched with `!text-ink` in seven places and still missed pages.
  const variants = {
    primary: "bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] text-ink hover:brightness-105 shadow-lg shadow-primary/25",
    outline: "border-2 border-primary text-primary-dark hover:bg-primary hover:text-ink",
    white: "bg-white text-ink hover:bg-gray-100 shadow-lg",
  };

  const sizes = {
    sm: "px-5 py-2 text-sm",
    md: "px-7 py-3 text-base",
    lg: "px-9 py-4 text-lg",
  };

  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (href && external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
      </a>
    );
  }

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
