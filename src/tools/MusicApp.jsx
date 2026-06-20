import { useState, useRef } from "react";

const NEON = "#ff6b9d";
const NEON2 = "#ff1493";
const glow = (col, s = 10) => `0 0 ${s}px ${col}, 0 0 ${s * 2}px ${col}`;

function formatTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function generateColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ["#7c3aed","#0ea5e9","#ec4899","#f59e0b","#10b981","#6366f1","#f97316","#14b8a6","#8b5cf6","#ef4444"];
  return colors[Math.abs(hash) % colors.length];
}

function Cover({ name, size = 180, style = {} }) {
  const color = name ? generateColor(name) : "#333";
  const initials = name ? name.slice(0, 2).toUpperCase() : "♪";
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.18, background: `linear-gradient(135deg,${color}cc,${color}44)`, border: `2px solid ${color}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.28, fontWeight: 700, color: "#fff", boxShadow: `0 0 ${size*.15}px ${color}44,0 ${size*.08}px ${size*.15}px rgba(0,0,0,.6)`, flexShrink: 0, userSelect: "none", ...style }}>
      {initials}
    </div>
  );
}

function ProgressBar({ current, total, onChange }) {
  const ref = useRef();
  const pct = total ? Math.min((current / total) * 100, 100) : 0;

  const handleClick = (e) => {
    const rect = ref.current.getBoundingClientRect();
    onChange(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * total);
  };
  return (
    <div ref={ref} onClick={handleClick} style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", width: "100%" }}>
      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 2, background: `linear-gradient(90deg,${NEON},${NEON2})`, boxShadow: glow(NEON, 4) }} />
      <div style={{ position: "absolute", top: "50%", left: `${pct}%`, transform: "translate(-50%,-50%)", width: 12, height: 12, borderRadius: "50%", background: "#fff", boxShadow: glow(NEON, 6), pointerEvents: "none" }} />
    </div>
  );
}

export default function MusicApp({ audioState, audioRef, blobMap }) {
  const {
    songs, setSongs, playlists, setPlaylists,
    currentId, queue, setQueue, queueIndex, setQueueIndex,
    playing, currentTime, duration,
    volume, setVolume, muted, setMuted,
    shuffle, setShuffle, repeat, setRepeat,
    playSong, togglePlay, playNext, playPrev,
  } = audioState;

  const [tab, setTab] = useState("player");
  const [search, setSearch] = useState("");
  const [newPLName, setNewPLName] = useState("");
  const [selectedPL, setSelectedPL] = useState(null);
  const [addToPL, setAddToPL] = useState(null);
  const fileRef = useRef();

  const currentSong = songs.find(s => s.id === currentId);
  const hasBlob = !!blobMap.current[currentId];
  const filtered = songs.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const importFiles = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const newSongs = [];
    files.forEach(f => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      blobMap.current[id] = URL.createObjectURL(f);
      newSongs.push({ id, name: f.name.replace(/\.[^.]+$/, "") });
    });
    setSongs(prev => {
      const updated = [...prev, ...newSongs];
      if (!currentId) {
        setQueue(updated.map(s => s.id));
        setQueueIndex(0);
        audioState.setCurrentId(newSongs[0].id);
      }
      return updated;
    });
    e.target.value = "";
  };

  const deleteSong = (id) => {
    URL.revokeObjectURL(blobMap.current[id]);
    // eslint-disable-next-line react-hooks/immutability
    blobMap.current = Object.fromEntries(Object.entries(blobMap.current).filter(([k]) => k !== id));
    setSongs(prev => prev.filter(s => s.id !== id));
    setPlaylists(prev => prev.map(p => ({ ...p, songs: p.songs.filter(sid => sid !== id) })));
    if (currentId === id) { audioRef.current.pause(); audioState.setCurrentId(null); }
  };

  const createPL = () => {
    if (!newPLName.trim()) return;
    setPlaylists(prev => [...prev, { id: `pl_${Date.now()}`, name: newPLName.trim(), songs: [] }]);
    setNewPLName("");
  };

  const addToPLFn = (plId, songId) => {
    setPlaylists(prev => prev.map(p => p.id === plId && !p.songs.includes(songId) ? { ...p, songs: [...p.songs, songId] } : p));
    setAddToPL(null);
  };

  const removeFromPL = (plId, songId) => {
    setPlaylists(prev => prev.map(p => p.id === plId ? { ...p, songs: p.songs.filter(s => s !== songId) } : p));
    setSelectedPL(prev => prev ? { ...prev, songs: prev.songs.filter(s => s !== songId) } : null);
  };

  const deletePL = (id) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (selectedPL?.id === id) setSelectedPL(null);
  };

  const playPL = (pl) => {
    const ids = pl.songs.filter(id => blobMap.current[id]);
    if (!ids.length) { alert("Ricarica prima i file audio nella Libreria!"); return; }
    setQueue(ids); setQueueIndex(0);
    audioState.setCurrentId(ids[0]);
    setTimeout(() => audioRef.current.play().catch(() => {}), 80);
  };

  const iBtn = (active, onClick, label, title) => (
    <button onClick={onClick} title={title} style={{ background: "transparent", border: "none", cursor: "pointer", color: active ? NEON : "rgba(255,255,255,0.4)", fontSize: 18, padding: 8, borderRadius: 8, boxShadow: active ? glow(NEON, 4) : "none", transition: "all .2s" }}>{label}</button>
  );

  const tabBtn = (id, label, icon) => (
    <button onClick={() => setTab(id)} style={{ flex: 1, padding: "10px 0", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: tab === id ? 600 : 400, color: tab === id ? NEON : "rgba(255,255,255,0.4)", borderBottom: `2px solid ${tab === id ? NEON : "transparent"}`, transition: "all .2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>{label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0a", borderRadius: 12, overflow: "hidden", color: "#fff" }}>
      <style>{`
        @keyframes bars{0%,100%{height:4px}50%{height:14px}}
        .song-row:hover{background:rgba(255,107,157,0.08)!important;}
        .song-row .acts{opacity:0;transition:opacity .2s;}
        .song-row:hover .acts{opacity:1;}
        input[type=range]{accent-color:${NEON};cursor:pointer;}
      `}</style>

      <input ref={fileRef} type="file" accept="audio/*" multiple style={{ display: "none" }} onChange={importFiles} />

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,107,157,0.2)", background: "#111", flexShrink: 0 }}>
        {tabBtn("player","Player","🎵")}
        {tabBtn("library","Libreria","🎶")}
        {tabBtn("playlists","Playlist","📋")}
      </div>

      {/* ── PLAYER ── */}
      {tab === "player" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "28px 24px 20px", overflow: "hidden" }}>
          {!currentSong ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <div style={{ fontSize: 72, opacity: .2 }}>🎵</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 15 }}>Nessuna canzone selezionata</div>
              <button onClick={() => fileRef.current.click()} style={{ padding: "12px 28px", borderRadius: 30, border: `1.5px solid ${NEON}`, background: "rgba(255,107,157,0.1)", color: NEON, cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: glow(NEON, 8) }}>
                + Importa musica
              </button>
            </div>
          ) : (
            <>
              {!hasBlob && (
                <div style={{ width: "100%", padding: "9px 12px", background: "rgba(255,107,157,0.1)", border: `1px solid ${NEON}`, borderRadius: 8, fontSize: 12, color: NEON, textAlign: "center", marginBottom: 8 }}>
                  ⚠️ Ricarica il file dalla Libreria dopo il refresh
                </div>
              )}
              <div style={{ transition: "transform .3s", transform: playing ? "scale(1.04)" : "scale(1)" }}>
                <Cover name={currentSong.name} size={190} />
              </div>
              <div style={{ textAlign: "center", width: "100%", padding: "18px 0 8px" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", textShadow: glow(NEON, 4), marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentSong.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                  {queueIndex + 1} / {queue.length} brani
                  {repeat !== "none" && <span style={{ color: NEON, marginLeft: 8 }}>{repeat === "one" ? "🔂" : "🔁"}</span>}
                  {shuffle && <span style={{ color: NEON, marginLeft: 8 }}>🔀</span>}
                </div>
              </div>
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
                <ProgressBar current={currentTime} total={duration} onChange={t => { audioRef.current.currentTime = t; }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  <span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%" }}>
                {iBtn(shuffle, () => setShuffle(!shuffle), "🔀", "Casuale")}
                <button onClick={playPrev} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#fff", fontSize: 30, padding: "6px 10px" }}>⏮</button>
                <button onClick={togglePlay} disabled={!hasBlob}
                  style={{ width: 64, height: 64, borderRadius: "50%", background: hasBlob ? `linear-gradient(135deg,${NEON},${NEON2})` : "#333", border: "none", cursor: hasBlob ? "pointer" : "not-allowed", color: "#fff", fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: hasBlob ? glow(NEON, 14) : "none", transition: "all .2s" }}>
                  {playing ? "⏸" : "▶"}
                </button>
                <button onClick={playNext} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#fff", fontSize: 30, padding: "6px 10px" }}>⏭</button>
                {iBtn(repeat !== "none", () => setRepeat(r => r === "none" ? "all" : r === "all" ? "one" : "none"), repeat === "one" ? "🔂" : "🔁", "Ripeti")}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                <button onClick={() => setMuted(!muted)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 18 }}>
                  {muted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                </button>
                <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
                  onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }} style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", minWidth: 32, textAlign: "right" }}>{Math.round((muted ? 0 : volume) * 100)}%</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── LIBRERIA ── */}
      {tab === "library" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", display: "flex", gap: 8, borderBottom: "1px solid rgba(255,107,157,0.15)", flexShrink: 0 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca brano..."
              style={{ flex: 1, padding: "8px 12px", borderRadius: 20, border: "1px solid rgba(255,107,157,0.3)", background: "rgba(255,107,157,0.05)", color: "#fff", fontSize: 13, outline: "none" }} />
            <button onClick={() => fileRef.current.click()} style={{ padding: "8px 16px", borderRadius: 20, border: `1px solid ${NEON}`, background: "rgba(255,107,157,0.1)", color: NEON, cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>+ Aggiungi</button>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {filtered.length === 0 && (
              <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 14 }}>
                {songs.length === 0 ? "Clicca + Aggiungi per importare musica" : "Nessun risultato"}
              </div>
            )}
            {filtered.map((song, i) => {
              const isCurrent = currentId === song.id;
              const loaded = !!blobMap.current[song.id];
              return (
                <div key={song.id} className="song-row"
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: loaded ? "pointer" : "default", background: isCurrent ? "rgba(255,107,157,0.1)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.04)", position: "relative" }}
                  onClick={() => loaded && playSong(song.id)}>
                  <Cover name={song.name} size={40} style={{ borderRadius: 8, opacity: loaded ? 1 : 0.4 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: isCurrent ? 600 : 400, color: isCurrent ? NEON : loaded ? "#fff" : "rgba(255,255,255,0.3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>{loaded ? `#${i + 1}` : "⚠️ Ricarica"}</div>
                  </div>
                  {isCurrent && playing && loaded && (
                    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 18 }}>
                      {[0.6,1.0,0.8].map((d,i) => <div key={i} style={{ width: 3, background: NEON, borderRadius: 2, animation: `bars ${d}s ease-in-out ${i*.15}s infinite`, height: 8 }} />)}
                    </div>
                  )}
                  <div className="acts" style={{ display: "flex", gap: 4 }}>
                    <button onClick={e => { e.stopPropagation(); setAddToPL(addToPL === song.id ? null : song.id); }}
                      style={{ background: "rgba(255,107,157,0.1)", border: "1px solid rgba(255,107,157,0.3)", borderRadius: 6, padding: "4px 8px", color: NEON, cursor: "pointer", fontSize: 11 }}>+PL</button>
                    <button onClick={e => { e.stopPropagation(); deleteSong(song.id); }}
                      style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: 15, padding: "4px 6px" }}>✕</button>
                  </div>
                  {addToPL === song.id && (
                    <div onClick={e => e.stopPropagation()} style={{ position: "absolute", right: 60, top: 44, background: "#1a1020", border: `1px solid ${NEON}`, borderRadius: 10, padding: "8px 6px", zIndex: 20, minWidth: 160, boxShadow: glow(NEON, 10) }}>
                      <div style={{ fontSize: 10, color: "rgba(255,107,157,0.5)", marginBottom: 6, letterSpacing: 1, padding: "0 6px" }}>AGGIUNGI A PLAYLIST</div>
                      {playlists.length === 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", padding: "4px 6px" }}>Nessuna playlist</div>}
                      {playlists.map(pl => (
                        <div key={pl.id} onClick={() => addToPLFn(pl.id, song.id)}
                          style={{ padding: "7px 10px", borderRadius: 7, cursor: "pointer", fontSize: 13, color: pl.songs.includes(song.id) ? NEON : "#fff", background: pl.songs.includes(song.id) ? "rgba(255,107,157,0.1)" : "transparent" }}>
                          {pl.songs.includes(song.id) ? "✓ " : ""}{pl.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PLAYLIST ── */}
      {tab === "playlists" && (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div style={{ width: selectedPL ? 170 : "100%", borderRight: selectedPL ? "1px solid rgba(255,107,157,0.15)" : "none", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width .3s", flexShrink: 0 }}>
            <div style={{ padding: "10px", borderBottom: "1px solid rgba(255,107,157,0.15)", display: "flex", gap: 6, flexShrink: 0 }}>
              <input value={newPLName} onChange={e => setNewPLName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") createPL(); }}
                placeholder="Nome playlist..."
                style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(255,107,157,0.3)", background: "rgba(255,107,157,0.05)", color: "#fff", fontSize: 12, outline: "none" }} />
              <button onClick={createPL} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${NEON}`, background: "rgba(255,107,157,0.15)", color: NEON, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>+</button>
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              {playlists.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Scrivi un nome e premi +</div>}
              {playlists.map(pl => (
                <div key={pl.id} onClick={() => setSelectedPL(selectedPL?.id === pl.id ? null : pl)}
                  style={{ padding: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: selectedPL?.id === pl.id ? "rgba(255,107,157,0.12)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg,${generateColor(pl.name)},#0a0a0a)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🎵</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: selectedPL?.id === pl.id ? NEON : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pl.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>{pl.songs.length} brani</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deletePL(pl.id); }} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", fontSize: 15 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
          {selectedPL && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,107,157,0.15)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <button onClick={() => setSelectedPL(null)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 20 }}>‹</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedPL.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{selectedPL.songs.length} brani</div>
                </div>
                {selectedPL.songs.length > 0 && (
                  <button onClick={() => playPL(playlists.find(p => p.id === selectedPL.id))}
                    style={{ padding: "6px 12px", borderRadius: 16, border: `1px solid ${NEON}`, background: "rgba(255,107,157,0.1)", color: NEON, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>▶ Play</button>
                )}
              </div>
              <div style={{ flex: 1, overflow: "auto" }}>
                {selectedPL.songs.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Aggiungi brani con +PL dalla Libreria</div>}
                {selectedPL.songs.map(sid => {
                  const song = songs.find(s => s.id === sid);
                  if (!song) return null;
                  return (
                    <div key={sid} className="song-row"
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "transparent" }}>
                      <Cover name={song.name} size={34} style={{ borderRadius: 6 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.name}</div>
                      </div>
                      <button onClick={() => removeFromPL(selectedPL.id, sid)} className="acts"
                        style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", fontSize: 14, padding: "4px 6px" }}>✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}