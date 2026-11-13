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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-white mb-1">Share Room — {roomName}</h2>
        <p className="text-xs text-slate-400 mb-6">
          Invite teammates to collaborate or share a view-only link with stakeholders.
        </p>

        <div className="space-y-6">
          {/* Read Only Link */}
          <div className="space-y-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-1.5 text-amber-400">
                <Eye className="w-4 h-4" />
                <span>Read-Only Share Link (Public Access)</span>
              </div>
              {isOwner && onRefreshViewerToken && (
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                  title="Generate new token and invalidate previous link"
                >
                  <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
                  <span>Reset Token</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Anyone with this link can view code in real-time without signing in.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={viewUrl || "Generating view link..."}
                className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-amber-200/90 focus:outline-none"
              />
              <button
                onClick={() => viewUrl && handleCopy(viewUrl, "view")}
                disabled={!viewUrl}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  viewUrl
                    ? "bg-amber-600 hover:bg-amber-500 text-white cursor-pointer"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                }`}
              >
                {copiedType === "view" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedType === "view" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Edit / Collaborate Link */}
          <div className="space-y-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
              <Users className="w-4 h-4" />
              <span>Collaborator Link (Full Edit Access)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Registered members with edit permissions can collaborate using this link.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={editUrl}
                className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-blue-200/90 focus:outline-none"
              />
              <button
                onClick={() => handleCopy(editUrl, "edit")}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors"
              >
                {copiedType === "edit" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedType === "edit" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Member Invitation (Owners only) */}
          {isOwner && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Room Collaborators</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  {members.length} member{members.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* Add member form */}
              <form onSubmit={handleAddMember} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Invite user by username..."
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as "editor" | "viewer")}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  type="submit"
                  disabled={addingMember || !newUsername.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{addingMember ? "Adding..." : "Add"}</span>
                </button>
              </form>

              {memberError && (
                <p className="text-[11px] text-rose-400">{memberError}</p>
              )}

              {/* Members list */}
              {loadingMembers ? (
                <div className="text-center py-2 text-xs text-slate-500">Loading collaborators...</div>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between bg-slate-800/50 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-200">{member.username}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            member.role === "owner"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : member.role === "editor"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {member.role}
                        </span>
                      </div>
                      {member.role !== "owner" && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1 rounded"
                          title="Remove collaborator"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
