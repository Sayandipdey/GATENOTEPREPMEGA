import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`bg-gray-900 border border-gray-800 rounded-xl shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", ...props }: CardSectionProps) {
  return (
    <div
      className={`px-6 py-4 border-b border-gray-800 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className = "", ...props }: CardSectionProps) {
  return (
    <div className={`px-6 py-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "", ...props }: CardSectionProps) {
  return (
    <div
      className={`px-6 py-4 border-t border-gray-800 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
