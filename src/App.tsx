import { useEffect, useMemo, useState } from 'react';
import {
  AudioLines, BookOpen, Check, ChevronDown, CircleHelp, Cloud, FileAudio2,
  FileMusic, Headphones, House, Library, Menu, Moon, Music2, Plus, Save,
  Settings2, Sparkles, Sun, Trash2, Upload, WandSparkles, X
} from 'lucide-react';

type Note = { id: string; solfa: string; pitch: number; duration: string };
type MusicProject = {
  id: string; title: string; updatedAt: string; key: string;
  convention: 'movable' | 'fixed'; minorConvention: 'la' | 'do'; tempo: number;
  solfaText: string; notes: Note[];
};
const STORE_KEY = 'lhyricz-studioz-projects-v1';
const THEME_KEY = 'lhyricz-studioz-theme';
const solfaNames = ['Do', 'Di/Ra', 'Re', 'Ri/Me', 'Mi', 'Fa', 'Fi/Se', 'Sol', 'Si/Le', 'La', 'Li/Te', 'Ti'];
const pitchNames = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

const pitchClass: Record<string, number> = { C:0, 'C♯':1, 'C#':1, 'D♭':1, D:2, 'D♯':3, 'D#':3, 'E♭':3, 'Eb':3, E:4, 'E♯':5, F:5, 'F♯':6, 'F#':6, 'G♭':6, G:7, 'G♯':8, 'G#':8, 'A♭':8, Ab:8, A:9, 'A♯':10, 'A#':10, 'B♭':10, Bb:10, B:11 };
const pitchLabels = ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const syllableOffsets: Record<string, number> = { do:0, di:1, ra:1, re:2, ri:3, me:3, mi:4, fa:5, fi:6, se:6, sol:7, so:7, si:8, le:8, la:9, li:10, te:10, ti:11 };
const sharpFlatNames: Record<string, string> = { 'C#':'Di', 'Db':'Ra', 'D#':'Ri', 'Eb':'Me', 'E#':'Fi', 'Fb':'Mi', 'F#':'Fi', 'Gb':'Se', 'G#':'Si', 'Ab':'Le', 'A#':'Li', 'Bb':'Te', 'B#':'Do', 'Cb':'Ti' };
function tonicForKey(key: string): number {
  const match = key.match(/^(C♯|D♭|D♯|E♭|F♯|G♭|G♯|A♭|A♯|B♭|[A-G])\s*(major|minor)$/i);
  return match ? pitchClass[match[1]] ?? 0 : 0;
}
function isMinorKey(key: string): boolean { return /minor/i.test(key); }
function tokenToPitch(token: string, project: MusicProject): number | null {
  const clean = token.trim().replace(/[.,;:!?()[\]{}]/g, '');
  if (!clean || /^[-—–.]+$/.test(clean) || /^(rest|r)$/i.test(clean)) return null;
  const match = clean.match(/^(Do|Di|Ra|Re|Ri|Me|Mi|Fa|Fi|Se|Sol|So|Si|Le|La|Li|Te|Ti|C#|Db|D#|Eb|E#|Fb|F#|Gb|G#|Ab|A#|Bb|B#|Cb)([0-8])?$/i);
  if (!match) return null;
  const name = match[1];
  const octave = match[2] ? Number(match[2]) : null;
  const lower = name.toLowerCase();
  let offset: number;
  let tonic = tonicForKey(project.key);
  if (project.convention === 'fixed') {
    const fixed = syllableOffsets[lower];
    if (fixed === undefined) {
      const flatSharp = pitchClass[name.replace('#','♯').replace('b','♭')] ?? pitchClass[name];
      if (flatSharp === undefined) return null;
      offset = flatSharp;
    } else offset = fixed;
  } else {
    const minor = isMinorKey(project.key);
    const degreeMap: Record<string, number> = minor
      ? (project.minorConvention === 'la'
        ? { la:0, li:1, te:2, ti:2, do:3, di:4, ra:4, re:5, ri:6, me:6, mi:7, fa:8, fi:9, se:9, sol:10, so:10, si:11, le:11 }
        : { do:0, di:1, ra:1, re:2, ri:3, me:3, mi:4, fa:5, fi:6, se:6, sol:7, so:7, si:8, le:8, la:9, li:10, te:10, ti:11 })
      : syllableOffsets;
    if (degreeMap[lower] !== undefined) offset = degreeMap[lower];
    else {
      const spelled = pitchClass[name.replace('#','♯').replace('b','♭')] ?? pitchClass[name];
      if (spelled === undefined) return null;
      offset = spelled;
    }
  }
  const baseOctave = octave ?? 4;
  const midi = (baseOctave + 1) * 12 + tonic + offset;
  return Math.max(0, Math.min(127, midi));
}
function pitchToSolfa(midi: number, project: MusicProject): string {
  const pc = ((midi % 12) + 12) % 12;
  if (project.convention === 'fixed') return ['Do','Di','Re','Ri','Mi','Fa','Fi','Sol','Si','La','Li','Ti'][pc];
  const tonic = tonicForKey(project.key);
  let degree = (pc - tonic + 12) % 12;
  if (isMinorKey(project.key)) {
    if (project.minorConvention === 'la') {
      const laMap = ['La','Li','Ti','Do','Di','Re','Ri','Mi','Fa','Fi','Sol','Si'];
      return laMap[degree];
    }
    return ['Do','Di','Re','Me','Mi','Fa','Se','Sol','Le','La','Te','Ti'][degree];
  }
  return ['Do','Di','Re','Ri','Mi','Fa','Fi','Sol','Si','La','Li','Ti'][degree];
}
function parseSolfaNotes(text: string, project: MusicProject): Note[] {
  const tokens = text.replace(/[|\n\r]+/g, ' ').split(/\s+/).filter(Boolean);
  const notes: Note[] = [];
  for (const token of tokens) {
    const pitch = tokenToPitch(token, project);
    if (pitch === null) continue;
    notes.push({ id: crypto.randomUUID(), solfa: token.replace(/[^\p{L}♯#♭b0-8]/gu, ''), pitch, duration: /[—–-]/.test(token) ? 'whole' : 'quarter' });
  }
  return notes;
}
function rebuildSolfa(notes: Note[], project: MusicProject): string {
  return notes.map(n => pitchToSolfa(n.pitch, project)).join(' ');
}

function makeProject(title = 'My first composition'): MusicProject {
  return {
    id: crypto.randomUUID(), title, updatedAt: new Date().toISOString(), key: 'C major',
    convention: 'movable', minorConvention: 'la', tempo: 100,
    solfaText: 'Do Re Mi | Fa Sol Sol | La Sol Fa Re | Do — —',
    notes: [
      { id: crypto.randomUUID(), solfa: 'Do', pitch: 60, duration: 'quarter' },
      { id: crypto.randomUUID(), solfa: 'Re', pitch: 62, duration: 'quarter' },
      { id: crypto.randomUUID(), solfa: 'Mi', pitch: 64, duration: 'quarter' },
      { id: crypto.randomUUID(), solfa: 'Fa', pitch: 65, duration: 'quarter' },
      { id: crypto.randomUUID(), solfa: 'Sol', pitch: 67, duration: 'quarter' },
      { id: crypto.randomUUID(), solfa: 'La', pitch: 69, duration: 'quarter' },
      { id: crypto.randomUUID(), solfa: 'Ti', pitch: 71, duration: 'quarter' },
      { id: crypto.randomUUID(), solfa: 'Do', pitch: 72, duration: 'whole' }
    ]
  };
}
function readProjects(): MusicProject[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as MusicProject[];
  } catch { /* Start with a fresh local workspace if saved data is unreadable. */ }
  return [makeProject('My first composition')];
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });
  const [projects, setProjects] = useState<MusicProject[]>(readProjects);
  const [activeId, setActiveId] = useState<string>(() => projects[0]?.id ?? '');
  const [page, setPage] = useState<'home' | 'editor' | 'library' | 'audio' | 'settings'>('home');
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [solfaDraft, setSolfaDraft] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const activeProject = projects.find(p => p.id === activeId) ?? projects[0];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* Theme still works for this session. */ }
  }, [theme]);
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(projects)); } catch { setNotice('Browser storage is full. Export a backup before adding more work.'); }
  }, [projects]);
  useEffect(() => {
    if (activeProject) setSolfaDraft(activeProject.solfaText);
  }, [activeId]);

  const updateActive = (patch: Partial<MusicProject>) => {
    if (!activeProject) return;
    setProjects(old => old.map(p => p.id === activeProject.id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p));
  };
  const openProject = (id: string) => { setActiveId(id); setPage('editor'); setMobileNav(false); };
  const createProject = () => {
    const project = makeProject(newTitle.trim() || 'Untitled composition');
    setProjects(old => [project, ...old]); setActiveId(project.id); setPage('editor');
    setNewTitle(''); setShowNewProject(false); setNotice('New composition created and saved on this device.');
  };
  const deleteProject = (id: string) => {
    if (projects.length === 1) { setNotice('Keep at least one composition in your workspace.'); return; }
    const remaining = projects.filter(p => p.id !== id);
    setProjects(remaining);
    if (activeId === id) { setActiveId(remaining[0]?.id ?? ''); setPage('home'); }
    setNotice('Composition removed from this device.');
  };
  const addNote = (index: number) => {
    if (!activeProject) return;
    const pitch = 60 + index;
    const note = { id: crypto.randomUUID(), solfa: pitchToSolfa(pitch, activeProject), pitch, duration: 'quarter' };
    const notes = [...activeProject.notes, note];
    updateActive({ notes, solfaText: rebuildSolfa(notes, activeProject) });
    setSolfaDraft(rebuildSolfa(notes, activeProject));
  };
  const updateNote = (id: string, patch: Partial<Note>) => {
    if (!activeProject) return;
    const notes = activeProject.notes.map(n => n.id === id ? { ...n, ...patch } : n);
    const solfaText = rebuildSolfa(notes, activeProject);
    updateActive({ notes, solfaText });
    setSolfaDraft(solfaText);
  };
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ app: 'LHYRICZ STUDIOZ', version: 1, projects }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'lhyricz-studioz-backup.json'; a.click(); URL.revokeObjectURL(url);
    setNotice('Backup downloaded. Keep it somewhere safe.');
  };
  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const incoming = Array.isArray(data) ? data : data.projects;
      if (!Array.isArray(incoming) || !incoming.every(p => p && typeof p.title === 'string' && Array.isArray(p.notes))) throw new Error('Invalid backup');
      const cleaned = incoming.map(p => ({ ...p, id: typeof p.id === 'string' ? p.id : crypto.randomUUID() })) as MusicProject[];
      setProjects(cleaned.length ? cleaned : [makeProject()]); setActiveId(cleaned[0]?.id ?? ''); setPage('home');
      setNotice('Backup imported successfully.');
    } catch { setNotice('That backup could not be read. Choose a LHYRICZ STUDIOZ JSON backup.'); }
  };
  const staffY = useMemo(() => activeProject?.notes.map(n => 132 - (n.pitch - 60) * 3.5) ?? [], [activeProject?.notes]);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark" aria-label="LHYRICZ STUDIOZ logo"><Music2 size={28} strokeWidth={3} /><span className="brand-wave" /></div>
          <div><strong>LHYRICZ</strong><span>STUDIOZ</span></div>
          <button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={19}/></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button className={page === 'home' ? 'nav-item active' : 'nav-item'} onClick={() => {setPage('home');setMobileNav(false);}}><House size={18}/> Overview</button>
          <button className={page === 'editor' ? 'nav-item active' : 'nav-item'} onClick={() => {setPage('editor');setMobileNav(false);}}><FileMusic size={18}/> Music editor <span className="nav-dot"/></button>
          <button className={page === 'library' ? 'nav-item active' : 'nav-item'} onClick={() => {setPage('library');setMobileNav(false);}}><Library size={18}/> My compositions</button>
          <button className={page === 'audio' ? 'nav-item active' : 'nav-item'} onClick={() => {setPage('audio');setMobileNav(false);}}><AudioLines size={18}/> Audio tools <span className="soon-tag">BETA</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card"><span className="local-icon"><Cloud size={17}/></span><div><strong>Saved on this device</strong><small>Cloud sync comes later</small></div><span className="status-dot"/></div>
          <button className={page === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => {setPage('settings');setMobileNav(false);}}><Settings2 size={18}/> Settings</button>
          <button className="nav-item" onClick={() => setShowHelp(v => !v)}><CircleHelp size={18}/> Help & tips</button>
          {showHelp && <div className="help-mini">Your work saves automatically in this browser. Use Settings to download a backup before clearing browser data.</div>}
          <div className="profile-row"><div className="profile-avatar">LS</div><div className="profile-text"><strong>LHYRICZ STUDIOZ</strong><small>Music workspace</small></div><ChevronDown size={16}/></div>
        </div>
      </aside>
      {mobileNav && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileNav(false)}/>}
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20}/></button><span className="breadcrumb">Workspace</span><span className="crumb-slash">/</span><strong>{({home:'Overview',editor:'Music editor',library:'My compositions',audio:'Audio tools',settings:'Settings'} as const)[page]}</strong></div>
          <div className="topbar-actions"><span className="save-status"><span className="status-dot"/><span>Local workspace</span></span><button className="icon-button theme-toggle" title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} aria-label="Toggle theme" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={18}/> : <Sun size={18}/>}</button><button className="avatar-small" title="LHYRICZ STUDIOZ">LS</button></div>
        </header>
        <div className="page-content">
          {notice && <div className="notice" role="status"><Check size={17}/><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={16}/></button></div>}
          {page === 'home' && <section>
            <div className="welcome-row"><div><div className="eyebrow"><Sparkles size={14}/> YOUR MUSIC, YOUR WAY</div><h1>Make music <span>mean something.</span></h1><p className="page-lead">Write solfa, shape melodies, and build choir arrangements in one creative space.</p></div><button className="primary-button" onClick={() => setShowNewProject(true)}><Plus size={18}/> New composition</button></div>
            <div className="hero-panel"><div className="hero-copy"><span className="hero-pill"><Music2 size={14}/> YOUR CREATIVE WORKSPACE</span><h2>From the first note<br/>to the full arrangement.</h2><p>Capture the melody in your head. Build it in solfa. See it on the staff.</p><button className="hero-button" onClick={() => activeProject && openProject(activeProject.id)}>Open music editor <span>↗</span></button><div className="hero-footnote"><span className="status-dot"/> Private to this browser by default</div></div><div className="hero-art" aria-hidden="true"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-note note-one">♪</div><div className="art-note note-two">♫</div><div className="art-card"><span>MELODY SKETCH</span><svg viewBox="0 0 310 135" role="img" aria-label="Decorative music staff"><g stroke="currentColor" strokeOpacity=".24">{[30,48,66,84,102].map(y=><line key={y} x1="8" x2="302" y1={y} y2={y}/>)}</g><path d="M12 79 C42 20 64 108 94 63 S142 24 169 69 S215 105 244 51 S279 65 300 32" fill="none" stroke="#4d8cff" strokeWidth="3" strokeLinecap="round"/>{[12,55,94,130,169,205,244,281].map((x,i)=><g key={x} fill="#4d8cff"><circle cx={x} cy={[79,64,63,50,69,81,51,43][i]} r="4.5"/><path d={`M ${x+4} ${[79,64,63,50,69,81,51,43][i]} v-24`} stroke="#4d8cff" strokeWidth="2"/></g>)}</svg><div className="art-card-bottom"><span>Melody draft</span><span className="art-wave">▂▅▃▇▅▂▆</span></div></div></div></div>
            <div className="section-heading"><div><h2>Pick up where you left off</h2><p>Your recent compositions, saved on this device.</p></div><button className="text-button" onClick={() => setPage('library')}>View all <span>→</span></button></div>
            <div className="project-grid">{projects.slice(0,3).map((p,i)=><article className="project-card" key={p.id}><div className={`project-art project-art-${i%3}`}><div className="mini-staff">{[0,1,2,3,4].map(n=><span key={n}/>) }<div className="mini-notes">♪ ♩ ♫</div></div><span className="project-type">COMPOSITION</span></div><div className="project-info"><div className="project-title-row"><h3>{p.title}</h3><button className="icon-button card-menu" aria-label={`Delete ${p.title}`} onClick={() => deleteProject(p.id)}><Trash2 size={16}/></button></div><p>{p.key} <span>·</span> {p.tempo} BPM</p><div className="project-card-bottom"><span className="tiny-status"><span className="status-dot"/> Saved locally</span><button className="round-arrow" onClick={() => openProject(p.id)} aria-label={`Open ${p.title}`}>↗</button></div></div></article>)}
              <button className="new-project-card" onClick={() => setShowNewProject(true)}><span className="new-plus"><Plus size={22}/></span><strong>Start a new idea</strong><small>A blank page for your next melody</small></button>
            </div>
            <div className="feature-strip"><div className="feature-icon"><WandSparkles size={20}/></div><div><strong>Good music starts with an idea.</strong><p>Use the editor to enter solfa and keep a visual melody sketch in sync.</p></div><button className="text-button" onClick={() => activeProject && openProject(activeProject.id)}>Try the editor →</button></div>
          </section>}
          {page === 'editor' && activeProject && <section>
            <div className="editor-heading"><div><button className="back-link" onClick={() => setPage('home')}>← Workspace</button><h1>{activeProject.title}</h1><p className="page-lead">Your notes, your interpretation. Changes save automatically.</p></div><button className="secondary-button" onClick={exportBackup}><Save size={16}/> Backup</button></div>
            <div className="editor-toolbar"><div className="editor-project-icon"><FileMusic size={20}/></div><div className="editor-project-label"><strong>{activeProject.title}</strong><small>Autosaved locally</small></div><div className="toolbar-fields"><label>Key<select value={activeProject.key} onChange={e=>{const key=e.target.value;const nextProject={...activeProject,key};const notes=activeProject.notes.map(n=>({...n,solfa:pitchToSolfa(n.pitch,nextProject)}));const solfaText=rebuildSolfa(notes,nextProject);updateActive({key,notes,solfaText});setSolfaDraft(solfaText);}}>{['C major','G major','D major','A major','E major','F major','B♭ major','A minor','E minor','D minor'].map(k=><option key={k}>{k}</option>)}</select></label><label>Tempo<input type="number" min="30" max="240" value={activeProject.tempo} onChange={e=>updateActive({tempo:Math.max(30,Math.min(240,Number(e.target.value)||100))})}/><span>BPM</span></label></div></div>
            <div className="editor-layout"><div className="editor-main"><div className="panel-heading"><div><h2>Melody staff</h2><p>Tap a note to change its solfa. Use the note buttons to add more.</p></div><span className="live-tag"><span className="status-dot"/> LIVE</span></div>
              <div className="staff-wrap"><div className="staff-clef">𝄞</div><div className="staff-canvas"><div className="staff-lines">{[0,1,2,3,4].map(n=><span key={n}/>)}</div><div className="staff-note-row">{activeProject.notes.map((n,i)=><button key={n.id} className="staff-note" style={{top:`${Math.max(3,Math.min(91,staffY[i] - 34))}%`,left:activeProject.notes.length>1?`${(i/(activeProject.notes.length-1))*96}%`:'4%'}} title={`${n.solfa}, MIDI pitch ${n.pitch}`} onClick={() => {const next=window.prompt('Enter a solfa syllable or chromatic spelling (Do, Re, Fi, Bb, C#):',n.solfa);if(next?.trim()){const pitch=tokenToPitch(next,activeProject);if(pitch===null){setNotice('That note was not recognised. Try Do, Re, Mi, Fi, Bb or C#.');}else{updateNote(n.id,{pitch,solfa:pitchToSolfa(pitch,activeProject)});}}}}><span className={`note-head duration-${n.duration}`}/>{!['whole'].includes(n.duration)&&<span className={`note-stem duration-${n.duration}`}/ >}{n.duration.startsWith('dotted-')&&<span className="note-dot"/>}{['eighth','sixteenth','dotted-eighth'].includes(n.duration)&&<span className={`note-flag ${n.duration==='sixteenth'?'double-flag':''}`}/>}<small>{n.solfa}</small></button>)}</div></div></div><div className="staff-legend"><span><i className="legend-dot blue"/> Melody notes</span><span>Choose a note to edit its pitch; set its length below.</span></div>
              <div className="duration-editor">
                <div className="duration-editor-heading"><strong>Note lengths</strong><span>Quarter = 1 beat in 4/4</span></div>
                <div className="duration-note-list">{activeProject.notes.map((n,i)=><label className="duration-note" key={n.id}><span className="duration-note-name">{i+1}. {n.solfa}</span><select aria-label={`Duration for note ${i+1}`} value={n.duration} onChange={e=>updateNote(n.id,{duration:e.target.value})}><option value="whole">Whole (4 beats)</option><option value="half">Half (2 beats)</option><option value="quarter">Quarter (1 beat)</option><option value="eighth">Eighth (½ beat)</option><option value="sixteenth">Sixteenth (¼ beat)</option><option value="dotted-half">Dotted half (3 beats)</option><option value="dotted-quarter">Dotted quarter (1½ beats)</option><option value="dotted-eighth">Dotted eighth (¾ beat)</option></select></label>)}</div>
              </div>
              <div className="add-notes"><span>Add a note</span>{solfaNames.filter((_,i)=>[0,2,4,5,7,9,11].includes(i)).map((s,i)=><button key={s} onClick={()=>addNote([0,2,4,5,7,9,11][i])}>{s}</button>)}</div>
              <div className="panel-heading solfa-heading"><div><h2>Solfa entry</h2><p>Type syllables, separate phrases with |, and use — for a held note.</p></div><span className="sync-label"><Check size={14}/> Text entry</span></div>
              <textarea className="solfa-editor" value={solfaDraft} onChange={e=>{const text=e.target.value;setSolfaDraft(text);const parsed=parseSolfaNotes(text,activeProject);updateActive({solfaText:text,notes:parsed.length?parsed:activeProject.notes});}} onBlur={()=>updateActive({solfaText:solfaDraft})} spellCheck={false} aria-label="Solfa text entry"/>
              <div className="editor-bottom"><span><span className="status-dot"/> Saved on this device</span><button className="primary-button" onClick={()=>{updateActive({solfaText:solfaDraft});setNotice('Solfa changes saved.');}}><Save size={16}/> Save changes</button></div>
            </div><aside className="editor-side"><div className="side-panel"><div className="side-panel-title"><Settings2 size={17}/><h3>Project settings</h3></div><label className="setting-label">Solfa convention<select value={activeProject.convention} onChange={e=>{const convention=e.target.value as 'movable'|'fixed';const nextProject={...activeProject,convention};const notes=activeProject.notes.map(n=>({...n,solfa:pitchToSolfa(n.pitch,nextProject)}));const solfaText=rebuildSolfa(notes,nextProject);updateActive({convention,notes,solfaText});setSolfaDraft(solfaText);}}><option value="movable">Movable Do</option><option value="fixed">Fixed Do</option></select><small>Choose how syllables are interpreted in this project.</small></label><label className="setting-label">Minor-key convention<select value={activeProject.minorConvention} onChange={e=>{const minorConvention=e.target.value as 'la'|'do';const nextProject={...activeProject,minorConvention};const notes=activeProject.notes.map(n=>({...n,solfa:pitchToSolfa(n.pitch,nextProject)}));const solfaText=rebuildSolfa(notes,nextProject);updateActive({minorConvention,notes,solfaText});setSolfaDraft(solfaText);}}><option value="la">La-based minor</option><option value="do">Do-based minor</option></select><small>Minor-key solfa is a project-level choice.</small></label><label className="setting-label">Time signature<select defaultValue="4/4"><option>4/4</option><option>3/4</option><option>2/4</option><option>6/8</option><option>12/8</option></select></label></div><div className="side-panel export-panel"><div className="side-panel-title"><FileMusic size={17}/><h3>Export & share</h3></div><p>Back up your project now. Music notation exports are being built in later stages.</p><button className="full-width-button" onClick={exportBackup}><Save size={16}/> Download project backup</button><div className="disabled-export"><FileAudio2 size={17}/><span>PDF / MusicXML / MIDI</span><span className="soon-tag">COMING</span></div></div><div className="privacy-note"><Cloud size={17}/><p><strong>Your music stays yours.</strong><br/>This early version stores work in your browser. Cloud sync is not active yet.</p></div></aside></div>
          </section>}
          {page === 'library' && <section><div className="welcome-row"><div><div className="eyebrow"><Library size={14}/> YOUR LIBRARY</div><h1>My compositions</h1><p className="page-lead">All the music projects saved in this browser.</p></div><button className="primary-button" onClick={()=>setShowNewProject(true)}><Plus size={18}/> New composition</button></div><div className="library-list">{projects.map(p=><div className="library-row" key={p.id}><div className="library-file-icon"><FileMusic size={21}/></div><div className="library-meta"><strong>{p.title}</strong><small>{p.key} · {p.tempo} BPM · Updated {new Date(p.updatedAt).toLocaleDateString()}</small></div><button className="secondary-button" onClick={()=>openProject(p.id)}>Open editor ↗</button><button className="icon-button" aria-label={`Delete ${p.title}`} onClick={()=>deleteProject(p.id)}><Trash2 size={17}/></button></div>)}</div></section>}
          {page === 'audio' && <section><div className="eyebrow"><AudioLines size={14}/> MELODY TOOLS</div><h1>Audio tools</h1><p className="page-lead">Bring in a recording and begin turning a melody into editable music.</p><div className="audio-beta"><div className="audio-orb"><Headphones size={30}/></div><span className="hero-pill">AUDIO WORKBENCH · EARLY ACCESS</span><h2>Hear it. Find the melody. Shape the notes.</h2><p>Audio transcription is a separate, experimental stage of this project. Full-song processing and accuracy must be tested before they can be promised.</p><label className="upload-zone"><Upload size={23}/><strong>Choose an audio file</strong><span>WAV, MP3, M4A · local file selection only</span><input type="file" accept="audio/*" onChange={e=>{const f=e.target.files?.[0];if(f)setNotice(`Selected “${f.name}”. Melody analysis is not active in this preview yet.`);}}/></label><div className="audio-capabilities"><div><Check size={16}/> Melody extraction planned first</div><div><Check size={16}/> Key estimation planned</div><div><Check size={16}/> Correctable notes, not a black box</div></div></div></section>}
          {page === 'settings' && <section><div className="eyebrow"><Settings2 size={14}/> PERSONALISE YOUR SPACE</div><h1>Settings</h1><p className="page-lead">Make LHYRICZ STUDIOZ feel like your own creative space.</p><div className="settings-card"><div className="settings-row"><div><strong>Appearance</strong><p>Switch between light and dark across the entire app.</p></div><button className="secondary-button" onClick={()=>setTheme(t=>t==='light'?'dark':'light')}>{theme==='light'?<Moon size={16}/>:<Sun size={16}/>} {theme==='light'?'Use dark mode':'Use light mode'}</button></div><div className="settings-row"><div><strong>Project backups</strong><p>Download your local compositions as a JSON file or restore an earlier backup.</p></div><div className="backup-actions"><button className="secondary-button" onClick={exportBackup}><Save size={16}/> Export backup</button><label className="secondary-button file-label"><Upload size={16}/> Import backup<input type="file" accept="application/json,.json" onChange={e=>importBackup(e.target.files?.[0])}/></label></div></div><div className="settings-row"><div><strong>Storage</strong><p>Work is saved in this browser only. Clearing site data can remove it.</p></div><span className="storage-badge"><span className="status-dot"/> Local-first</span></div><div className="settings-row"><div><strong>App version</strong><p>LHYRICZ STUDIOZ music workspace · MVP foundation</p></div><span className="version-badge">0.1.0</span></div></div></section>}
          <footer className="page-footer"><span>© {new Date().getFullYear()} LHYRICZ STUDIOZ</span><span>Built for the love of music <span className="footer-note">♪</span></span></footer>
        </div>
      </main>
      {showNewProject && <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setShowNewProject(false);}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-project-title"><button className="modal-close icon-button" onClick={()=>setShowNewProject(false)} aria-label="Close"><X size={18}/></button><div className="modal-icon"><Music2 size={23}/></div><h2 id="new-project-title">Start a new composition</h2><p>Give your musical idea a name. You can change it in the editor later.</p><label className="modal-field">Composition name<input autoFocus value={newTitle} onChange={e=>setNewTitle(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')createProject();}} placeholder="e.g. Sunday choir melody" maxLength={80}/></label><div className="modal-actions"><button className="secondary-button" onClick={()=>setShowNewProject(false)}>Cancel</button><button className="primary-button" onClick={createProject}><Plus size={17}/> Create project</button></div></div></div>}
    </div>
  );
}