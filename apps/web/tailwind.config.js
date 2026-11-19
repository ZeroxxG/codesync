/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vscode: {
          editor: "var(--editor-bg)",
          sidebar: "var(--sidebar-bg)",
          panel: "var(--panel-bg)",
          activity: "var(--activity-bar-bg)",
          "activity-bar": "var(--activity-bar-bg)",
          toolbar: "var(--toolbar-bg)",
          statusbar: "var(--statusbar-bg)",
          border: "var(--border-color)",
          hover: "var(--hover-bg)",
          active: "var(--active-bg)",
          accent: "var(--accent)",
          selection: "var(--selection-bg)",
          text: "var(--text-primary)",
          muted: "var(--text-secondary)",
          tabActive: "var(--tab-active-bg)",
          tabInactive: "var(--tab-inactive-bg)",
          badge: "var(--badge-bg)",
          input: "var(--input-bg)",
        },
        background: "var(--editor-bg)",
        surface: "var(--sidebar-bg)",
        border: "var(--border-color)",
      },
      fontFamily: {
        mono: [
          "'JetBrains Mono'",
          "'Cascadia Code'",
          "'Fira Code'",
          "Consolas",
          "'Courier New'",
          "monospace",
        ],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
}
