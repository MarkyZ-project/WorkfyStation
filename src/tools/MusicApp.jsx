import { useState, useRef, useEffect } from "react";

const NEON = "#ff6b9d";
const NEON2 = "#ff1493";
const glow = (c = NEON, s = 10) => `0 0 ${s}px ${c}, 0 0 ${s * 2}px ${c}`;

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

// Copertina generata con iniziali e colore
function Cover({ song, size = 180, style = {} }) {
  const color = song ? generateColor(song.name) : "#333";
  const initials = song ? song.name.slice(0, 2).toUpperCase() : "♪";
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.18,
      background: `linear-gradient(135deg, ${color}cc, ${color}55)`,
      border: `2px solid ${color}88`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.3, fontWeight: 700, color: "#fff",
      boxShadow: `0 0 ${size * 0.2}px ${color}44, 0 ${size * 0.1}px ${size * 0.2}px rgba(0,0,0,0.5)`,
      flexShrink: 0, userSelect: "none",
      ...style,
    }}>
      {initials}
    </div>
  );
}

// Barra progresso custom
function ProgressBar({ current, total, onChange, c }) {
  const ref = useRef();
  const pct = total ? (current / total) * 100 : 0;

  const handleClick = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onChange(ratio * total);
  };

  return (
    <div ref={ref} onClick={handleClick}
      style={{ height: 4, borderRadius: 2, background: c.border, cursor: "pointer", position: "relative", width: "100%" }}>
      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 2, background: `linear-gradient(90deg, ${NEON}, ${NEON2})`, boxShadow: glow(NEON, 4), transition: "width .1s linear" }} />
      <div style={{ position: "absolute", top: "50%", left: `${pct}%`, transform: "translate(-50%, -50%)", width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: glow(NEON, 6), cursor: "grab" }} />
    </div>
  );
}

