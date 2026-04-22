import { useState, useRef, useEffect } from "react";

const key = (email, name) => `${name}_${email}`;

const PRIORITY_CONFIG = {
  alta:   { label: "Alta",   color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
  media:  { label: "Media",  color: "#f97316", bg: "rgba(249,115,22,0.12)"  },
  bassa:  { label: "Bassa",  color: "#10b981", bg: "rgba(16,185,129,0.12)"  },
};

const PROJECT_COLORS = ["#ff6b9d","#a855f7","#3b82f6","#10b981","#f97316","#eab308","#06b6d4","#ef4444","#8b5cf6","#14b8a6"];
const PROJECT_ICONS  = ["📁","🚀","💼","🎯","📚","🏠","💡","🎨","⚡","🔧","❤️","🌟"];
const TAG_COLORS     = ["#ff6b9d","#a855f7","#3b82f6","#10b981","#f97316","#eab308","#06b6d4","#ef4444"];

const KANBAN_COLS = [
  { id: "todo",       label: "Da fare",    color: "#3b82f6" },
  { id: "inprogress", label: "In corso",   color: "#f97316" },
  { id: "done",       label: "Completato", color: "#10b981" },
];

function formatDate(d) {
  if (!d) return null;
  const date = new Date(d);
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  date.setHours(0,0,0,0);
  if (date.getTime() === today.getTime()) return { label:"Oggi", color:"#f97316" };
  if (date.getTime() === tomorrow.getTime()) return { label:"Domani", color:"#eab308" };
  if (date < today) return { label: date.toLocaleDateString("it-IT",{day:"2-digit",month:"short"}), color:"#ef4444", overdue: true };
  return { label: date.toLocaleDateString("it-IT",{day:"2-digit",month:"short"}), color:"#10b981" };
}

function getStreak(tasks) {
  const days = new Set(tasks.filter(t=>t.completedAt).map(t=>new Date(t.completedAt).toDateString()));
  let streak = 0, d = new Date();
  while (days.has(d.toDateString())) { streak++; d.setDate(d.getDate()-1); }
  return streak;
}

export default function TodoApp({ email, c }) {
  const k = key(email, "todo");
  const pk = key(email, "todo_projects");

  const [tasks, setTasks] = useState(() => { try { return JSON.parse(localStorage.getItem(k)||"[]"); } catch { return []; } });
  const [projects, setProjects] = useState(() => { try { return JSON.parse(localStorage.getItem(pk)||"[]"); } catch { return [{ id:"default", name:"Generale", color:"#ff6b9d", icon:"📁" }]; } });
  const [view, setView] = useState("list");
  const [selProject, setSelProject] = useState("all");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created");
  const [expandedTask, setExpandedTask] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  // Form nuovo task
  const [form, setForm] = useState({ title:"", desc:"", priority:"media", dueDate:"", projectId:"default", tags:[], subtasks:[] });
  const [newTag, setNewTag] = useState("");
  const [newSubtask, setNewSubtask] = useState("");

  // Form nuovo progetto
  const [pForm, setPForm] = useState({ name:"", color: PROJECT_COLORS[0], icon: PROJECT_ICONS[0] });

  const saveTasks = t => { setTasks(t); localStorage.setItem(k, JSON.stringify(t)); };
  const saveProjects = p => { setProjects(p); localStorage.setItem(pk, JSON.stringify(p)); };

  // ── TASK CRUD ──
  const addTask = () => {
    if (!form.title.trim()) return;
    const t = { id:`t_${Date.now()}`, ...form, title: form.title.trim(), status:"todo", completed:false, createdAt: Date.now(), completedAt:null };
    saveTasks([t, ...tasks]);
    setForm({ title:"", desc:"", priority:"media", dueDate:"", projectId: selProject!=="all" ? selProject : "default", tags:[], subtasks:[] });
    setShowNewTask(false);
  };

  const toggleTask = id => {
    saveTasks(tasks.map(t => t.id===id ? { ...t, completed:!t.completed, status: !t.completed?"done":"todo", completedAt: !t.completed ? Date.now() : null } : t));
  };

  const deleteTask = id => saveTasks(tasks.filter(t => t.id!==id));

  const updateTask = (id, changes) => saveTasks(tasks.map(t => t.id===id ? {...t,...changes} : t));

  const toggleSubtask = (taskId, stIdx) => {
    saveTasks(tasks.map(t => {
      if (t.id!==taskId) return t;
      const subtasks = t.subtasks.map((s,i) => i===stIdx ? {...s, done:!s.done} : s);
      return {...t, subtasks};
    }));
  };

  const setStatus = (id, status) => saveTasks(tasks.map(t => t.id===id ? {...t, status, completed: status==="done", completedAt: status==="done"?Date.now():null} : t));

  // ── PROJECT CRUD ──
  const addProject = () => {
    if (!pForm.name.trim()) return;
    const p = { id:`p_${Date.now()}`, ...pForm, name: pForm.name.trim() };
    saveProjects([...projects, p]);
    setPForm({ name:"", color: PROJECT_COLORS[0], icon: PROJECT_ICONS[0] });
    setShowNewProject(false);
  };

  const deleteProject = id => {
    saveProjects(projects.filter(p => p.id!==id));
    if (selProject===id) setSelProject("all");
    saveTasks(tasks.map(t => t.projectId===id ? {...t, projectId:"default"} : t));
  };

  // ── FILTRA & ORDINA ──
  const getFiltered = () => {
    let result = [...tasks];
    if (selProject!=="all") result = result.filter(t => t.projectId===selProject);
    if (search) result = result.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.desc?.toLowerCase().includes(search.toLowerCase()));
    const today = new Date(); today.setHours(0,0,0,0);
    if (filter==="today")    result = result.filter(t => t.dueDate && new Date(t.dueDate).setHours(0,0,0,0)===today.getTime());
    if (filter==="overdue")  result = result.filter(t => !t.completed && t.dueDate && new Date(t.dueDate).setHours(0,0,0,0)<today.getTime());
    if (filter==="high")     result = result.filter(t => t.priority==="alta");
    if (filter==="done")     result = result.filter(t => t.completed);
    if (filter==="active")   result = result.filter(t => !t.completed);
    if (sortBy==="priority") result.sort((a,b) => ({alta:0,media:1,bassa:2}[a.priority]-{alta:0,media:1,bassa:2}[b.priority]));
    if (sortBy==="due")      result.sort((a,b) => (a.dueDate||"9")>(b.dueDate||"9")?1:-1);
    if (sortBy==="alpha")    result.sort((a,b) => a.title.localeCompare(b.title));
    if (sortBy==="created")  result.sort((a,b) => b.createdAt-a.createdAt);
    return result;
  };

  // ── STATS ──
  const today = new Date(); today.setHours(0,0,0,0);
  const completedToday = tasks.filter(t => t.completedAt && new Date(t.completedAt).setHours(0,0,0,0)===today.getTime()).length;
  const overdueCount   = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate).setHours(0,0,0,0)<today.getTime()).length;
  const activeCount    = tasks.filter(t => !t.completed).length;
  const streak         = getStreak(tasks);
  const totalDone      = tasks.filter(t=>t.completed).length;
  const completionRate = tasks.length ? Math.round((totalDone/tasks.length)*100) : 0;

  const filtered = getFiltered();
  const NEON = c.accent;

  const btn = (active, small) => ({
    padding: small ? "5px 10px" : "7px 14px", borderRadius: 20, fontSize: small ? 11 : 13,
    cursor: "pointer", border: `1px solid ${active ? NEON : c.border}`,
    background: active ? c.accentBg : "transparent",
    color: active ? NEON : c.textMuted, transition: "all .2s", fontWeight: active ? 600 : 400,
  });

  // ── TASK CARD ──
  const TaskCard = ({ task, kanban }) => {
    const proj = projects.find(p=>p.id===task.projectId);
    const prio = PRIORITY_CONFIG[task.priority];
    const due  = formatDate(task.dueDate);
    const subtasksDone = task.subtasks?.filter(s=>s.done).length||0;
    const subtasksTotal = task.subtasks?.length||0;
    const isExpanded = expandedTask===task.id;

    return (
      <div style={{
        background: task.completed ? `${c.surface}88` : c.surface,
        border: `1px solid ${task.completed ? c.border : isExpanded ? NEON : c.border}`,
        borderLeft: `3px solid ${prio.color}`,
        borderRadius: 12, padding: "12px 14px", marginBottom: kanban?8:6,
        opacity: task.completed ? 0.65 : 1, transition: "all .2s",
        cursor: "pointer",
      }} onClick={() => setExpandedTask(isExpanded ? null : task.id)}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
          {/* Checkbox */}
          <div onClick={e=>{e.stopPropagation();toggleTask(task.id);}}
            style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${task.completed?NEON:c.border}`, background:task.completed?NEON:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2, cursor:"pointer", transition:"all .2s", boxShadow:task.completed?`0 0 8px ${NEON}`:"none" }}>
            {task.completed && <span style={{color:"#fff",fontSize:11}}>✓</span>}
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{ fontSize:14, fontWeight:500, color:task.completed?c.textMuted:c.text, textDecoration:task.completed?"line-through":"none", marginBottom:4 }}>{task.title}</div>
            {task.desc && !isExpanded && <div style={{fontSize:12,color:c.textMuted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{task.desc}</div>}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6,alignItems:"center"}}>
              {/* Priorità */}
              <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:prio.bg,color:prio.color,fontWeight:600}}>{prio.label}</span>
              {/* Scadenza */}
              {due && <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:`${due.color}18`,color:due.color,fontWeight:500}}>{due.overdue?"⚠️ ":""}{due.label}</span>}
              {/* Progetto */}
              {proj && <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:`${proj.color}18`,color:proj.color}}>{proj.icon} {proj.name}</span>}
              {/* Tag */}
              {task.tags?.map((tag,i)=><span key={i} style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:`${tag.color}18`,color:tag.color}}>#{tag.name}</span>)}
              {/* Subtask */}
              {subtasksTotal>0 && <span style={{fontSize:10,color:c.textHint}}>{subtasksDone}/{subtasksTotal} ✓</span>}
            </div>
          </div>
          <button onClick={e=>{e.stopPropagation();deleteTask(task.id);}} style={{background:"transparent",border:"none",color:c.textHint,cursor:"pointer",fontSize:14,opacity:.5,padding:"0 4px",flexShrink:0}}>✕</button>
        </div>

        {/* Barra progresso subtask */}
        {subtasksTotal>0 && (
          <div style={{marginTop:8,height:3,borderRadius:2,background:c.border}}>
            <div style={{height:"100%",width:`${(subtasksDone/subtasksTotal)*100}%`,borderRadius:2,background:NEON,transition:"width .3s"}}/>
          </div>
        )}

        {/* Espanso */}
        {isExpanded && (
          <div onClick={e=>e.stopPropagation()} style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${c.border}`}}>
            {task.desc && <div style={{fontSize:13,color:c.textMuted,marginBottom:10,lineHeight:1.6}}>{task.desc}</div>}

            {/* Subtask */}
            {subtasksTotal>0 && (
              <div style={{marginBottom:10}}>
                <div style={{fontSize:11,color:c.textHint,letterSpacing:1,marginBottom:6}}>SOTTO-TASK</div>
                {task.subtasks.map((s,i)=>(
                  <div key={i} onClick={()=>toggleSubtask(task.id,i)}
                    style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",cursor:"pointer"}}>
                    <div style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${s.done?NEON:c.border}`,background:s.done?NEON:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
                      {s.done&&<span style={{color:"#fff",fontSize:9}}>✓</span>}
                    </div>
                    <span style={{fontSize:13,color:s.done?c.textMuted:c.text,textDecoration:s.done?"line-through":"none"}}>{s.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Cambio status */}
            {!kanban && (
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {KANBAN_COLS.map(col=>(
                  <button key={col.id} onClick={()=>setStatus(task.id,col.id)}
                    style={{padding:"4px 10px",borderRadius:8,fontSize:11,cursor:"pointer",border:`1px solid ${task.status===col.id?col.color:c.border}`,background:task.status===col.id?`${col.color}20`:"transparent",color:task.status===col.id?col.color:c.textMuted}}>
                    {col.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{display:"flex",height:"100%",gap:0,overflow:"hidden"}}>
      <style>{`
        .todo-proj:hover{background:${c.accentBg}!important;}
        .todo-tag:hover{opacity:.8;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        .todo-card-enter{animation:fadeIn .2s ease both;}
      `}</style>

      {/* ── SIDEBAR PROGETTI ── */}
      <div style={{width:200,flexShrink:0,borderRight:`1px solid ${c.border}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"12px 10px",borderBottom:`1px solid ${c.border}`}}>
          <div style={{fontSize:12,color:c.textHint,letterSpacing:1,marginBottom:8}}>PROGETTI</div>
          {/* Tutti */}
          <div className="todo-proj" onClick={()=>setSelProject("all")}
            style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,cursor:"pointer",background:selProject==="all"?c.accentBg:"transparent",marginBottom:2}}>
            <span>📋</span>
            <span style={{fontSize:13,color:selProject==="all"?NEON:c.text,fontWeight:selProject==="all"?600:400,flex:1}}>Tutti</span>
            <span style={{fontSize:11,color:c.textHint,background:c.accentBg2,padding:"1px 6px",borderRadius:8}}>{tasks.length}</span>
          </div>
          {projects.map(p=>{
            const count = tasks.filter(t=>t.projectId===p.id).length;
            const done  = tasks.filter(t=>t.projectId===p.id&&t.completed).length;
            const pct   = count ? Math.round((done/count)*100) : 0;
            return (
              <div key={p.id} className="todo-proj" onClick={()=>setSelProject(p.id)}
                style={{padding:"7px 10px",borderRadius:8,cursor:"pointer",background:selProject===p.id?c.accentBg:"transparent",marginBottom:2,position:"relative"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span>{p.icon}</span>
                  <span style={{fontSize:13,color:selProject===p.id?NEON:c.text,fontWeight:selProject===p.id?600:400,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</span>
                  <span style={{fontSize:11,color:c.textHint,background:c.accentBg2,padding:"1px 6px",borderRadius:8,flexShrink:0}}>{count}</span>
                </div>
                {count>0&&<div style={{marginTop:4,height:2,borderRadius:1,background:c.border}}><div style={{height:"100%",width:`${pct}%`,borderRadius:1,background:p.color,transition:"width .3s"}}/></div>}
              </div>
            );
          })}
          <button onClick={()=>setShowNewProject(!showNewProject)}
            style={{width:"100%",marginTop:6,padding:"6px 10px",borderRadius:8,border:`1px dashed ${c.border}`,background:"transparent",color:c.textHint,cursor:"pointer",fontSize:12,textAlign:"left"}}>
            + Nuovo progetto
          </button>
        </div>

        {/* Form nuovo progetto */}
        {showNewProject && (
          <div style={{padding:"10px",borderBottom:`1px solid ${c.border}`,animation:"fadeIn .2s ease"}}>
            <input value={pForm.name} onChange={e=>setPForm({...pForm,name:e.target.value})} placeholder="Nome progetto"
              onKeyDown={e=>e.key==="Enter"&&addProject()}
              style={{width:"100%",padding:"6px 8px",borderRadius:6,border:`1px solid ${c.border}`,background:c.inputBg,color:c.text,fontSize:12,outline:"none",boxSizing:"border-box",marginBottom:6}}/>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
              {PROJECT_COLORS.map(col=><div key={col} onClick={()=>setPForm({...pForm,color:col})} style={{width:18,height:18,borderRadius:"50%",background:col,cursor:"pointer",border:pForm.color===col?`2px solid ${c.text}`:"2px solid transparent"}}/>)}
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
              {PROJECT_ICONS.map(ic=><span key={ic} onClick={()=>setPForm({...pForm,icon:ic})} style={{cursor:"pointer",fontSize:16,padding:2,borderRadius:4,background:pForm.icon===ic?c.accentBg:"transparent"}}>{ic}</span>)}
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={addProject} style={{flex:1,padding:"5px",borderRadius:6,border:`1px solid ${NEON}`,background:c.accentBg,color:NEON,cursor:"pointer",fontSize:12}}>Crea</button>
              <button onClick={()=>setShowNewProject(false)} style={{padding:"5px 8px",borderRadius:6,border:`1px solid ${c.border}`,background:"transparent",color:c.textMuted,cursor:"pointer",fontSize:12}}>✕</button>
            </div>
          </div>
        )}

        {/* Stats rapide */}
        <div style={{padding:"12px 10px",marginTop:"auto",borderTop:`1px solid ${c.border}`}}>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {[
              {label:"Attivi",    val:activeCount,      color:NEON},
              {label:"Oggi",      val:completedToday,   color:"#10b981"},
              {label:"Scaduti",   val:overdueCount,     color:"#ef4444"},
              {label:"Streak",    val:`${streak}🔥`,    color:"#f97316"},
            ].map(s=>(
              <div key={s.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,color:c.textHint}}>{s.label}</span>
                <span style={{fontSize:13,fontWeight:600,color:s.color}}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>

        {/* Header */}
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${c.border}`,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {/* Ricerca */}
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca task..."
            style={{flex:1,minWidth:120,padding:"8px 12px",borderRadius:20,border:`1px solid ${search?NEON:c.border}`,background:c.inputBg,color:c.text,fontSize:13,outline:"none",transition:"border .2s"}}/>

          {/* Filtri rapidi */}
          {[
            {id:"all",    label:"Tutti"},
            {id:"active", label:"Attivi"},
            {id:"today",  label:"Oggi"},
            {id:"overdue",label:"Scaduti"},
            {id:"high",   label:"🔴 Alta"},
            {id:"done",   label:"✓ Fatti"},
          ].map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)} style={btn(filter===f.id, true)}>{f.label}</button>
          ))}

          {/* Sort */}
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
            style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${c.border}`,background:c.inputBg,color:c.text,fontSize:12,outline:"none",cursor:"pointer"}}>
            <option value="created">Recenti</option>
            <option value="priority">Priorità</option>
            <option value="due">Scadenza</option>
            <option value="alpha">A-Z</option>
          </select>

          {/* Vista */}
          <div style={{display:"flex",border:`1px solid ${c.border}`,borderRadius:8,overflow:"hidden"}}>
            {[{id:"list",icon:"☰"},{id:"kanban",icon:"⊞"}].map(v=>(
              <button key={v.id} onClick={()=>setView(v.id)}
                style={{padding:"6px 10px",border:"none",cursor:"pointer",background:view===v.id?c.accentBg:"transparent",color:view===v.id?NEON:c.textMuted,fontSize:15,transition:"all .2s"}}>
                {v.icon}
              </button>
            ))}
          </div>

          {/* Nuovo task */}
          <button onClick={()=>setShowNewTask(!showNewTask)}
            style={{padding:"7px 16px",borderRadius:20,border:`1px solid ${NEON}`,background:NEON,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,whiteSpace:"nowrap",boxShadow:`0 0 12px ${NEON}66`}}>
            + Task
          </button>
        </div>

        {/* Form nuovo task */}
        {showNewTask && (
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${c.border}`,background:c.surface,animation:"fadeIn .2s ease"}}>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}
                onKeyDown={e=>e.key==="Enter"&&addTask()}
                placeholder="Titolo del task..." autoFocus
                style={{flex:1,padding:"9px 14px",borderRadius:10,border:`1.5px solid ${NEON}`,background:c.inputBg,color:c.text,fontSize:14,outline:"none"}}/>
              <button onClick={addTask} style={{padding:"9px 18px",borderRadius:10,border:`1px solid ${NEON}`,background:NEON,color:"#fff",cursor:"pointer",fontSize:14,fontWeight:600}}>Aggiungi</button>
              <button onClick={()=>setShowNewTask(false)} style={{padding:"9px 12px",borderRadius:10,border:`1px solid ${c.border}`,background:"transparent",color:c.textMuted,cursor:"pointer",fontSize:14}}>✕</button>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-start"}}>
              <textarea value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})} placeholder="Descrizione (opzionale)" rows={2}
                style={{flex:2,minWidth:160,padding:"7px 10px",borderRadius:8,border:`1px solid ${c.border}`,background:c.inputBg,color:c.text,fontSize:13,outline:"none",resize:"vertical"}}/>
              <div style={{display:"flex",flexDirection:"column",gap:6,flex:1,minWidth:120}}>
                {/* Priorità */}
                <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}
                  style={{padding:"6px 8px",borderRadius:8,border:`1px solid ${c.border}`,background:c.inputBg,color:c.text,fontSize:12,outline:"none"}}>
                  <option value="alta">🔴 Alta</option>
                  <option value="media">🟠 Media</option>
                  <option value="bassa">🟢 Bassa</option>
                </select>
                {/* Scadenza */}
                <input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}
                  style={{padding:"6px 8px",borderRadius:8,border:`1px solid ${c.border}`,background:c.inputBg,color:c.text,fontSize:12,outline:"none"}}/>
                {/* Progetto */}
                <select value={form.projectId} onChange={e=>setForm({...form,projectId:e.target.value})}
                  style={{padding:"6px 8px",borderRadius:8,border:`1px solid ${c.border}`,background:c.inputBg,color:c.text,fontSize:12,outline:"none"}}>
                  {projects.map(p=><option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                </select>
              </div>
              {/* Tag */}
              <div style={{flex:1,minWidth:120}}>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:4}}>
                  {form.tags.map((tag,i)=>(
                    <span key={i} onClick={()=>setForm({...form,tags:form.tags.filter((_,j)=>j!==i)})}
                      style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:`${tag.color}20`,color:tag.color,cursor:"pointer"}}>#{tag.name} ✕</span>
                  ))}
                </div>
                <div style={{display:"flex",gap:4}}>
                  <input value={newTag} onChange={e=>setNewTag(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&newTag.trim()){setForm({...form,tags:[...form.tags,{name:newTag.trim(),color:TAG_COLORS[form.tags.length%TAG_COLORS.length]}]});setNewTag("");}}}
                    placeholder="+ Tag (Invio)" style={{flex:1,padding:"5px 8px",borderRadius:6,border:`1px solid ${c.border}`,background:c.inputBg,color:c.text,fontSize:11,outline:"none"}}/>
                </div>
              </div>
              {/* Subtask */}
              <div style={{flex:1,minWidth:120}}>
                <div style={{marginBottom:4}}>
                  {form.subtasks.map((s,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                      <div style={{width:12,height:12,borderRadius:3,border:`1px solid ${c.border}`,flexShrink:0}}/>
                      <span style={{fontSize:11,color:c.textMuted,flex:1}}>{s.title}</span>
                      <button onClick={()=>setForm({...form,subtasks:form.subtasks.filter((_,j)=>j!==i)})} style={{background:"transparent",border:"none",color:c.textHint,cursor:"pointer",fontSize:12}}>✕</button>
                    </div>
                  ))}
                </div>
                <input value={newSubtask} onChange={e=>setNewSubtask(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&newSubtask.trim()){setForm({...form,subtasks:[...form.subtasks,{title:newSubtask.trim(),done:false}]});setNewSubtask("");}}}
                  placeholder="+ Sotto-task (Invio)" style={{width:"100%",padding:"5px 8px",borderRadius:6,border:`1px solid ${c.border}`,background:c.inputBg,color:c.text,fontSize:11,outline:"none",boxSizing:"border-box"}}/>
              </div>
            </div>
          </div>
        )}

        {/* Contatore */}
        <div style={{padding:"8px 16px",borderBottom:`1px solid ${c.border}`,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:c.textHint}}>{filtered.length} task</span>
          {overdueCount>0 && <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:"rgba(239,68,68,0.12)",color:"#ef4444"}}>⚠️ {overdueCount} scaduti</span>}
          {completedToday>0 && <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:"rgba(16,185,129,0.12)",color:"#10b981"}}>✓ {completedToday} completati oggi</span>}
          <div style={{flex:1}}/>
          <div style={{fontSize:12,color:c.textHint}}>{completionRate}% completato</div>
          <div style={{width:80,height:4,borderRadius:2,background:c.border}}>
            <div style={{height:"100%",width:`${completionRate}%`,borderRadius:2,background:NEON,transition:"width .3s"}}/>
          </div>
        </div>

        {/* ── VISTA LISTA ── */}
        {view==="list" && (
          <div style={{flex:1,overflow:"auto",padding:"12px 16px"}}>
            {filtered.length===0 && (
              <div style={{textAlign:"center",padding:40,color:c.textHint}}>
                <div style={{fontSize:48,marginBottom:12}}>✅</div>
                <div style={{fontSize:15}}>{tasks.length===0?"Nessun task — inizia aggiungendo qualcosa!":"Nessun task trovato con questi filtri"}</div>
              </div>
            )}
            {filtered.map(task=><div key={task.id} className="todo-card-enter"><TaskCard task={task}/></div>)}
          </div>
        )}

        {/* ── VISTA KANBAN ── */}
        {view==="kanban" && (
          <div style={{flex:1,overflow:"auto",padding:"12px 16px",display:"flex",gap:12}}>
            {KANBAN_COLS.map(col=>{
              const colTasks = filtered.filter(t=>t.status===col.id||(col.id==="todo"&&!t.status));
              return (
                <div key={col.id}
                  onDragOver={e=>{e.preventDefault();setDragOver(col.id);}}
                  onDragLeave={()=>setDragOver(null)}
                  onDrop={e=>{const id=e.dataTransfer.getData("taskId");if(id)setStatus(id,col.id);setDragOver(null);}}
                  style={{flex:1,minWidth:200,background:dragOver===col.id?c.accentBg2:c.surface,border:`1px solid ${dragOver===col.id?NEON:c.border}`,borderRadius:14,padding:12,display:"flex",flexDirection:"column",gap:0,transition:"all .2s",maxHeight:"100%",overflow:"hidden"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexShrink:0}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:col.color,boxShadow:`0 0 6px ${col.color}`}}/>
                    <span style={{fontSize:13,fontWeight:600,color:c.text}}>{col.label}</span>
                    <span style={{fontSize:11,padding:"1px 7px",borderRadius:8,background:`${col.color}20`,color:col.color,marginLeft:"auto"}}>{colTasks.length}</span>
                  </div>
                  <div style={{flex:1,overflow:"auto"}}>
                    {colTasks.map(task=>(
                      <div key={task.id} draggable onDragStart={e=>e.dataTransfer.setData("taskId",task.id)}>
                        <TaskCard task={task} kanban/>
                      </div>
                    ))}
                    {colTasks.length===0&&<div style={{textAlign:"center",padding:20,color:c.textHint,fontSize:12}}>Nessun task</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}