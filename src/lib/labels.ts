import type {
  InvoiceStatus,
  MemberRole,
  ProjectKind,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from "@/lib/database.types";

export const ROLE_LABEL: Record<MemberRole, string> = {
  admin: "Admin",
  manager: "Manager",
  member: "Team Member",
  client: "Client",
};

export const PROJECT_KIND_LABEL: Record<ProjectKind, string> = {
  seo: "SEO",
  social: "Social Media",
  ppc: "PPC / Ads",
  content: "Content",
  web: "Web / Dev",
  branding: "Branding",
  email: "Email Marketing",
  other: "Other",
};

export const PROJECT_KINDS = Object.keys(PROJECT_KIND_LABEL) as ProjectKind[];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PROJECT_STATUSES = Object.keys(
  PROJECT_STATUS_LABEL,
) as ProjectStatus[];

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export const PROJECT_STATUS_TONE: Record<ProjectStatus, Tone> = {
  planning: "info",
  active: "success",
  on_hold: "warning",
  completed: "neutral",
  cancelled: "danger",
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "In Review",
  done: "Done",
};

export const TASK_STATUSES = Object.keys(TASK_STATUS_LABEL) as TaskStatus[];

export const TASK_STATUS_ACCENT: Record<TaskStatus, string> = {
  todo: "border-slate-300",
  in_progress: "border-brand-400",
  review: "border-amber-400",
  done: "border-green-400",
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const TASK_PRIORITIES = Object.keys(
  TASK_PRIORITY_LABEL,
) as TaskPriority[];

export const TASK_PRIORITY_TONE: Record<TaskPriority, Tone> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  urgent: "danger",
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export const INVOICE_STATUSES = Object.keys(
  INVOICE_STATUS_LABEL,
) as InvoiceStatus[];

export const INVOICE_STATUS_TONE: Record<InvoiceStatus, Tone> = {
  draft: "neutral",
  sent: "info",
  paid: "success",
  overdue: "danger",
  cancelled: "neutral",
};
