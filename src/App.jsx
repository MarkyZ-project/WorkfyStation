import { useState, useRef, useEffect } from "react";

import RegisterScreen from "./components/RegisterScreen";
import WelcomeScreen from "./components/WelcomeScreen";
import SettingsPanel from "./components/SettingsPanel";
import PWAPrompt from "./components/PWAPrompt";
import LockScreen from "./components/LockScreen";

import HomeApp from "./tools/HomeApp";
import PlusScreen from "./tools/PlusScreen";
import NoteApp from "./tools/NoteApp";
import FoglioApp from "./tools/FoglioApp";
import DisegnoApp from "./tools/DisegnoApp";
import SlideApp from "./tools/SlideApp";
import CalcApp from "./tools/CalcApp";
import CronometroApp from "./tools/CronometroApp";
import ConvertitoreApp from "./tools/ConvertitoreApp";
import ImageEditorApp from "./tools/ImageEditorApp";
import PdfViewerApp from "./tools/PdfViewerApp";
import MusicApp from "./tools/MusicApp";
import TodoApp from "./tools/TodoApp";

// ── Costanti colore ──
const NEON = "#ff6b9d";
const NEON2 = "#ff1493";
const GOLD = "#FFD700";
const GOLD2 = "#FFA500";

// ── Icona corona ──
function CrownIcon({ size, color }) {
  const s = size || 16;
  const col = color || GOLD;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 17L5 9L9 13L12 6L15 13L19 9L21 17H3Z" fill={col} stroke={col} strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="3" y="17" width="18" height="2.5" rx="1.25" fill={col}/>
    </svg>
  );
}

// ── Theme ──
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

function useTheme() {
  const [dark,    setDark]       = useState(() => localStorage.getItem("wfy_dark")    !== "false");
  const [glowOn,  setGlowOn]     = useState(() => localStorage.getItem("wfy_glow")    !== "false");
  const [neon,    setNeonRaw]    = useState(() => localStorage.getItem("wfy_neon")    || "#ff6b9d");
  const [neon2,   setNeon2Raw]   = useState(() => localStorage.getItem("wfy_neon2")   || "#ff1493");
  const [bgDark,  setBgDarkRaw]  = useState(() => localStorage.getItem("wfy_bgdark")  || "#0a0a0a");
  const [bgLight, setBgLightRaw] = useState(() => localStorage.getItem("wfy_bglight") || "#f5f5f7");

  const toggleDark  = () => { const v=!dark;   setDark(v);   localStorage.setItem("wfy_dark",   v); };
  const toggleGlow  = () => { const v=!glowOn; setGlowOn(v); localStorage.setItem("wfy_glow",   v); };
  const setNeon     = v  => { setNeonRaw(v);   localStorage.setItem("wfy_neon",   v); };
  const setNeon2    = v  => { setNeon2Raw(v);  localStorage.setItem("wfy_neon2",  v); };
  const setBgDark   = v  => { setBgDarkRaw(v); localStorage.setItem("wfy_bgdark", v); };
  const setBgLight  = v  => { setBgLightRaw(v);localStorage.setItem("wfy_bglight",v); };

  return { dark, glowOn, neon, neon2, bgDark, bgLight, toggleDark, toggleGlow, setNeon, setNeon2, setBgDark, setBgLight };
}

function getC(dark, neon, neon2, bgDark, bgLight) {
  const rgb = hexToRgb(neon);
  return dark ? {
    bg: bgDark, surface: `rgba(${rgb},0.03)`, surface2: "#16161f",
    border: `rgba(${rgb},0.2)`, text: "#fff",
    textMuted: "rgba(255,255,255,0.6)", textHint: `rgba(${rgb},0.55)`,
    accent: neon, accentBg: `rgba(${rgb},0.15)`, accentBg2: `rgba(${rgb},0.07)`,
    headerBg: `rgba(${rgb},0.02)`, inputBg: `rgba(${rgb},0.05)`,
  } : {
    bg: bgLight, surface: "#ffffff", surface2: "#f0f0f5",
    border: "#e0e0e0", text: "#111", textMuted: "#555", textHint: "#999",
    accent: neon2, accentBg: `rgba(${hexToRgb(neon2)},0.09)`, accentBg2: `rgba(${hexToRgb(neon2)},0.04)`,
    headerBg: "#ffffff", inputBg: "#fafafa",
  };
}

