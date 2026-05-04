import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: ReactNode;
}

export function Label({ required, className, children, ...rest }: Props) {
  return (
    <label
      {...rest}
      className={cn(
        "mb-1 block text-sm font-medium text-slate-700",
        className,
      )}
    >
      {children}
      {required ? <span className="ml-0.5 text-red-500">*</span> : null}
    </label>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

export function FieldHelp({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs text-slate-500">{children}</p>;
}
