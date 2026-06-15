'use client';

import { useEffect, useState } from 'react';

type Theme = 'system' | 'light' | 'dark';

const ORDER: Theme[] = ['system', 'light', 'dark'];

function getCookieTheme(): Theme {
  if (typeof document === 'undefined') return 'system';
  const m = document.cookie.match(/(?:^|; )theme=([^;]+)/);
  return (m?.[1] as Theme) ?? 'system';
}

function setThemeCookie(t: Theme) {
  document.cookie = `theme=${t}; path=/; max-age=${365 * 24 * 3600}; SameSite=Lax`;
}

function applyTheme(t: Theme) {
  const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    setTheme(getCookieTheme());
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
    setThemeCookie(next);
    applyTheme(next);
  }

  const icons: Record<Theme, string> = { system: '⚙️', light: '☀️', dark: '🌙' };

  return (
    <button
      onClick={cycle}
      className="opacity-80 hover:opacity-100 transition-opacity text-sm leading-none"
      title={`Theme: ${theme} (click to cycle)`}
      aria-label={`Current theme: ${theme}`}
    >
      {icons[theme]}
    </button>
  );
}
