import { useMemo, useState } from "react";
import type { DragEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/format";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_TONE,
  TASK_STATUSES,
  TASK_STATUS_ACCENT,
  TASK_STATUS_LABEL,
} from "@/lib/labels";
import type {
  ProfileRow,
  TaskPriority,
  TaskRow,
  TaskStatus,
} from "@/lib/database.types";
import {
  useAddTaskComment,
  useCreateTask,
  useDeleteTask,
  useMoveTask,
  useTaskComments,
  useUpdateTask,
} from "@/queries/tasks";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  projectId: string;
  tasks: TaskRow[];
  team: ProfileRow[];
  canEdit: boolean;
}

export function TaskBoard({ projectId, tasks, team, canEdit }: Props) {
  const [openTask, setOpenTask] = useState<TaskRow | null>(null);
  const [newCol, setNewCol] = useState<TaskStatus | null>(null);

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, TaskRow[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    const sorted = [...tasks].sort((a, b) => a.position - b.position);
    for (const t of sorted) map[t.status].push(t);
    return map;
  }, [tasks]);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TASK_STATUSES.map((s) => (
          <Column
            key={s}
            status={s}
            tasks={grouped[s]}
            team={team}
            canEdit={canEdit}
            onOpen={setOpenTask}
            onAdd={canEdit ? () => setNewCol(s) : undefined}
          />
        ))}
      </div>

      {openTask ? (
        <TaskModal
          task={openTask}
          team={team}
          canEdit={canEdit}
          onClose={() => setOpenTask(null)}
        />
      ) : null}

      {canEdit && newCol ? (
        <NewTaskModal
          projectId={projectId}
          status={newCol}
          team={team}
          onClose={() => setNewCol(null)}
        />
      ) : null}
    </div>
  );
}

