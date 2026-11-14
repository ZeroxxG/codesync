import { useEffect, useState } from "react";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";

function MainContent() {
  const [currentRoom, setCurrentRoom] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("room")) {
      return params.get("room");
    }
    const hashMatch = window.location.hash.match(/#\/room\/([^/?]+)/);
    if (hashMatch) {
      return hashMatch[1];
    }
    const token =
      params.get("invite") ||
      params.get("invite_token") ||
      params.get("token") ||
      params.get("viewer_token") ||
      params.get("editor_token");
    if (token) {
      return token;
    }
    return null;
  });

  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("codesync_user") || `Dev-${Math.floor(100 + Math.random() * 900)}`;
  });

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const room =
        params.get("room") ||
        params.get("invite") ||
        params.get("invite_token") ||
        params.get("token") ||
        params.get("viewer_token") ||
        params.get("editor_token");
      setCurrentRoom(room);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleJoinRoom = (slug: string, name: string) => {
    setUserName(name);
    setCurrentRoom(slug);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("room", slug);
    window.history.pushState({}, "", newUrl.toString());
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete("room");
    window.history.pushState({}, "", newUrl.pathname);
  };

  if (!currentRoom) {
    return <HomePage onJoinRoom={handleJoinRoom} />;
  }

  return (
    <RoomPage
      roomSlug={currentRoom}
      userName={userName}
      onLeaveRoom={handleLeaveRoom}
    />
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
