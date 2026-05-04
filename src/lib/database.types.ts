// Hand-maintained row types matching supabase/migrations.
// Keep in sync when migrations change.

export type MemberRole = "admin" | "manager" | "member" | "client";
export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";
export type ProjectKind =
  | "seo"
  | "social"
  | "ppc"
  | "content"
  | "web"
  | "branding"
  | "email"
  | "other";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type InvoiceStatus =
  | "draft"
  | "sent"
  | "paid"
  | "overdue"
  | "cancelled";

export interface ProfileRow {
  id: string;
  role: MemberRole;
  full_name: string;
  email: string;
  avatar_url: string | null;
  job_title: string | null;
  hourly_rate: number | null;
  client_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ClientRow {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  notes: string | null;
  monthly_retainer: number | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface ProjectRow {
  id: string;
  client_id: string;
  name: string;
  kind: ProjectKind;
  status: ProjectStatus;
  description: string | null;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  manager_id: string | null;
  is_visible_to_client: boolean;
  created_at: string;
  created_by: string | null;
}

export interface ProjectMemberRow {
  project_id: string;
  profile_id: string;
  added_at: string;
}

export interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  position: number;
  is_visible_to_client: boolean;
  created_at: string;
  completed_at: string | null;
  created_by: string | null;
}

export interface TaskCommentRow {
  id: string;
  task_id: string;
  author_id: string | null;
  body: string;
  is_visible_to_client: boolean;
  created_at: string;
}

export interface TimeLogRow {
  id: string;
  member_id: string;
  project_id: string;
  task_id: string | null;
  log_date: string;
  hours: number;
  description: string | null;
  is_billable: boolean;
  created_at: string;
}

export interface InvoiceRow {
  id: string;
  number: string;
  client_id: string;
  project_id: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
  created_by: string | null;
}

export interface InvoiceItemRow {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  position: number;
}
