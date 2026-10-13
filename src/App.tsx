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
    const note = { id: crypto.randomUUID(), solfa: solfaNames[index % 12], pitch, duration: 'quarter' };
    updateActive({ notes: [...activeProject.notes, note] });
  };
  const updateNote = (id: string, patch: Partial<Note>) => {
    if (!activeProject) return;
    updateActive({ notes: activeProject.notes.map(n => n.id === id ? { ...n, ...patch } : n) });
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
            <div className="editor-toolbar"><div className="editor-project-icon"><FileMusic size={20}/></div><div className="editor-project-label"><strong>{activeProject.title}</strong><small>Autosaved locally</small></div><div className="toolbar-fields"><label>Key<select value={activeProject.key} onChange={e => updateActive({key:e.target.value})}>{['C major','G major','D major','A major','E major','F major','B♭ major','A minor','E minor','D minor'].map(k=><option key={k}>{k}</option>)}</select></label><label>Tempo<input type="number" min="30" max="240" value={activeProject.tempo} onChange={e=>updateActive({tempo:Math.max(30,Math.min(240,Number(e.target.value)||100))})}/><span>BPM</span></label></div></div>
            <div className="editor-layout"><div className="editor-main"><div className="panel-heading"><div><h2>Melody staff</h2><p>Tap a note to change its solfa. Use the note buttons to add more.</p></div><span className="live-tag"><span className="status-dot"/> LIVE</span></div>
              <div className="staff-wrap"><div className="staff-clef">𝄞</div><div className="staff-canvas"><div className="staff-lines">{[0,1,2,3,4].map(n=><span key={n}/>)}</div><div className="staff-note-row">{activeProject.notes.map((n,i)=><button key={n.id} className="staff-note" style={{top:`${Math.max(3,Math.min(91,staffY[i] - 34))}%`}} title={`${n.solfa}, MIDI pitch ${n.pitch}`} onClick={() => {const next=window.prompt('Enter solfa for this note (Do, Re, Mi, Fa, Sol, La, Ti):',n.solfa);if(next?.trim())updateNote(n.id,{solfa:next.trim(),pitch:n.pitch});}}><span className="note-head"/><span className="note-stem"/><small>{n.solfa}</small></button>)}</div></div></div><div className="staff-legend"><span><i className="legend-dot blue"/> Melody notes</span><span>Note pitch values are retained as you edit solfa labels.</span></div>
              <div className="add-notes"><span>Add a note</span>{solfaNames.filter((_,i)=>[0,2,4,5,7,9,11].includes(i)).map((s,i)=><button key={s} onClick={()=>addNote([0,2,4,5,7,9,11][i])}>{s}</button>)}</div>
              <div className="panel-heading solfa-heading"><div><h2>Solfa entry</h2><p>Type syllables, separate phrases with |, and use — for a held note.</p></div><span className="sync-label"><Check size={14}/> Text entry</span></div>
              <textarea className="solfa-editor" value={solfaDraft} onChange={e=>setSolfaDraft(e.target.value)} onBlur={()=>updateActive({solfaText:solfaDraft})} spellCheck={false} aria-label="Solfa text entry"/>
              <div className="editor-bottom"><span><span className="status-dot"/> Saved on this device</span><button className="primary-button" onClick={()=>{updateActive({solfaText:solfaDraft});setNotice('Solfa changes saved.');}}><Save size={16}/> Save changes</button></div>
            </div><aside className="editor-side"><div className="side-panel"><div className="side-panel-title"><Settings2 size={17}/><h3>Project settings</h3></div><label className="setting-label">Solfa convention<select value={activeProject.convention} onChange={e=>updateActive({convention:e.target.value as 'movable'|'fixed'})}><option value="movable">Movable Do</option><option value="fixed">Fixed Do</option></select><small>Choose how syllables are interpreted in this project.</small></label><label className="setting-label">Minor-key convention<select value={activeProject.minorConvention} onChange={e=>updateActive({minorConvention:e.target.value as 'la'|'do'})}><option value="la">La-based minor</option><option value="do">Do-based minor</option></select><small>Minor-key solfa is a project-level choice.</small></label><label className="setting-label">Time signature<select defaultValue="4/4"><option>4/4</option><option>3/4</option><option>2/4</option><option>6/8</option><option>12/8</option></select></label></div><div className="side-panel export-panel"><div className="side-panel-title"><FileMusic size={17}/><h3>Export & share</h3></div><p>Back up your project now. Music notation exports are being built in later stages.</p><button className="full-width-button" onClick={exportBackup}><Save size={16}/> Download project backup</button><div className="disabled-export"><FileAudio2 size={17}/><span>PDF / MusicXML / MIDI</span><span className="soon-tag">COMING</span></div></div><div className="privacy-note"><Cloud size={17}/><p><strong>Your music stays yours.</strong><br/>This early version stores work in your browser. Cloud sync is not active yet.</p></div></aside></div>
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