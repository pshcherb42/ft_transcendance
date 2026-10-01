'use client';

import { useMemo, useSyncExternalStore } from 'react';

// Chart.js paints on <canvas>, so it can't use var(--x) directly.
// Read the resolved values from globals.css and re-read on theme switch.
const VARS = {
  surface: '--surface',
  textPrimary: '--foreground',
  textSecondary: '--muted-foreground',
  muted: '--subtle',
  grid: '--border',
  good: '--brand-green',
  critical: '--brand-red',
  seriesYou: '--brand-green',
  seriesOpponent: '--brand-red',
} as const;

export type ChartColors = Record<keyof typeof VARS, string>;

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
}

function readColors(): ChartColors {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    Object.entries(VARS).map(([key, cssVar]) => [
      key,
      style.getPropertyValue(cssVar).trim(),
    ]),
  ) as ChartColors;
}

// null during SSR / before hydration, then the live palette.
export function useChartColors(): ChartColors | null {
  const theme = useSyncExternalStore(
    subscribe,
    () => document.documentElement.getAttribute('data-theme') ?? 'light',
    () => null,
  );
  return useMemo(() => (theme === null ? null : readColors()), [theme]);
}
