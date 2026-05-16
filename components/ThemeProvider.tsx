"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeState | null>(null);

const STORAGE_KEY = "momentum-theme";

function resolve(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

function apply(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const stored =
      (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    const next = stored === "light" || stored === "dark" ? stored : "system";
    setThemeState(next);
    const r = resolve(next);
    setResolved(r);
    apply(r);
  }, []);

  // Follow the system preference when theme === "system".
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const r = mql.matches ? "dark" : "light";
      setResolved(r);
      apply(r);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    const r = resolve(t);
    setResolved(r);
    apply(r);
  }, []);

  const toggle = useCallback(() => {
    setTheme(resolved === "dark" ? "light" : "dark");
  }, [resolved, setTheme]);

  return (
    <Ctx.Provider value={{ theme, resolved, setTheme, toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe fallback if used outside the provider — render as light.
    return {
      theme: "light" as Theme,
      resolved: "light" as ResolvedTheme,
      setTheme: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}

/**
 * Inline script string. Renders before React mounts so the dark class is on
 * <html> before paint — avoids a white flash on dark-mode page loads.
 */
export const THEME_NO_FLASH_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem('${STORAGE_KEY}') || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;
