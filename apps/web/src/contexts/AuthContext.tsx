import React, { createContext, useContext, useEffect, useState } from "react";

export interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, passwordConfirm: string) => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem("codesync_access_token"));
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem("codesync_refresh_token"));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch current user on mount if token exists
  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/me/", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (res.ok) {
          const userData = await res.json();
          if (mounted) setUser(userData);
        } else if (res.status === 401 && refreshToken) {
          // Attempt refresh
          const refreshRes = await fetch("/api/auth/refresh/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem("codesync_access_token", data.access);
            if (data.refresh) {
              localStorage.setItem("codesync_refresh_token", data.refresh);
              if (mounted) setRefreshToken(data.refresh);
            }
            if (mounted) setAccessToken(data.access);

            // Retry me
            const retryMe = await fetch("/api/auth/me/", {
              headers: { Authorization: `Bearer ${data.access}` },
            });
            if (retryMe.ok && mounted) {
              setUser(await retryMe.json());
            }
          } else {
            // Failed refresh
            if (mounted) {
              setAccessToken(null);
              setRefreshToken(null);
              localStorage.removeItem("codesync_access_token");
              localStorage.removeItem("codesync_refresh_token");
            }
          }
        }
      } catch {
        // Network error
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, [accessToken, refreshToken]);

  const login = async (username: string, password: string) => {
    const res = await fetch("/api/auth/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.non_field_errors?.[0] || err.detail || "Invalid credentials");
    }

    const data = await res.json();
    setUser(data.user);
    setAccessToken(data.access);
    setRefreshToken(data.refresh);
    localStorage.setItem("codesync_access_token", data.access);
    localStorage.setItem("codesync_refresh_token", data.refresh);
    localStorage.setItem("codesync_user", data.user.username);
  };

  const register = async (username: string, email: string, password: string, passwordConfirm: string) => {
    const res = await fetch("/api/auth/register/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        email,
        password,
        password_confirm: passwordConfirm,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      const firstError = Object.values(err)[0];
      throw new Error(Array.isArray(firstError) ? firstError[0] : "Registration failed");
    }

    const data = await res.json();
    setUser(data.user);
    setAccessToken(data.access);
    setRefreshToken(data.refresh);
    localStorage.setItem("codesync_access_token", data.access);
    localStorage.setItem("codesync_refresh_token", data.refresh);
    localStorage.setItem("codesync_user", data.user.username);
  };

  const logout = async () => {
    if (accessToken && refreshToken) {
      try {
        await fetch("/api/auth/logout/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refresh: refreshToken }),
        });
      } catch {
        // Ignore logout request errors
      }
    }

    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem("codesync_access_token");
    localStorage.removeItem("codesync_refresh_token");
  };

  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers || {});
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    let response = await fetch(url, { ...options, headers });

    // Handle token expiration & retry once
    if (response.status === 401 && refreshToken) {
      const refreshRes = await fetch("/api/auth/refresh/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setAccessToken(data.access);
        localStorage.setItem("codesync_access_token", data.access);
        headers.set("Authorization", `Bearer ${data.access}`);
        response = await fetch(url, { ...options, headers });
      } else {
        await logout();
      }
    }

    return response;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: Boolean(user && accessToken),
        isLoading,
        login,
        register,
        logout,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
