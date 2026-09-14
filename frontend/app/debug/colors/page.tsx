'use client';

import { notFound } from 'next/navigation';

if (process.env.NODE_ENV === 'production') notFound();

// Keep this in sync by hand: whenever a value changes in globals.css,
// copy the same hex/rgba straight into the matching light/dark field below.
const swatches: { varName: string; note: string; light: string; dark: string }[] = [
  { varName: '--background', note: 'page background', light: '#f4f2ee', dark: '#1a1715' },
  { varName: '--surface', note: 'card/panel background', light: '#eee9e6', dark: '#26211f' },
  { varName: '--border', note: 'card and input borders', light: '#d9d5d1', dark: '#3a332f' },
  { varName: '--muted', note: 'offline dots, disabled-ish', light: '#cfc5c1', dark: '#4a4340' },
  { varName: '--subtle', note: 'secondary text, dots/separators', light: '#b5acac', dark: '#8a817d' },
  { varName: '--muted-foreground', note: 'secondary/body text', light: '#615050', dark: '#b0a8a3' },
  { varName: '--foreground', note: 'primary text', light: '#1a1a1a', dark: '#f0ece7' },
  { varName: '--canvas', note: 'game canvas background', light: '#171717', dark: '#171717' },
  { varName: '--brand-red', note: 'primary accent', light: '#ee4424', dark: '#d6381c' },
  { varName: '--brand-red-dark', note: 'red hover state', light: '#d6381c', dark: '#ee4424' },
  { varName: '--decline', note: 'soft red, decline action', light: '#e0897a', dark: '#e69686' },
  { varName: '--brand-green', note: 'secondary accent', light: '#9da995', dark: '#808979' },
  { varName: '--brand-green-dark', note: 'green hover state', light: '#808979', dark: '#9da995' },
  { varName: '--status-online', note: 'online-presence indicator', light: '#8ebe78', dark: '#96c682' },
  { varName: '--notice', note: 'actionable-notification card background', light: '#f5dcd3', dark: '#3d2b26' },
  { varName: '--card-shadow', note: 'card drop-shadow color', light: 'rgba(193, 168, 163, 0.25)', dark: 'rgba(0, 0, 0, 0.7)' },
];

function Palette({
  title,
  bg,
  fg,
  pick,
}: {
  title: string;
  bg: string;
  fg: string;
  pick: (s: (typeof swatches)[number]) => string;
}) {
  return (
    <section className="rounded-[10px] p-6" style={{ backgroundColor: bg }}>
      <h2 className="mb-4 font-display text-xl uppercase" style={{ color: fg }}>
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {swatches.map((s) => (
          <div
            key={s.varName}
            className="overflow-hidden rounded-[10px] border"
            style={{ borderColor: pick(swatches.find((x) => x.varName === '--border')!) }}
          >
            <div className="h-20 w-full" style={{ backgroundColor: pick(s) }} />
            <div
              className="p-2"
              style={{
                backgroundColor: pick(swatches.find((x) => x.varName === '--surface')!),
              }}
            >
              <p className="font-mono text-xs font-semibold" style={{ color: fg }}>
                {s.varName}
              </p>
              <p className="font-mono text-[10px]" style={{ color: pick(swatches.find((x) => x.varName === '--muted-foreground')!) }}>
                {pick(s)}
              </p>
              <p className="mt-1 text-[11px]" style={{ color: pick(swatches.find((x) => x.varName === '--muted-foreground')!) }}>
                {s.note}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DebugColorsPage() {
  return (
    <main className="min-h-screen bg-background p-10">
      <h1 className="mb-1 font-display text-2xl uppercase text-brand-red">
        Color palette — light vs dark
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Both themes rendered directly, no OS toggle needed. Values are a
        manual copy of globals.css — update both when you change a color.
      </p>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <Palette
          title="Light"
          bg="#f4f2ee"
          fg="#1a1a1a"
          pick={(s) => s.light}
        />
        <Palette
          title="Dark"
          bg="#1a1715"
          fg="#f0ece7"
          pick={(s) => s.dark}
        />
      </div>
    </main>
  );
}