function Column({
  status,
  tasks,
  team,
  canEdit,
  onOpen,
  onAdd,
}: {
  status: TaskStatus;
  tasks: TaskRow[];
  team: ProfileRow[];
  canEdit: boolean;
  onOpen: (t: TaskRow) => void;
  onAdd?: () => void;
}) {
  const move = useMoveTask();
  const [hovering, setHovering] = useState(false);

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setHovering(false);
    if (!canEdit) return;
    const id = e.dataTransfer.getData("text/task-id");
    if (!id) return;
    const lastPos = tasks.at(-1)?.position ?? 0;
    try {
      await move.mutateAsync({ id, status, position: lastPos + 10 });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        setHovering(true);
      }}
      onDragLeave={() => setHovering(false)}
      onDrop={handleDrop}
      className={cn(
        "flex h-full min-h-[14rem] flex-col rounded-xl border-2 bg-slate-50/60 transition",
        TASK_STATUS_ACCENT[status],
        hovering ? "ring-2 ring-brand-300" : "",
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">
            {TASK_STATUS_LABEL[status]}
          </span>
          <span className="rounded-full bg-slate-200 px-2 text-xs font-medium text-slate-700">
            {tasks.length}
          </span>
        </div>
        {onAdd ? (
          <button
            onClick={onAdd}
            className="rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
          >
            + Add
          </button>
        ) : null}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">
            Drop tasks here
          </div>
        ) : (
          tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              team={team}
              canEdit={canEdit}
              onOpen={() => onOpen(t)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  team,
  canEdit,
  onOpen,
}: {
  task: TaskRow;
  team: ProfileRow[];
  canEdit: boolean;
  onOpen: () => void;
}) {
  const assignee = team.find((m) => m.id === task.assignee_id);
  const overdue =
    !!task.due_date &&
    task.status !== "done" &&
    new Date(task.due_date) < new Date();
  return (
    <div
      draggable={canEdit}
      onDragStart={(e) => e.dataTransfer.setData("text/task-id", task.id)}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" ? onOpen() : null)}
      className={cn(
        "cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-brand-300 hover:shadow",
        canEdit ? "cursor-grab" : "cursor-pointer",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-medium text-slate-900">
            {task.title}
          </div>
          {task.description ? (
            <div className="mt-1 line-clamp-2 text-xs text-slate-500">
              {task.description}
            </div>
          ) : null}
        </div>
        <Badge tone={TASK_PRIORITY_TONE[task.priority]}>
          {TASK_PRIORITY_LABEL[task.priority]}
        </Badge>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {assignee ? (
            <>
              <Avatar name={assignee.full_name || assignee.email} size="xs" />
              <span className="truncate text-slate-600">
                {assignee.full_name || assignee.email}
              </span>
            </>
          ) : (
            <span className="text-slate-400">Unassigned</span>
          )}
        </div>
        {task.due_date ? (
          <span className={cn(overdue ? "text-red-600" : "text-slate-500")}>
            {overdue ? "⚠ " : ""}
            {formatDateShort(task.due_date)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function NewTaskModal({
  projectId,
  status,
  team,
  onClose,
}: {
  projectId: string;
  status: TaskStatus;
  team: ProfileRow[];
  onClose: () => void;
}) {
  const create = useCreateTask();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [estimated, setEstimated] = useState<string>("");
  const [visibleToClient, setVisibleToClient] = useState(false);

  const onSubmit = async () => {
    if (!title.trim()) return;
    try {
      await create.mutateAsync({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
        estimated_hours: estimated ? Number(estimated) : null,
        is_visible_to_client: visibleToClient,
      });
      toast.success("Task created");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`New task — ${TASK_STATUS_LABEL[status]}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={create.isPending}>
            Create
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label required>Title</Label>
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Priority</Label>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {TASK_PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Assignee</Label>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {team
                .filter((m) => m.role !== "client" && m.is_active)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <Label>Due date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Estimated hours</Label>
            <Input
              type="number"
              min={0}
              step={0.25}
              value={estimated}
              onChange={(e) => setEstimated(e.target.value)}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={visibleToClient}
            onChange={(e) => setVisibleToClient(e.target.checked)}
          />
          Visible in client portal
        </label>
      </div>
    </Modal>
  );
}

function TaskModal({
  task,
  team,
  canEdit,
  onClose,
}: {
  task: TaskRow;
  team: ProfileRow[];
  canEdit: boolean;
  onClose: () => void;
}) {
  const update = useUpdateTask();
  const del = useDeleteTask();
  const toast = useToast();
  const { profile } = useAuth();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [assigneeId, setAssigneeId] = useState(task.assignee_id ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [visibleToClient, setVisibleToClient] = useState(
    task.is_visible_to_client,
  );

  const comments = useTaskComments(task.id);
  const addComment = useAddTaskComment();
  const [commentBody, setCommentBody] = useState("");
  const [commentVisible, setCommentVisible] = useState(false);

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        id: task.id,
        patch: {
          title: title.trim(),
          description: description.trim() || null,
          priority,
          status,
          assignee_id: assigneeId || null,
          due_date: dueDate || null,
          is_visible_to_client: visibleToClient,
        },
      });
      toast.success("Task saved");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this task?")) return;
    try {
      await del.mutateAsync(task.id);
      toast.success("Task deleted");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleAddComment = async () => {
    if (!commentBody.trim()) return;
    try {
      await addComment.mutateAsync({
        taskId: task.id,
        body: commentBody.trim(),
        isVisibleToClient: commentVisible,
      });
      setCommentBody("");
      setCommentVisible(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not comment");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={canEdit ? "Edit task" : "Task details"}
      size="lg"
      footer={
        canEdit ? (
          <>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
            <div className="flex-1" />
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={update.isPending}>
              Save
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      <div className="space-y-3">
        <div>
          <Label>Title</Label>
          <Input
            disabled={!canEdit}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            disabled={!canEdit}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Status</Label>
            <select
              disabled={!canEdit}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Priority</Label>
            <select
              disabled={!canEdit}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {TASK_PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Assignee</Label>
            <select
              disabled={!canEdit}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {team
                .filter((m) => m.role !== "client" && m.is_active)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <Label>Due date</Label>
            <Input
              disabled={!canEdit}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        {canEdit ? (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={visibleToClient}
              onChange={(e) => setVisibleToClient(e.target.checked)}
            />
            Visible in client portal
          </label>
        ) : null}

        <div className="border-t border-slate-200 pt-3">
          <div className="text-sm font-semibold text-slate-800">Comments</div>
          <ul className="mt-2 space-y-2">
            {(comments.data ?? []).map((c) => {
              const author = team.find((m) => m.id === c.author_id);
              return (
                <li key={c.id} className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Avatar name={author?.full_name ?? "?"} size="xs" />
                      <span>{author?.full_name || author?.email || "—"}</span>
                    </div>
                    {c.is_visible_to_client ? (
                      <Badge tone="info">Visible to client</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                    {c.body}
                  </p>
                </li>
              );
            })}
            {(comments.data ?? []).length === 0 ? (
              <li className="text-xs text-slate-500">No comments yet.</li>
            ) : null}
          </ul>
          {profile && profile.role !== "client" ? (
            <div className="mt-2">
              <Textarea
                rows={2}
                placeholder="Add a comment…"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
              />
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={commentVisible}
                    onChange={(e) => setCommentVisible(e.target.checked)}
                  />
                  Visible to client
                </label>
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  loading={addComment.isPending}
                  disabled={!commentBody.trim()}
                >
                  Post
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
