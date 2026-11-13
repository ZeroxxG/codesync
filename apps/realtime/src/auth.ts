export interface AuthContext {
  userId?: number;
  username: string;
  role: "owner" | "editor" | "viewer";
  isGuest: boolean;
}

export function decodeJwtPayload(token: string): { user_id?: number; exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payloadStr = Buffer.from(parts[1], "base64").toString("utf-8");
    return JSON.parse(payloadStr);
  } catch {
    return null;
  }
}

export async function verifyRoomAccess(
  documentName: string,
  token?: string,
  inviteToken?: string,
  displayName?: string
): Promise<AuthContext> {
  const internalApiUrl = process.env.INTERNAL_API_URL || "http://localhost:8000";
  let internalToken = process.env.INTERNAL_API_TOKEN || "codesync-internal-token-change-in-prod";
  if (internalToken === "CHANGE_ME") {
    internalToken = "codesync-internal-token-change-in-prod";
  }

  let userId: number | undefined;

  if (token) {
    const payload = decodeJwtPayload(token);
    if (payload?.exp && payload.exp * 1000 < Date.now()) {
      throw new Error("Authentication token has expired");
    }
    if (payload?.user_id) {
      userId = payload.user_id;
    }
  }

  const queryParams = new URLSearchParams();
  if (userId) queryParams.set("user_id", String(userId));
  if (inviteToken) {
    queryParams.set("token", inviteToken);
    queryParams.set("viewer_token", inviteToken);
    queryParams.set("editor_token", inviteToken);
  }

  const url = `${internalApiUrl}/internal/rooms/${encodeURIComponent(documentName)}/role/?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Internal-Token": internalToken,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[Realtime Auth] Access denied for room "${documentName}": ${response.status} ${errorText}`);
      throw new Error(`Unauthorized: access to room "${documentName}" was rejected`);
    }

    const data = await response.json();
    return {
      userId: data.user_id,
      username: data.username || displayName || `User-${data.user_id || "Guest"}`,
      role: data.role as "owner" | "editor" | "viewer",
      isGuest: Boolean(data.is_guest),
    };
  } catch (err: any) {
    if (err.message.startsWith("Unauthorized")) throw err;
    console.error(`[Realtime Auth] Failed to contact Django internal auth service:`, err.message);
    throw new Error("Internal authorization service unavailable");
  }
}