export default function MusicApp({ c }) {
  const [tab, setTab] = useState("player");
  const [songs, setSongs] = useState(() => { try { return JSON.parse(localStorage.getItem("wfy_songs") || "[]"); } catch { return []; } });
  const [playlists, setPlaylists] = useState(() => { try { return JSON.parse(localStorage.getItem("wfy_playlists") || "[]"); } catch { return []; } });
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState("none"); // none, one, all
  const [search, setSearch] = useState("");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(null);
  const audioRef = useRef();
  const fileRef = useRef();

  const currentSong = queue[queueIndex] || null;

  // Salva songs e playlists
  useEffect(() => { localStorage.setItem("wfy_songs", JSON.stringify(songs.map(s => ({ ...s, url: undefined })))); }, [songs]);
  useEffect(() => { localStorage.setItem("wfy_playlists", JSON.stringify(playlists)); }, [playlists]);

  // Controlli audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong?.url) return;
    audio.src = currentSong.url;
    audio.volume = muted ? 0 : volume;
    if (playing) audio.play().catch(() => {});
  }, [currentSong]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const playNext = () => {
    if (!queue.length) return;
    if (repeat === "one") { audioRef.current.currentTime = 0; audioRef.current.play(); return; }
    let next;
    if (shuffle) { next = Math.floor(Math.random() * queue.length); }
    else { next = (queueIndex + 1) % queue.length; }
    setQueueIndex(next);
    setPlaying(true);
    setTimeout(() => audioRef.current?.play(), 50);
  };

  const playPrev = () => {
    if (!queue.length) return;
    if (currentTime > 3) { audioRef.current.currentTime = 0; return; }
    const prev = (queueIndex - 1 + queue.length) % queue.length;
    setQueueIndex(prev);
    setPlaying(true);
    setTimeout(() => audioRef.current?.play(), 50);
  };

  const playSong = (song, songList) => {
    const list = songList || songs;
    const urls = list.map(s => ({ ...s, url: songs.find(os => os.id === s.id)?.url || s.url }));
    const idx = urls.findIndex(s => s.id === song.id);
    setQueue(urls);
    setQueueIndex(idx >= 0 ? idx : 0);
    setPlaying(true);
    setTimeout(() => audioRef.current?.play(), 50);
  };

  // Importa file audio
  const importFiles = (e) => {
    const files = Array.from(e.target.files);
    const newSongs = files.map(f => ({
      id: Date.now() + Math.random(),
      name: f.name.replace(/\.[^.]+$/, ""),
      file: f.name,
      url: URL.createObjectURL(f),
      duration: 0,
    }));
    setSongs(prev => [...prev, ...newSongs]);
    if (newSongs.length > 0 && queue.length === 0) {
      setQueue(newSongs);
      setQueueIndex(0);
    }
  };

  const deleteSong = (id) => {
    setSongs(prev => prev.filter(s => s.id !== id));
    setPlaylists(prev => prev.map(p => ({ ...p, songs: p.songs.filter(sid => sid !== id) })));
  };

  // Playlist
  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const pl = { id: Date.now(), name: newPlaylistName.trim(), songs: [] };
    setPlaylists(prev => [...prev, pl]);
    setNewPlaylistName("");
  };

  const addToPlaylist = (playlistId, songId) => {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistId && !p.songs.includes(songId)
        ? { ...p, songs: [...p.songs, songId] }
        : p
    ));
    setShowAddToPlaylist(null);
  };

  const removeFromPlaylist = (playlistId, songId) => {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistId ? { ...p, songs: p.songs.filter(s => s !== songId) } : p
    ));
  };

  const deletePlaylist = (id) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
  };

  const playPlaylist = (pl) => {
    const plSongs = pl.songs.map(id => songs.find(s => s.id === id)).filter(Boolean);
    if (!plSongs.length) return;
    setQueue(plSongs);
    setQueueIndex(0);
    setPlaying(true);
    setTimeout(() => audioRef.current?.play(), 50);
  };

  const filteredSongs = songs.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const iconBtn = (active, onClick, children, title) => (
    <button onClick={onClick} title={title} style={{
      background: "transparent", border: "none", cursor: "pointer",
      color: active ? NEON : "rgba(255,255,255,0.5)",
      fontSize: 18, padding: 8, borderRadius: 8,
      boxShadow: active ? glow(NEON, 4) : "none",
      transition: "all .2s",
    }}>{children}</button>
  );

  const tabBtn = (id, label, icon) => (
    <button onClick={() => setTab(id)} style={{
      flex: 1, padding: "10px 0", border: "none", background: "transparent",
      cursor: "pointer", fontSize: 13, fontWeight: tab === id ? 600 : 400,
      color: tab === id ? NEON : "rgba(255,255,255,0.5)",
      borderBottom: `2px solid ${tab === id ? NEON : "transparent"}`,
      transition: "all .2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0a", borderRadius: 12, overflow: "hidden", color: "#fff" }}>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse-cover { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
        .song-row:hover { background: rgba(255,107,157,0.08) !important; }
        .song-row:hover .song-actions { opacity: 1 !important; }
        .song-actions { opacity: 0; transition: opacity .2s; }
        input[type=range] { accent-color: ${NEON}; }
      `}</style>

      <audio ref={audioRef}
        onTimeUpdate={e => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={e => setDuration(e.target.duration)}
        onEnded={playNext}
      />
      <input ref={fileRef} type="file" accept="audio/*" multiple style={{ display: "none" }} onChange={importFiles} />

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,107,157,0.2)", background: "#111" }}>
        {tabBtn("player", "Player", "🎵")}
        {tabBtn("library", "Libreria", "🎶")}
        {tabBtn("playlists", "Playlist", "📋")}
      </div>

      {/* ── TAB PLAYER ── */}
      {tab === "player" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "24px 20px 20px", overflow: "hidden" }}>

          {!currentSong ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <div style={{ fontSize: 64, opacity: .3 }}>🎵</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>Nessuna canzone selezionata</div>
              <button onClick={() => fileRef.current.click()} style={{ padding: "12px 28px", borderRadius: 30, border: `1.5px solid ${NEON}`, background: "rgba(255,107,157,0.1)", color: NEON, cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: glow(NEON, 8) }}>
                + Importa musica
              </button>
            </div>
          ) : (
            <>
              {/* Copertina */}
              <div style={{ animation: playing ? "pulse-cover 2s ease-in-out infinite" : "none" }}>
                <Cover song={currentSong} size={200} />
              </div>

              {/* Info canzone */}
              <div style={{ textAlign: "center", width: "100%", padding: "20px 0 10px" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", textShadow: glow(NEON, 4), marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {currentSong.name}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                  {queueIndex + 1} / {queue.length} brani
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
                <ProgressBar current={currentTime} total={duration} onChange={t => { audioRef.current.currentTime = t; }} c={c} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controlli principali */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}>
                {iconBtn(shuffle, () => setShuffle(!shuffle), "🔀", "Casuale")}
                <button onClick={playPrev} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#fff", fontSize: 28, padding: 8 }}>⏮</button>
                <button onClick={togglePlay} style={{
                  width: 60, height: 60, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${NEON}, ${NEON2})`,
                  border: "none", cursor: "pointer", color: "#fff", fontSize: 24,
                  boxShadow: glow(NEON, 12), display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .2s",
                }}>
                  {playing ? "⏸" : "▶"}
                </button>
                <button onClick={playNext} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#fff", fontSize: 28, padding: 8 }}>⏭</button>
                {iconBtn(repeat !== "none", () => setRepeat(r => r === "none" ? "all" : r === "all" ? "one" : "none"),
                  repeat === "one" ? "🔂" : "🔁", "Ripeti")}
              </div>

              {/* Volume */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                <button onClick={() => setMuted(!muted)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 16 }}>
                  {muted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                </button>
                <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
                  onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }}
                  style={{ flex: 1, height: 4 }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", minWidth: 32 }}>{Math.round((muted ? 0 : volume) * 100)}%</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB LIBRERIA ── */}
      {tab === "library" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Barra azioni */}
          <div style={{ padding: "12px 16px", display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid rgba(255,107,157,0.15)" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca brano..."
              style={{ flex: 1, padding: "8px 12px", borderRadius: 20, border: "1px solid rgba(255,107,157,0.3)", background: "rgba(255,107,157,0.05)", color: "#fff", fontSize: 13, outline: "none" }} />
            <button onClick={() => fileRef.current.click()} style={{ padding: "8px 16px", borderRadius: 20, border: `1px solid ${NEON}`, background: "rgba(255,107,157,0.1)", color: NEON, cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
              + Aggiungi
            </button>
          </div>

          {/* Lista canzoni */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {filteredSongs.length === 0 && (
              <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
                {songs.length === 0 ? "Nessun brano importato" : "Nessun risultato"}
              </div>
            )}
            {filteredSongs.map((song, i) => (
              <div key={song.id} className="song-row"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer", background: currentSong?.id === song.id ? "rgba(255,107,157,0.12)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.04)", position: "relative" }}
                onClick={() => playSong(song)}>
                <Cover song={song} size={40} style={{ borderRadius: 8 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: currentSong?.id === song.id ? 600 : 400, color: currentSong?.id === song.id ? NEON : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>#{i + 1}</div>
                </div>
                {currentSong?.id === song.id && playing && (
                  <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 16 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 3, background: NEON, borderRadius: 2, animation: `spin ${0.6 + i * 0.2}s ease-in-out ${i * 0.1}s infinite alternate`, height: `${8 + i * 4}px` }} />
                    ))}
                  </div>
                )}
                <div className="song-actions" style={{ display: "flex", gap: 4 }}>
                  <button onClick={e => { e.stopPropagation(); setShowAddToPlaylist(showAddToPlaylist === song.id ? null : song.id); }}
                    style={{ background: "rgba(255,107,157,0.1)", border: `1px solid rgba(255,107,157,0.3)`, borderRadius: 6, padding: "4px 8px", color: NEON, cursor: "pointer", fontSize: 11 }}>+ PL</button>
                  <button onClick={e => { e.stopPropagation(); deleteSong(song.id); }}
                    style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 14, padding: "4px 6px" }}>✕</button>
                </div>

                {/* Dropdown aggiungi a playlist */}
                {showAddToPlaylist === song.id && (
                  <div style={{ position: "absolute", right: 60, top: 40, background: "#1a1a2e", border: `1px solid ${NEON}`, borderRadius: 10, padding: 8, zIndex: 10, minWidth: 160, boxShadow: glow(NEON, 8) }}>
                    <div style={{ fontSize: 11, color: "rgba(255,107,157,0.6)", marginBottom: 6, letterSpacing: 1 }}>AGGIUNGI A</div>
                    {playlists.length === 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", padding: "4px 0" }}>Nessuna playlist</div>}
                    {playlists.map(pl => (
                      <div key={pl.id} onClick={e => { e.stopPropagation(); addToPlaylist(pl.id, song.id); }}
                        style={{ padding: "6px 8px", borderRadius: 6, cursor: "pointer", fontSize: 13, color: pl.songs.includes(song.id) ? NEON : "#fff", background: pl.songs.includes(song.id) ? "rgba(255,107,157,0.1)" : "transparent" }}>
                        {pl.songs.includes(song.id) ? "✓ " : ""}{pl.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB PLAYLIST ── */}
      {tab === "playlists" && (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Lista playlist */}
          <div style={{ width: selectedPlaylist ? 180 : "100%", borderRight: selectedPlaylist ? "1px solid rgba(255,107,157,0.15)" : "none", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width .3s" }}>
            <div style={{ padding: 12, borderBottom: "1px solid rgba(255,107,157,0.15)", display: "flex", gap: 8 }}>
              <input value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createPlaylist()}
                placeholder="Nome playlist..."
                style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(255,107,157,0.3)", background: "rgba(255,107,157,0.05)", color: "#fff", fontSize: 12, outline: "none" }} />
              <button onClick={createPlaylist} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${NEON}`, background: "rgba(255,107,157,0.1)", color: NEON, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>+</button>
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              {playlists.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Nessuna playlist</div>
              )}
              {playlists.map(pl => (
                <div key={pl.id} onClick={() => setSelectedPlaylist(selectedPlaylist?.id === pl.id ? null : pl)}
                  style={{ padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: selectedPlaylist?.id === pl.id ? "rgba(255,107,157,0.12)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${generateColor(pl.name)}, #0a0a0a)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🎵</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: selectedPlaylist?.id === pl.id ? NEON : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pl.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{pl.songs.length} brani</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", fontSize: 14 }}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Dettaglio playlist */}
          {selectedPlaylist && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,107,157,0.15)", display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => setSelectedPlaylist(null)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 18 }}>‹</button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{selectedPlaylist.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{selectedPlaylist.songs.length} brani</div>
                </div>
                {selectedPlaylist.songs.length > 0 && (
                  <button onClick={() => playPlaylist(playlists.find(p => p.id === selectedPlaylist.id))}
                    style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${NEON}`, background: "rgba(255,107,157,0.1)", color: NEON, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                    ▶ Riproduci
                  </button>
                )}
              </div>
              <div style={{ flex: 1, overflow: "auto" }}>
                {selectedPlaylist.songs.length === 0 && (
                  <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
                    Aggiungi brani dalla Libreria
                  </div>
                )}
                {selectedPlaylist.songs.map(sid => {
                  const song = songs.find(s => s.id === sid);
                  if (!song) return null;
                  return (
                    <div key={sid} className="song-row"
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "transparent" }}
                      onClick={() => { const pl = playlists.find(p => p.id === selectedPlaylist.id); playPlaylist(pl); }}>
                      <Cover song={song} size={36} style={{ borderRadius: 6 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.name}</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); removeFromPlaylist(selectedPlaylist.id, sid); setSelectedPlaylist(p => ({ ...p, songs: p.songs.filter(s => s !== sid) })); }}
                        style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", fontSize: 14 }} className="song-actions">✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mini player persistente (visible nelle tab libreria e playlist) */}
      {tab !== "player" && currentSong && (
        <div style={{ borderTop: "1px solid rgba(255,107,157,0.2)", padding: "10px 16px", background: "#111", display: "flex", alignItems: "center", gap: 12 }}>
          <Cover song={currentSong} size={38} style={{ borderRadius: 8 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: NEON, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentSong.name}</div>
            <div style={{ marginTop: 4 }}>
              <ProgressBar current={currentTime} total={duration} onChange={t => { audioRef.current.currentTime = t; }} c={c} />
            </div>
          </div>
          <button onClick={playPrev} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#fff", fontSize: 18 }}>⏮</button>
          <button onClick={togglePlay} style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${NEON}, ${NEON2})`, border: "none", cursor: "pointer", color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: glow(NEON, 6) }}>
            {playing ? "⏸" : "▶"}
          </button>
          <button onClick={playNext} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#fff", fontSize: 18 }}>⏭</button>
          <button onClick={() => setTab("player")} style={{ background: "transparent", border: `1px solid rgba(255,107,157,0.3)`, borderRadius: 6, padding: "4px 8px", color: "rgba(255,107,157,0.7)", cursor: "pointer", fontSize: 11 }}>↑ Player</button>
        </div>
      )}
    </div>
  );
}