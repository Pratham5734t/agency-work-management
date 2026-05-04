import { initialsOf } from "@/lib/format";
import { cn } from "@/lib/cn";

const colors = [
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-pink-100 text-pink-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface Props {
  name: string | null | undefined;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeClass = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

export function Avatar({ name, size = "sm", className }: Props) {
  const safe = name?.trim() || "?";
  const initials = initialsOf(safe);
  const color = colors[hashName(safe) % colors.length];
  return (
    <span
      title={safe}
      className={cn(
        "inline-flex select-none items-center justify-center rounded-full font-semibold ring-1 ring-white",
        color,
        sizeClass[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}
