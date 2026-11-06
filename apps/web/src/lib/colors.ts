export interface UserColor {
  color: string;
  light: string;
}

const PALETTE: UserColor[] = [
  { color: "#3b82f6", light: "rgba(59, 130, 246, 0.25)" }, // blue
  { color: "#10b981", light: "rgba(16, 185, 129, 0.25)" }, // emerald
  { color: "#f59e0b", light: "rgba(245, 158, 11, 0.25)" }, // amber
  { color: "#ec4899", light: "rgba(236, 72, 153, 0.25)" }, // pink
  { color: "#8b5cf6", light: "rgba(139, 92, 246, 0.25)" }, // purple
  { color: "#06b6d4", light: "rgba(6, 182, 212, 0.25)" },  // cyan
  { color: "#f97316", light: "rgba(249, 115, 22, 0.25)" }, // orange
  { color: "#14b8a6", light: "rgba(20, 184, 166, 0.25)" }, // teal
];

export function getUserColor(id: string | number): UserColor {
  let hash = 0;
  const str = String(id);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}
