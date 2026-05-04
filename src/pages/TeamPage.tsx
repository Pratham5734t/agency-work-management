import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/Avatar";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Label } from "@/components/ui/Label";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTeam, useUpdateMemberRole, useUpdateOwnProfile } from "@/queries/team";
import { useClients } from "@/queries/clients";
import { ROLE_LABEL } from "@/lib/labels";
import { formatDateShort } from "@/lib/format";
import type { MemberRole, ProfileRow } from "@/lib/database.types";

export function TeamPage() {
  const { profile, refreshProfile } = useAuth();
  const team = useTeam({ excludeClients: false });
  const clients = useClients();
  const isAdmin = profile?.role === "admin";
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");

  const clientById = useMemo(
    () => new Map((clients.data ?? []).map((c) => [c.id, c])),
    [clients.data],
  );

  if (team.isLoading) return <PageSpinner />;

  const members = (team.data ?? []).filter((m) =>
    !search.trim()
      ? true
      : (m.full_name + " " + m.email)
          .toLowerCase()
          .includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Team"
        description="Members of your agency workspace."
        actions={
          <Button variant="secondary" onClick={() => setProfileOpen(true)}>
            Edit my profile
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {members.length === 0 ? (
        <EmptyState title="No team members" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <Card key={m.id}>
              <CardBody>
                <div className="flex items-start gap-3">
                  <Avatar name={m.full_name || m.email} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-slate-900">
                        {m.full_name || m.email}
                      </h3>
                      {!m.is_active ? (
                        <Badge tone="neutral">Inactive</Badge>
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {m.email}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <Badge
                        tone={
                          m.role === "admin"
                            ? "danger"
                            : m.role === "manager"
                              ? "warning"
                              : m.role === "member"
                                ? "info"
                                : "neutral"
                        }
                      >
                        {ROLE_LABEL[m.role]}
                      </Badge>
                      {m.role === "client" && m.client_id ? (
                        <span className="text-slate-500">
                          {clientById.get(m.client_id)?.name ?? "—"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div>
                    <div className="uppercase tracking-wide">Joined</div>
                    <div className="text-sm font-medium text-slate-800">
                      {formatDateShort(m.created_at)}
                    </div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wide">Title</div>
                    <div className="text-sm font-medium text-slate-800">
                      {m.job_title ?? "—"}
                    </div>
                  </div>
                </div>
                {isAdmin && m.id !== profile?.id ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3 w-full"
                    onClick={() => setEditing(m)}
                  >
                    Change role
                  </Button>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {isAdmin && editing ? (
        <ChangeRoleModal
          member={editing}
          clients={(clients.data ?? []).filter((c) => c.is_active)}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {profileOpen && profile ? (
        <EditOwnProfileModal
          initial={profile}
          onClose={() => setProfileOpen(false)}
          onSaved={async () => {
            await refreshProfile();
            setProfileOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function ChangeRoleModal({
  member,
  clients,
  onClose,
}: {
  member: ProfileRow;
  clients: { id: string; name: string }[];
  onClose: () => void;
}) {
  const update = useUpdateMemberRole();
  const toast = useToast();
  const [role, setRole] = useState<MemberRole>(member.role);
  const [clientId, setClientId] = useState(member.client_id ?? "");

  const onSave = async () => {
    try {
      await update.mutateAsync({
        id: member.id,
        role,
        clientId: role === "client" ? clientId || null : null,
      });
      toast.success("Role updated");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Change role: ${member.full_name || member.email}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            loading={update.isPending}
            disabled={role === "client" && !clientId}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label>Role</Label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="member">Team Member</option>
            <option value="client">Client</option>
          </select>
        </div>
        {role === "client" ? (
          <div>
            <Label required>Linked client</Label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function EditOwnProfileModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: ProfileRow;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const update = useUpdateOwnProfile();
  const toast = useToast();
  const [fullName, setFullName] = useState(initial.full_name);
  const [jobTitle, setJobTitle] = useState(initial.job_title ?? "");

  const onSave = async () => {
    try {
      await update.mutateAsync({
        full_name: fullName.trim(),
        job_title: jobTitle.trim() || null,
      });
      toast.success("Profile updated");
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="My profile"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} loading={update.isPending}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label>Full name</Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <Label>Job title</Label>
          <Input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
