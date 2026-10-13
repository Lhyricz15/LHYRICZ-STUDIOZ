# LHYRICZ STUDIOZ

A blue-note, black-wave music workspace for solfa writing, melody sketches, and choir-arrangement workflows.

## Current foundation

- Responsive React + TypeScript + Vite application.
- LHYRICZ STUDIOZ brand colors, custom note-and-wave favicon, and light/dark theme.
- Local composition workspace with browser-based saving.
- Basic solfa text editor, visual note sketch, key/tempo fields, and project-level solfa convention settings.
- JSON backup export and import.
- Installable web app manifest and a basic cached app shell for offline launch after the first visit.

## Planned, not yet implemented

- Fully synchronized pitch-accurate solfa and staff notation.
- Complete notation editing for rhythms, rests, accidentals, lyrics, time signatures, and chromatic solfa.
- Audio recording, key estimation, and melody extraction.
- SATB choir arrangements and tested PDF, MusicXML, MIDI, and PNG exports.
- Optional cloud sync and accounts.

The audio tools page is currently a preview and does not analyse audio yet. Export currently provides a JSON project backup; notation exports are planned. Do not rely on browser-local storage as the only copy of important work.

## Development

Requirements: Node.js LTS.

```bash
npm install
npm run dev
```

Build for deployment:

```bash
npm run build
npm run preview
```

## Storage and privacy

Compositions are stored in the browser's local storage on the current device and browser. They are not synced to a cloud database in this version. Download a backup before clearing browser data or switching devices.

## Brand

Primary blue: `#3478F6`
Dark ink: `#111827`