// ── Liste strumenti ──
const MOBILE_TABS = [
  { id: "home",    label: "Home",    icon: "🏠" },
  { id: "note",    label: "Note",    icon: "✏️" },
  { id: "todo",    label: "Tasks",   icon: "✅" },
  { id: "music",   label: "Musica",  icon: "🎵" },
  { id: "more",    label: "Altro",   icon: "⋯"  },
];

const TOOLS = [
  { id: "home",         label: "Home",         icon: "🏠" },
  { id: "note",         label: "Note",         icon: "✏️" },
  { id: "todo",         label: "Tasks",        icon: "✅" },
  { id: "foglio",       label: "Foglio",       icon: "📊" },
  { id: "disegno",      label: "Disegno",      icon: "🎨" },
  { id: "slide",        label: "Slide",        icon: "📐" },
  { id: "calc",         label: "Calcola",      icon: "🧮" },
  { id: "cronometro",   label: "Cronometro",   icon: "⏱️" },
  { id: "convertitore", label: "Convertitore", icon: "🔄" },
  { id: "imageeditor",  label: "Editor Img",   icon: "🖼️" },
  { id: "pdfviewer",    label: "PDF / Word",   icon: "📄" },
  { id: "music",        label: "Musica",       icon: "🎵" },
];

// ── Drawer mobile ──
function MobileDrawer({ c, active, setActive, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:300, backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"fixed", bottom:64, left:0, right:0, zIndex:301, background:c.bg==="#0a0a0a"?"#13101a":"#fff", border:`1px solid ${c.border}`, borderRadius:"20px 20px 0 0", padding:"20px 16px 16px", animation:"slideUp .3s cubic-bezier(.16,1,.3,1) both" }}>
        <div style={{ width:36, height:4, borderRadius:2, background:c.border, margin:"0 auto 20px" }}/>
        <div style={{ fontSize:12, color:c.textHint, letterSpacing:1, marginBottom:12 }}>TUTTI GLI STRUMENTI</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => { setActive(t.id); onClose(); }}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"14px 8px", borderRadius:14, cursor:"pointer", border:`1px solid ${active===t.id?c.accent:c.border}`, background:active===t.id?c.accentBg:c.surface, color:active===t.id?c.accent:c.textMuted }}>
              <span style={{ fontSize:24 }}>{t.icon}</span>
              <span style={{ fontSize:10, fontWeight:active===t.id?600:400, textAlign:"center" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Mini player ──
function MiniPlayer({ audioState, audioRef, blobMap }) {
  const { currentId, songs, playing, currentTime, duration } = audioState;
  const currentSong = songs.find(s => s.id === currentId);
  const hasBlob = !!blobMap.current[currentId];
  if (!currentSong || !hasBlob) return null;
  const pct = duration ? Math.min((currentTime/duration)*100, 100) : 0;
  const togglePlay = () => {
    if (playing) audioRef.current.pause();
    else audioRef.current.play().catch(()=>{});
  };
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:150, background:"rgba(10,5,15,0.97)", borderTop:`1px solid ${NEON}44`, padding:"8px 16px", display:"flex", alignItems:"center", gap:12, backdropFilter:"blur(12px)" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"rgba(255,107,157,0.2)" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${NEON},${NEON2})`, transition:"width .1s linear" }}/>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:`linear-gradient(135deg,${NEON}66,${NEON2}44)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>{playing?"♫":"♪"}</div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:600, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{currentSong.name}</div>
          <div style={{ fontSize:10, color:`rgba(255,107,157,0.6)` }}>{playing?"In riproduzione":"In pausa"}</div>
        </div>
      </div>
      <button onClick={togglePlay} style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${NEON},${NEON2})`, border:"none", cursor:"pointer", color:"#fff", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        {playing?"⏸":"▶"}
      </button>
    </div>
  );
}

// ── App principale ──
export default function App() {
  // Screen e utente
const [screen, setScreen] = useState(() => {
  const user = localStorage.getItem("wfy_user");
  const accounts = localStorage.getItem("wfy_accounts");
  if (user && accounts) return "app";
  return "register";
});
  const [user,    setUser]     = useState(() => { try { return JSON.parse(localStorage.getItem("wfy_user")||"null"); } catch { return null; } });

  // UI
  const [active,       setActive]       = useState("home");
  const [sideOpen,     setSideOpen]     = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusMode,    setFocusMode]    = useState(false);
  const [showDrawer,   setShowDrawer]   = useState(false);
  const [isMobile,     setIsMobile]     = useState(window.innerWidth < 768);

  // Sicurezza
  const [locked,     setLocked]     = useState(false);
  const [timeout,    setTimeoutVal] = useState(() => parseInt(localStorage.getItem("wfy_timeout") || "0"));
  // eslint-disable-next-line react-hooks/purity
  const lastActivity = useRef(Date.now());

  // Tema
  const { dark, glowOn, neon, neon2, bgDark, bgLight, toggleDark, toggleGlow, setNeon, setNeon2, setBgDark, setBgLight } = useTheme();
  const c = getC(dark, neon, neon2, bgDark, bgLight);

  // Audio globale
  const audioRef = useRef(new Audio());
  const blobMap  = useRef({});
  const [songs,      setSongs]      = useState(() => { try { return JSON.parse(localStorage.getItem("wfy_songs_meta")||"[]"); } catch { return []; } });
  const [playlists,  setPlaylists]  = useState(() => { try { return JSON.parse(localStorage.getItem("wfy_playlists")||"[]"); } catch { return []; } });
  const [currentId,  setCurrentId]  = useState(null);
  const [queue,      setQueue]      = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [playing,    setPlaying]    = useState(false);
  const [currentTime,setCurrentTime]= useState(0);
  const [duration,   setDuration]   = useState(0);
  const [volume,     setVolume]     = useState(1);
  const [muted,      setMuted]      = useState(false);
  const [shuffle,    setShuffle]    = useState(false);
  const [repeat,     setRepeat]     = useState("none");

  // ── Handlers ──
  const handleRegister    = (u) => { setUser(u); setScreen("welcome"); };
  const handleWelcomeDone = ()  => setScreen("app");
  const logout = () => {
    localStorage.removeItem("wfy_user");
    localStorage.removeItem("wfy_session_time");
    setUser(null);
    setScreen("register");
    setSettingsOpen(false);
    setLocked(false);
    setActive("home");
  };

  // ── Effects ──
  useEffect(() => { localStorage.setItem("wfy_timeout", timeout.toString()); }, [timeout]);
  useEffect(() => { localStorage.setItem("wfy_songs_meta", JSON.stringify(songs)); }, [songs]);
  useEffect(() => { localStorage.setItem("wfy_playlists", JSON.stringify(playlists)); }, [playlists]);

  // Timeout inattività
  useEffect(() => {
    if (timeout === 0 || screen !== "app") return;
    const reset = () => { lastActivity.current = Date.now(); };
    const check = setInterval(() => {
      if (Date.now() - lastActivity.current > timeout * 60 * 1000) setLocked(true);
    }, 10000);
    window.addEventListener("mousemove",  reset);
    window.addEventListener("keydown",    reset);
    window.addEventListener("touchstart", reset);
    return () => {
      clearInterval(check);
      window.removeEventListener("mousemove",  reset);
      window.removeEventListener("keydown",    reset);
      window.removeEventListener("touchstart", reset);
    };
  }, [timeout, screen]);

  // Resize
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  // Audio eventi
  useEffect(() => {
    const audio = audioRef.current;
    const onTime  = () => setCurrentTime(audio.currentTime);
    const onMeta  = () => setDuration(audio.duration);
    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    // eslint-disable-next-line no-use-before-define
    const onEnded = () => playNext();
    audio.addEventListener("timeupdate",    onTime);
    audio.addEventListener("loadedmetadata",onMeta);
    audio.addEventListener("play",          onPlay);
    audio.addEventListener("pause",         onPause);
    audio.addEventListener("ended",         onEnded);
    return () => {
      audio.removeEventListener("timeupdate",    onTime);
      audio.removeEventListener("loadedmetadata",onMeta);
      audio.removeEventListener("play",          onPlay);
      audio.removeEventListener("pause",         onPause);
      audio.removeEventListener("ended",         onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, queueIndex, shuffle, repeat]);

  // Cambio canzone
  useEffect(() => {
    if (!currentId) return;
    const url = blobMap.current[currentId];
    if (!url) return;
    const audio = audioRef.current;
    audio.src = url;
    audio.load();
    audio.volume = muted ? 0 : volume;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, muted]);

  // ── Audio helpers ──
  const playNext = () => {
    if (!queue.length) return;
    if (repeat === "one") { audioRef.current.currentTime=0; audioRef.current.play(); return; }
    let next = shuffle ? Math.floor(Math.random()*queue.length) : (queueIndex+1)%queue.length;
    if (!shuffle && next===0 && repeat==="none") { setPlaying(false); return; }
    setQueueIndex(next);
    setCurrentId(queue[next]);
    setTimeout(() => audioRef.current.play().catch(()=>{}), 80);
  };

  const playPrev = () => {
    if (!queue.length) return;
    if (audioRef.current.currentTime > 3) { audioRef.current.currentTime=0; return; }
    const prev = (queueIndex-1+queue.length)%queue.length;
    setQueueIndex(prev);
    setCurrentId(queue[prev]);
    setTimeout(() => audioRef.current.play().catch(()=>{}), 80);
  };

  const playSong = (id, list) => {
    const ids = list || songs.map(s=>s.id);
    const idx = ids.indexOf(id);
    setQueue(ids); setQueueIndex(idx>=0?idx:0);
    setCurrentId(id);
    setTimeout(() => audioRef.current.play().catch(()=>{}), 80);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!currentId || !blobMap.current[currentId]) return;
    if (playing) audio.pause(); else audio.play().catch(()=>{});
  };

  const audioState = {
    songs, setSongs, playlists, setPlaylists,
    currentId, setCurrentId, queue, setQueue,
    queueIndex, setQueueIndex, playing, setPlaying,
    currentTime, duration, volume, setVolume,
    muted, setMuted, shuffle, setShuffle, repeat, setRepeat,
    playSong, togglePlay, playNext, playPrev,
  };

  // ── Schermate speciali ──
  if (screen === "register") return <RegisterScreen onDone={handleRegister}/>;
  if (screen === "welcome")  return <WelcomeScreen user={user} onDone={handleWelcomeDone}/>;
  if (locked) return <LockScreen user={user} onUnlock={() => { setLocked(false); lastActivity.current=Date.now(); }} c={c}/>;

  const email = user?.email || "guest";
  const showMiniPlayer = active!=="music" && !focusMode && currentId && blobMap.current[currentId];
  const bottomOffset   = showMiniPlayer ? (isMobile?120:56) : (isMobile?64:0);

  const panels = {
    home:         <HomeApp        c={c} user={user} onNavigate={setActive}/>,
    plus:         <PlusScreen     c={c} user={user}/>,
    note:         <NoteApp        email={email} c={c}/>,
    todo:         <TodoApp        email={email} c={c}/>,
    foglio:       <FoglioApp      email={email} c={c}/>,
    disegno:      <DisegnoApp     email={email} c={c}/>,
    slide:        <SlideApp       email={email} c={c}/>,
    calc:         <CalcApp        c={c}/>,
    cronometro:   <CronometroApp  c={c}/>,
    convertitore: <ConvertitoreApp c={c}/>,
    imageeditor:  <ImageEditorApp  c={c}/>,
    pdfviewer:    <PdfViewerApp    c={c}/>,
    music:        <MusicApp audioState={audioState} audioRef={audioRef} blobMap={blobMap} c={c}/>,
  };

  const glowS  = (color,size) => glowOn ? `0 0 ${size}px ${color}, 0 0 ${size*2}px ${color}` : "none";
  const glowTx = glowOn ? `0 0 10px ${neon}, 0 0 20px ${neon}, 0 0 40px ${neon2}` : "none";
  const currentTool = TOOLS.find(t=>t.id===active) || { icon:"🏠", label:"Home" };

  return (
    <div style={{ display:"flex", height:"100vh", background:c.bg, fontFamily:"'Segoe UI',sans-serif", overflow:"hidden", color:c.text }}>
      <style>{`
        ${glowOn?`@keyframes glow-pulse{0%,100%{box-shadow:0 0 8px ${neon};}50%{box-shadow:0 0 20px ${neon},0 0 40px ${neon2};}}`:""}
        @keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .tool-btn:hover{background:${c.accentBg}!important;}
        .tool-btn.active{background:${c.accentBg}!important;border-color:${c.accent}!important;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:${c.border};border-radius:2px;}
        input::placeholder,textarea::placeholder{color:${c.textHint};}
        button:active{transform:scale(0.97);}
      `}</style>

      {/* Modali */}
      {settingsOpen && (
        <SettingsPanel
          dark={dark} glowOn={glowOn} toggleDark={toggleDark} toggleGlow={toggleGlow}
          neon={neon} neon2={neon2} setNeon={setNeon} setNeon2={setNeon2}
          bgDark={bgDark} setBgDark={setBgDark} bgLight={bgLight} setBgLight={setBgLight}
          timeout={timeout} setTimeout={setTimeoutVal}
          onLogout={logout}
          onLock={() => { setLocked(true); setSettingsOpen(false); }}
          onClose={() => setSettingsOpen(false)} c={c}
        />
      )}
      {showDrawer && <MobileDrawer c={c} active={active} setActive={setActive} onClose={()=>setShowDrawer(false)}/>}

      {/* Mini player */}
      {showMiniPlayer && <MiniPlayer audioState={audioState} audioRef={audioRef} blobMap={blobMap}/>}

      {/* PWA */}
      <PWAPrompt c={c}/>

      {/* ── SIDEBAR DESKTOP ── */}
      {!isMobile && !focusMode && (
        <div style={{ width:sideOpen?220:64, background:c.surface, borderRight:`1px solid ${c.border}`, display:"flex", flexDirection:"column", transition:"width .3s", overflow:"hidden", flexShrink:0 }}>

          {/* Header */}
          <div style={{ padding:"16px 12px", borderBottom:`1px solid ${c.border}`, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:c.accentBg, border:`1px solid ${c.accent}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:glowS(neon,6), animation:glowOn?"glow-pulse 3s infinite":"none" }}>
              <img src="/WorkfyStation/WorkfyLogo.png" alt="logo" style={{ width:24, height:24, objectFit:"contain", borderRadius:4 }}/>
            </div>
            {sideOpen && <div style={{ color:c.accent, fontWeight:600, fontSize:14, textShadow:glowTx, whiteSpace:"nowrap", flex:1 }}>WorkfyStation</div>}
            {sideOpen && <button onClick={()=>setSettingsOpen(true)} style={{ background:"transparent", border:`1px solid ${c.border}`, borderRadius:8, width:30, height:30, cursor:"pointer", color:c.textMuted, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>⚙</button>}
          </div>

          {/* Utente + PLUS */}
          {sideOpen && user && (
            <div style={{ padding:"10px 16px", borderBottom:`1px solid ${c.border}` }}>
              <div style={{ color:c.textHint, fontSize:11, letterSpacing:1 }}>UTENTE</div>
              <div style={{ color:c.text, fontSize:13, marginTop:2, fontWeight:500 }}>{user.nome} {user.cognome}</div>
              <div style={{ color:c.textMuted, fontSize:11, marginTop:1, marginBottom:10 }}>{user.email}</div>
              <button onClick={()=>setActive("plus")}
                style={{ width:"100%", padding:"8px 12px", borderRadius:10, border:`1.5px solid ${GOLD}88`, background:`linear-gradient(135deg,${GOLD}18,${GOLD2}0a)`, cursor:"pointer", display:"flex", alignItems:"center", gap:8, transition:"all .2s", boxShadow:active==="plus"?`0 0 14px ${GOLD}55`:"none" }}>
                <CrownIcon size={15} color={GOLD}/>
                <span style={{ fontSize:12, fontWeight:700, background:`linear-gradient(90deg,${GOLD},${GOLD2})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", flex:1, textAlign:"left" }}>Workfy PLUS</span>
                <span style={{ fontSize:9, padding:"2px 6px", borderRadius:8, background:`${GOLD}22`, color:GOLD, fontWeight:700, letterSpacing:.5 }}>PRESTO</span>
              </button>
            </div>
          )}

          {/* Strumenti */}
          <div style={{ flex:1, padding:"10px 8px", display:"flex", flexDirection:"column", gap:4, overflowY:"auto" }}>
            {TOOLS.map(t => (
              <button key={t.id} onClick={()=>setActive(t.id)}
                className={`tool-btn${active===t.id?" active":""}`}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:10, border:"1px solid transparent", background:"transparent", cursor:"pointer", color:active===t.id?c.accent:c.textMuted, fontSize:13, textAlign:"left", transition:"all .2s", width:"100%", fontWeight:active===t.id?"500":"400" }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{t.icon}</span>
                {sideOpen && <span style={{ whiteSpace:"nowrap" }}>{t.label}</span>}
              </button>
            ))}
          </div>

          {/* Footer sidebar */}
          <div style={{ padding:"10px 8px", borderTop:`1px solid ${c.border}` }}>
            {!sideOpen && <button onClick={()=>setSettingsOpen(true)} style={{ width:"100%", padding:"8px", borderRadius:8, border:`1px solid ${c.border}`, background:"transparent", cursor:"pointer", color:c.textMuted, fontSize:16, marginBottom:4 }}>⚙</button>}
            <button onClick={()=>setSideOpen(!sideOpen)} style={{ width:"100%", padding:"8px", borderRadius:8, border:`1px solid ${c.border}`, background:"transparent", cursor:"pointer", color:c.textMuted, fontSize:12 }}>
              {sideOpen?"« Chiudi":"»"}
            </button>
          </div>
        </div>
      )}

      {/* ── CONTENUTO PRINCIPALE ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Header */}
        {!focusMode && (
          <div style={{ padding:isMobile?"10px 16px":"14px 24px", borderBottom:`1px solid ${c.border}`, background:c.headerBg, display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
            {isMobile && (
              <div style={{ width:30, height:30, borderRadius:8, background:c.accentBg, border:`1px solid ${c.accent}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <img src="/WorkfyStation/WorkfyLogo.png" alt="logo" style={{ width:20, height:20, objectFit:"contain" }}/>
              </div>
            )}
            <span style={{ fontSize:isMobile?18:22 }}>{currentTool.icon}</span>
            <span style={{ fontSize:isMobile?15:17, fontWeight:500, color:c.text }}>{currentTool.label}</span>
            <div style={{ flex:1 }}/>
            <button onClick={()=>setFocusMode(true)} style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${c.border}`, background:"transparent", cursor:"pointer", color:c.textMuted, fontSize:12, display:"flex", alignItems:"center", gap:5 }}>
              <span>⛶</span>{!isMobile&&<span>Focus</span>}
            </button>
            {isMobile && <button onClick={()=>setSettingsOpen(true)} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${c.border}`, background:"transparent", cursor:"pointer", color:c.textMuted, fontSize:16 }}>⚙</button>}
            {!isMobile && <div style={{ fontSize:12, color:c.textHint }}>v1.0</div>}
          </div>
        )}

        {/* Modalità focus */}
        {focusMode && (
          <div style={{ position:"fixed", inset:0, zIndex:400, background:c.bg, display:"flex", flexDirection:"column", animation:"fadeIn .3s ease" }}>
            <div style={{ display:"flex", alignItems:"center", padding:"8px 16px", gap:10, borderBottom:`1px solid ${c.border}`, background:c.headerBg }}>
              <span style={{ fontSize:16 }}>{currentTool.icon}</span>
              <span style={{ fontSize:14, fontWeight:500, color:c.text }}>{currentTool.label}</span>
              <div style={{ flex:1 }}/>
              <span style={{ fontSize:11, color:c.textHint }}>Modalità Focus</span>
              <button onClick={()=>setFocusMode(false)} style={{ padding:"5px 12px", borderRadius:8, border:`1px solid ${c.accent}`, background:c.accentBg, cursor:"pointer", color:c.accent, fontSize:12, fontWeight:500 }}>✕ Esci</button>
            </div>
            <div style={{ flex:1, padding:20, overflow:"auto" }}>
              <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:24, height:"calc(100% - 48px)" }}>
                {panels[active]}
              </div>
            </div>
          </div>
        )}

        {/* Pannello normale */}
        {!focusMode && (
          <div style={{ flex:1, padding:isMobile?10:20, overflow:"auto", paddingBottom:bottomOffset }}>
            <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:16, padding:isMobile?14:24, height:`calc(100% - ${isMobile?20:40}px)` }}>
              {panels[active]}
            </div>
          </div>
        )}
      </div>

      {/* ── NAVBAR MOBILE ── */}
      {isMobile && !focusMode && (
        <div style={{ position:"fixed", bottom:showMiniPlayer?56:0, left:0, right:0, zIndex:200, background:c.bg==="#0a0a0a"?"rgba(10,10,10,0.95)":"rgba(255,255,255,0.95)", borderTop:`1px solid ${c.border}`, backdropFilter:"blur(12px)", display:"flex", alignItems:"center", height:64, paddingBottom:"env(safe-area-inset-bottom)" }}>
          {MOBILE_TABS.map(t => {
            const isActive = t.id!=="more" && active===t.id;
            return (
              <button key={t.id} onClick={()=>t.id==="more"?setShowDrawer(true):setActive(t.id)}
                style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, padding:"8px 0", border:"none", background:"transparent", cursor:"pointer", color:isActive?c.accent:c.textMuted, transition:"all .2s" }}>
                <div style={{ width:36, height:26, borderRadius:13, display:"flex", alignItems:"center", justifyContent:"center", background:isActive?c.accentBg:"transparent", transition:"all .2s" }}>
                  <span style={{ fontSize:18 }}>{t.icon}</span>
                </div>
                <span style={{ fontSize:10, fontWeight:isActive?600:400 }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}