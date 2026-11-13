import React, { useState } from "react";
import { Check, Copy, Eye, RefreshCw, Users, X } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomSlug: string;
  roomName: string;
  viewerToken?: string;
  isOwner: boolean;
  onRefreshViewerToken?: () => Promise<string>;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  roomSlug,
  roomName,
  viewerToken,
  isOwner,
  onRefreshViewerToken,
}) => {
  const [copiedType, setCopiedType] = useState<"edit" | "view" | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentToken, setCurrentToken] = useState(viewerToken);

  if (!isOpen) return null;

  const origin = window.location.origin;
  const editUrl = `${origin}?room=${roomSlug}`;
  const viewUrl = currentToken ? `${origin}?room=${roomSlug}&viewer_token=${currentToken}` : editUrl;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7">
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

        <div className="space-y-5">
          {/* Edit / Collaborate Link */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Users className="w-4 h-4 text-blue-400" />
              <span>Collaborator Link (Full Edit Access)</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={editUrl}
                className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none"
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

          {/* View Only Link */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Read-Only Share Link (Viewers cannot edit)</span>
              </div>
              {isOwner && onRefreshViewerToken && (
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                  title="Generate new link and invalidate previous link"
                >
                  <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
                  <span>Reset Link</span>
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={viewUrl}
                className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none"
              />
              <button
                onClick={() => handleCopy(viewUrl, "view")}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                {copiedType === "view" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedType === "view" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
