import { HTMLAttributes } from "react";

export type BadgeVariant =
  | "default"
  | "gray"
  | "indigo"
  | "green"
  | "red"
  | "yellow"
  | "amber"
  | "blue"
  | "purple";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-gray-800 text-gray-200 border-gray-700",
  gray: "bg-gray-800 text-gray-300 border-gray-700",
  indigo: "bg-indigo-950 text-indigo-300 border-indigo-800",
  green: "bg-emerald-950 text-emerald-300 border-emerald-800",
  red: "bg-red-950 text-red-300 border-red-800",
  yellow: "bg-yellow-950 text-yellow-300 border-yellow-800",
  amber: "bg-amber-950 text-amber-300 border-amber-800",
  blue: "bg-blue-950 text-blue-300 border-blue-800",
  purple: "bg-purple-950 text-purple-300 border-purple-800",
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
};

export function Badge({
  variant = "default",
  size = "sm",
  children,
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
