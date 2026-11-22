import React, { useEffect, useState } from "react";
import { Check, Copy, Eye, RefreshCw, Users, X, UserPlus, Trash2, Shield } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface RoomMember {
  id: number;
  user_id: number;
  username: string;
  email: string;
  role: "owner" | "editor" | "viewer";
  created_at: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomSlug: string;
  roomName: string;
  viewerToken?: string;
  editorToken?: string;
  isOwner: boolean;
  onRefreshViewerToken?: () => Promise<string>;
}

const roleChip: Record<string, string> = {
  owner: "bg-accent/10 text-accentText border-accent/25",
  editor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  viewer: "bg-amber-500/10 text-amber-400 border-amber-500/25",
};

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  roomSlug,
  roomName,
  viewerToken,
  editorToken,
  isOwner,
  onRefreshViewerToken,
}) => {
  const { authFetch } = useAuth();
  const [copiedType, setCopiedType] = useState<"edit" | "view" | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentToken, setCurrentToken] = useState(viewerToken);

  // Members management state
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [memberRole, setMemberRole] = useState<"editor" | "viewer">("editor");
  const [memberError, setMemberError] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState(false);

  // Sync token whenever viewerToken prop updates
  useEffect(() => {
    if (viewerToken) {
      setCurrentToken(viewerToken);
    }
  }, [viewerToken]);

  // Load members when modal opens if owner
  useEffect(() => {
    if (!isOpen || !isOwner) return;

    let mounted = true;
    setLoadingMembers(true);
    authFetch(`/api/rooms/${roomSlug}/members/`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: RoomMember[]) => {
        if (mounted) {
          setMembers(data);
          setLoadingMembers(false);
        }
      })
      .catch(() => {
        if (mounted) setLoadingMembers(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, isOwner, roomSlug]);

  if (!isOpen) return null;

  const origin = window.location.origin;
  const editUrl = editorToken
    ? `${origin}?room=${roomSlug}&editor_token=${editorToken}`
    : `${origin}?room=${roomSlug}`;
  const effectiveToken = currentToken || viewerToken;
  const viewUrl = effectiveToken ? `${origin}?room=${roomSlug}&viewer_token=${effectiveToken}` : "";

  const handleCopy = (text: string, type: "edit" | "view") => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleRefresh = async () => {
    if (!onRefreshViewerToken) return;
    setRefreshing(true);
    try {
      const newToken = await onRefreshViewerToken();
      setCurrentToken(newToken);
    } catch {
      // Ignore refresh error
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    setAddingMember(true);
    setMemberError(null);

    try {
      const res = await authFetch(`/api/rooms/${roomSlug}/members/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          role: memberRole,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.username?.[0] || err.error || err.detail || "Could not add member");
      }

      const newMember: RoomMember = await res.json();
      setMembers((prev) => {
        const filtered = prev.filter((m) => m.user_id !== newMember.user_id);
        return [...filtered, newMember];
      });
      setNewUsername("");
    } catch (err: any) {
      setMemberError(err.message || "Failed to add collaborator");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    try {
      const res = await authFetch(`/api/rooms/${roomSlug}/members/${userId}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      }
    } catch {
      // Ignore delete failure
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="modal-shell max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="modal-head">
          <div className="flex items-center gap-3">
            <div className="icon-tile h-9 w-9">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-display text-base font-bold text-fg">Share room</h2>
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                {roomName} · #{roomSlug}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          {/* Read Only Link */}
          <section className="rounded-xl border border-line bg-canvas p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-amber-400" />
                <h3 className="text-[12px] font-semibold text-fg">Viewer link</h3>
                <span className="chip !py-0.5 !text-[9px]">read-only</span>
              </div>
              {isOwner && onRefreshViewerToken && (
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-fg"
                  title="Generate new token and invalidate previous link"
                >
                  <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
                  reset
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
              Anyone with this link can watch the room live without signing in.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                readOnly
                value={viewUrl || "Generating view link…"}
                className="field flex-1 !py-2 font-mono !text-[11px]"
              />
              <button
                onClick={() => viewUrl && handleCopy(viewUrl, "view")}
                disabled={!viewUrl}
                className="btn-quiet !px-3 !py-2 !text-[11px]"
              >
                {copiedType === "view" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedType === "view" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </section>

          {/* Edit / Collaborate Link */}
          <section className="rounded-xl border border-line bg-canvas p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-accentText" />
              <h3 className="text-[12px] font-semibold text-fg">Collaborator link</h3>
              <span className="chip !py-0.5 !text-[9px]">edit</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
              Signed-in members with edit permission can pair from this link.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                readOnly
                value={editUrl}
                className="field flex-1 !py-2 font-mono !text-[11px]"
              />
              <button
                onClick={() => handleCopy(editUrl, "edit")}
                className="btn-signal !px-3 !py-2 !text-[11px]"
              >
                {copiedType === "edit" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedType === "edit" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </section>

          {/* Member Invitation (Owners only) */}
          {isOwner && (
            <section className="space-y-3 border-t border-line pt-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-fg">
                  <Users className="h-3.5 w-3.5 text-muted" />
                  Collaborators
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                  {members.length} member{members.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* Add member form */}
              <form onSubmit={handleAddMember} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Invite by username…"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="field flex-1 !py-2 !text-xs"
                />
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as "editor" | "viewer")}
                  className="rounded-lg border border-line bg-canvas px-2 text-xs text-fg outline-none focus:border-accent/70"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  type="submit"
                  disabled={addingMember || !newUsername.trim()}
                  className="btn-ink !px-3 !py-2 !text-[11px]"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>{addingMember ? "Adding…" : "Add"}</span>
                </button>
              </form>

              {memberError && <p className="text-[11px] text-rose-400">{memberError}</p>}

              {/* Members list */}
              {loadingMembers ? (
                <div className="py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  Loading…
                </div>
              ) : (
                <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border border-line bg-canvas px-3 py-2 text-xs"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium text-fg">{member.username}</span>
                        <span
                          className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] ${roleChip[member.role]}`}
                        >
                          {member.role}
                        </span>
                      </div>
                      {member.role !== "owner" && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="rounded p-1 text-muted transition-colors hover:text-rose-400"
                          title="Remove collaborator"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {members.length === 0 && (
                    <p className="py-2 text-center text-[11px] text-muted">
                      No collaborators yet.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
