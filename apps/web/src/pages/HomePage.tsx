import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useRevealBoot } from "../components/landing/useReveal";
import AuthModal from "../components/AuthModal";
import Navbar from "../components/landing/Navbar";
import HeroSection from "../components/landing/HeroSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import WorkflowSection from "../components/landing/WorkflowSection";
import Footer from "../components/landing/Footer";

interface HomePageProps {
  onJoinRoom: (slug: string, userName: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onJoinRoom }) => {
  const { user, isAuthenticated, logout, authFetch } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("codesync_user") || `Dev-${Math.floor(100 + Math.random() * 900)}`;
  });
  const [roomSlug, setRoomSlug] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");
  const [recentRooms, setRecentRooms] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("codesync_recent_rooms") || "[]");
    } catch {
      return [];
    }
  });

  useRevealBoot();

  const activeDisplayName = user ? user.username : userName;

  const saveRecentRoom = (slug: string) => {
    try {
      const updated = [slug, ...recentRooms.filter((s) => s !== slug)].slice(0, 5);
      setRecentRooms(updated);
      localStorage.setItem("codesync_recent_rooms", JSON.stringify(updated));
    } catch {}
  };

  const handleOpenAuth = (mode: "login" | "register" = "login") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      localStorage.setItem("codesync_user", activeDisplayName);
      const res = await authFetch("/api/rooms/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${activeDisplayName}'s Room`, language: "python" }),
      });
      if (!res.ok) {
        let errorDetail = "";
        try {
          const errData = await res.json();
          errorDetail = errData.detail || errData.error || (typeof errData === "object" ? JSON.stringify(errData) : "");
        } catch {
          try {
            errorDetail = await res.text();
          } catch {}
        }
        throw new Error(errorDetail || `Failed to create room (HTTP ${res.status}: ${res.statusText || "Server Error"})`);
      }
      const data = await res.json();
      saveRecentRoom(data.slug);
      onJoinRoom(data.slug, activeDisplayName);
    } catch (err: any) {
      setError(err.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomSlug.trim()) return;
    const cleanSlug = roomSlug.trim().replace(/^.*[?&]room=/, "");
    localStorage.setItem("codesync_user", activeDisplayName);
    saveRecentRoom(cleanSlug);
    onJoinRoom(cleanSlug, activeDisplayName);
  };

  const handleJoinRecent = (slug: string) => {
    saveRecentRoom(slug);
    onJoinRoom(slug, activeDisplayName);
  };

  return (
    <div className="min-h-screen bg-canvas text-fg">
      <Navbar
        user={user}
        isAuthenticated={isAuthenticated}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenAuth={handleOpenAuth}
        onLogout={() => logout()}
      />

      <main>
        <HeroSection
          activeDisplayName={activeDisplayName}
          isAuthenticated={isAuthenticated}
          onUserNameChange={setUserName}
          roomSlug={roomSlug}
          onRoomSlugChange={setRoomSlug}
          loading={loading}
          error={error}
          recentRooms={recentRooms}
          onCreateRoom={handleCreateRoom}
          onJoinExisting={handleJoinExisting}
          onJoinRecent={handleJoinRecent}
        />

        <FeaturesSection />
        <WorkflowSection />
      </main>

      <Footer onCreateRoom={handleCreateRoom} loading={loading} />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authModalMode}
      />
    </div>
  );
};

export default HomePage;
