import { useState, useRef, useEffect } from "react";

const key = (email, name) => `${name}_${email}`;
const NEON = "#ff6b9d";

const SLIDE_W = 960;
const SLIDE_H_LAND = 540;
const SLIDE_H_PORT = 720;

const THEMES = [
  { id:"dark",    name:"Scuro",    bg:"#1a1a2e", text:"#ffffff", accent:"#ff6b9d" },
  { id:"light",   name:"Chiaro",   bg:"#ffffff", text:"#111111", accent:"#3b82f6" },
  { id:"blue",    name:"Blu",      bg:"#0f172a", text:"#e2e8f0", accent:"#38bdf8" },
  { id:"green",   name:"Verde",    bg:"#052e16", text:"#dcfce7", accent:"#4ade80" },
  { id:"purple",  name:"Viola",    bg:"#1e1b4b", text:"#ede9fe", accent:"#a78bfa" },
  { id:"red",     name:"Rosso",    bg:"#1c0a0a", text:"#fee2e2", accent:"#f87171" },
  { id:"minimal", name:"Minimale", bg:"#fafafa", text:"#18181b", accent:"#18181b" },
  { id:"ocean",   name:"Ocean",    bg:"#0c1a2e", text:"#bae6fd", accent:"#38bdf8" },
];

const FONTS = ["Segoe UI","Arial","Georgia","Courier New","Impact","Verdana","Trebuchet MS"];
const FONT_SIZES = [10,12,14,16,18,20,24,28,32,36,40,48,56,64,72];

const SHAPES = [
  { id:"rect",     label:"Rettangolo" },
  { id:"circle",   label:"Cerchio"    },
  { id:"triangle", label:"Triangolo"  },
  { id:"star",     label:"Stella"     },
  { id:"arrow",    label:"Freccia"    },
  { id:"line",     label:"Linea"      },
  { id:"diamond",  label:"Rombo"      },
];

function newId() { return `el_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }

function defaultSlide(theme) {
  const t = THEMES.find(th=>th.id===theme)||THEMES[0];
  return {
    id: newId(),
    bg: t.bg,
    elements: [
      { id:newId(), type:"text", x:80, y:180, w:800, h:80,  text:"Titolo della slide",  fontSize:40, fontFamily:"Segoe UI", bold:true,  italic:false, underline:false, color:t.text, align:"center", bgColor:"transparent", borderColor:"transparent" },
      { id:newId(), type:"text", x:160, y:290, w:640, h:50, text:"Sottotitolo o contenuto", fontSize:20, fontFamily:"Segoe UI", bold:false, italic:false, underline:false, color:t.accent, align:"center", bgColor:"transparent", borderColor:"transparent" },
    ],
    orientation:"landscape",
    theme,
  };
}

// ── Rendering forma SVG ──
function ShapeSVG({ shape, w, h, fill, stroke, strokeW }) {
  const sw = strokeW||2;
  if (shape==="rect")     return <rect x={sw} y={sw} width={w-sw*2} height={h-sw*2} fill={fill} stroke={stroke} strokeWidth={sw} rx={4}/>;
  if (shape==="circle")   return <ellipse cx={w/2} cy={h/2} rx={w/2-sw} ry={h/2-sw} fill={fill} stroke={stroke} strokeWidth={sw}/>;
  if (shape==="triangle") return <polygon points={`${w/2},${sw} ${w-sw},${h-sw} ${sw},${h-sw}`} fill={fill} stroke={stroke} strokeWidth={sw}/>;
  if (shape==="diamond")  return <polygon points={`${w/2},${sw} ${w-sw},${h/2} ${w/2},${h-sw} ${sw},${h/2}`} fill={fill} stroke={stroke} strokeWidth={sw}/>;
  if (shape==="star") {
    const cx=w/2,cy=h/2,r1=Math.min(w,h)/2-sw,r2=r1*0.45;
    const pts = Array.from({length:10},(_,i)=>{const a=(i*Math.PI/5)-Math.PI/2;const r=i%2===0?r1:r2;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;}).join(" ");
    return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw}/>;
  }
  if (shape==="arrow")    return <polygon points={`${sw},${h*0.3} ${w*0.65},${h*0.3} ${w*0.65},${sw} ${w-sw},${h/2} ${w*0.65},${h-sw} ${w*0.65},${h*0.7} ${sw},${h*0.7}`} fill={fill} stroke={stroke} strokeWidth={sw}/>;
  if (shape==="line")     return <line x1={sw} y1={h/2} x2={w-sw} y2={h/2} stroke={stroke||fill} strokeWidth={sw*2} strokeLinecap="round"/>;
  return null;
}

// ── Elemento sulla slide ──
function SlideElement({ el, selected, onSelect, onChange, scale, presenting }) {
  const ref = useRef();
  const dragStart = useRef(null);
  const resizeStart = useRef(null);
  const [editing, setEditing] = useState(false);

  const handleMouseDown = (e) => {
    if (presenting||editing) return;
    e.stopPropagation();
    onSelect(el.id);
    dragStart.current = { mx:e.clientX, my:e.clientY, x:el.x, y:el.y };
    const move = (ev) => {
      const dx=(ev.clientX-dragStart.current.mx)/scale;
      const dy=(ev.clientY-dragStart.current.my)/scale;
      onChange({ x:Math.round(dragStart.current.x+dx), y:Math.round(dragStart.current.y+dy) });
    };
    const up = () => { window.removeEventListener("mousemove",move); window.removeEventListener("mouseup",up); };
    window.addEventListener("mousemove",move);
    window.addEventListener("mouseup",up);
  };

  const handleResize = (e,dir) => {
    e.stopPropagation(); e.preventDefault();
    resizeStart.current = { mx:e.clientX, my:e.clientY, x:el.x, y:el.y, w:el.w, h:el.h };
    const move = (ev) => {
      const dx=(ev.clientX-resizeStart.current.mx)/scale;
      const dy=(ev.clientY-resizeStart.current.my)/scale;
      let nx=el.x,ny=el.y,nw=el.w,nh=el.h;
      if(dir.includes("e")) nw=Math.max(40,resizeStart.current.w+dx);
      if(dir.includes("s")) nh=Math.max(20,resizeStart.current.h+dy);
      if(dir.includes("w")) { nx=resizeStart.current.x+dx; nw=Math.max(40,resizeStart.current.w-dx); }
      if(dir.includes("n")) { ny=resizeStart.current.y+dy; nh=Math.max(20,resizeStart.current.h-dy); }
      onChange({ x:Math.round(nx), y:Math.round(ny), w:Math.round(nw), h:Math.round(nh) });
    };
    const up = () => { window.removeEventListener("mousemove",move); window.removeEventListener("mouseup",up); };
    window.addEventListener("mousemove",move);
    window.addEventListener("mouseup",up);
  };

  const handles = ["n","s","e","w","ne","nw","se","sw"];
  const handlePos = (dir) => {
    const map = { n:[50,0],s:[50,100],e:[100,50],w:[0,50],ne:[100,0],nw:[0,0],se:[100,100],sw:[0,100] };
    const [px,py] = map[dir];
    return { left:`${px}%`, top:`${py}%`, transform:"translate(-50%,-50%)" };
  };
  const handleCursor = (dir) => ({ n:"n-resize",s:"s-resize",e:"e-resize",w:"w-resize",ne:"ne-resize",nw:"nw-resize",se:"se-resize",sw:"sw-resize" }[dir]);

  const style = {
    position:"absolute", left:el.x, top:el.y, width:el.w, height:el.h,
    cursor:presenting?"default":"move",
    outline:selected&&!presenting?`2px solid ${NEON}`:"none",
    boxSizing:"border-box",
  };

  return (
    <div ref={ref} style={style} onMouseDown={handleMouseDown} onDoubleClick={()=>{ if(!presenting&&el.type==="text")setEditing(true); }}>

      {/* TESTO */}
      {el.type==="text" && (
        editing ? (
          <textarea autoFocus value={el.text}
            onChange={e=>onChange({text:e.target.value})}
            onBlur={()=>setEditing(false)}
            style={{ width:"100%",height:"100%",resize:"none",border:"none",outline:"none",padding:4,boxSizing:"border-box",background:el.bgColor||"transparent",color:el.color||"#fff",fontSize:el.fontSize||16,fontFamily:el.fontFamily||"Segoe UI",fontWeight:el.bold?"bold":"normal",fontStyle:el.italic?"italic":"normal",textDecoration:el.underline?"underline":"none",textAlign:el.align||"left",lineHeight:1.4 }}/>
        ) : (
          <div style={{ width:"100%",height:"100%",padding:4,boxSizing:"border-box",background:el.bgColor||"transparent",color:el.color||"#fff",fontSize:el.fontSize||16,fontFamily:el.fontFamily||"Segoe UI",fontWeight:el.bold?"bold":"normal",fontStyle:el.italic?"italic":"normal",textDecoration:el.underline?"underline":"none",textAlign:el.align||"left",lineHeight:1.4,overflow:"hidden",borderRadius:el.borderRadius||0,border:el.borderColor&&el.borderColor!=="transparent"?`2px solid ${el.borderColor}`:"none",whiteSpace:"pre-wrap",wordBreak:"break-word" }}>
            {el.text}
          </div>
        )
      )}

      {/* FORMA */}
      {el.type==="shape" && (
        <svg width={el.w} height={el.h} style={{overflow:"visible",display:"block"}}>
          <ShapeSVG shape={el.shape} w={el.w} h={el.h} fill={el.fill||"rgba(255,107,157,0.3)"} stroke={el.stroke||NEON} strokeW={el.strokeW||2}/>
        </svg>
      )}

      {/* IMMAGINE */}
      {el.type==="image" && (
        <img src={el.src} alt="" style={{width:"100%",height:"100%",objectFit:el.fit||"contain",borderRadius:el.borderRadius||0,opacity:el.opacity||1,border:el.borderColor&&el.borderColor!=="transparent"?`3px solid ${el.borderColor}`:"none"}} draggable={false}/>
      )}

      {/* TABELLA */}
      {el.type==="table" && (
        <div style={{width:"100%",height:"100%",overflow:"hidden"}}>
          <table style={{width:"100%",height:"100%",borderCollapse:"collapse",fontSize:el.fontSize||13,fontFamily:el.fontFamily||"Segoe UI",color:el.color||"#fff"}}>
            <tbody>
              {(el.data||[["",""],["",""]]).map((row,ri)=>(
                <tr key={ri}>
                  {row.map((cell,ci)=>(
                    <td key={ci} contentEditable={!presenting} suppressContentEditableWarning
                      onBlur={e=>{
                        const nd=[...(el.data||[])];nd[ri]=[...nd[ri]];nd[ri][ci]=e.target.innerText;onChange({data:nd});
                      }}
                      style={{border:`1px solid ${el.borderColor||"rgba(255,255,255,0.3)"}`,padding:"4px 8px",background:ri===0?(el.headerBg||"rgba(255,107,157,0.3)"):"transparent",fontWeight:ri===0?"bold":"normal",textAlign:"left",minWidth:40,outline:"none"}}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* GRAFICO */}
      {el.type==="chart" && <ChartEl el={el}/>}

      {/* HANDLE DI RIDIMENSIONAMENTO */}
      {selected&&!presenting && handles.map(dir=>(
        <div key={dir} onMouseDown={e=>handleResize(e,dir)}
          style={{ position:"absolute", width:10, height:10, borderRadius:"50%", background:"#fff", border:`2px solid ${NEON}`, boxShadow:`0 0 6px ${NEON}`, cursor:handleCursor(dir), zIndex:10, ...handlePos(dir) }}/>
      ))}
    </div>
  );
}

// ── Grafico ──
function ChartEl({ el }) {
  const data = el.chartData || [{ label:"A",val:40 },{ label:"B",val:70 },{ label:"C",val:55 },{ label:"D",val:85 }];
  const max = Math.max(...data.map(d=>d.val),1);
  const colors = ["#ff6b9d","#38bdf8","#4ade80","#a78bfa","#f97316","#eab308"];

  if (el.chartType==="pie") {
    const total = data.reduce((s,d)=>s+d.val,0);
    const r=80, cx=120, cy=100;
    const slices = [];
    data.reduce((acc, d, i) => {
      const angle=(d.val/total)*Math.PI*2;
      const x1=cx+r*Math.cos(acc),y1=cy+r*Math.sin(acc);
      const newAcc = acc + angle;
      const x2=cx+r*Math.cos(newAcc),y2=cy+r*Math.sin(newAcc);
      const large=angle>Math.PI?1:0;
      slices.push({ pathD:`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`, color:colors[i%colors.length], label:d.label });
      return newAcc;
    }, 0);
    return (
      <svg width={el.w} height={el.h} viewBox="0 0 240 200" style={{width:"100%",height:"100%"}}>
        {slices.map((s,i)=><path key={i} d={s.pathD} fill={s.color} stroke="#000" strokeWidth={1}/>)}
        {data.map((d,i)=><text key={i} x={180} y={20+i*18} fontSize={11} fill={colors[i%colors.length]} fontFamily="Segoe UI">{d.label}: {d.val}</text>)}
      </svg>
    );
  }

  if (el.chartType==="line") {
    const w=el.w,h=el.h,pad=30;
    const pts = data.map((d,i)=>({ x:pad+(i/(data.length-1||1))*(w-pad*2), y:pad+(1-d.val/max)*(h-pad*2) }));
    const pathD = pts.map((p,i)=>`${i===0?"M":"L"}${p.x},${p.y}`).join(" ");
    return (
      <svg width={w} height={h} style={{width:"100%",height:"100%"}}>
        <path d={pathD} fill="none" stroke={NEON} strokeWidth={2.5}/>
        {pts.map((p,i)=><>
          <circle key={i} cx={p.x} cy={p.y} r={4} fill={NEON}/>
          <text key={`l${i}`} x={p.x} y={h-8} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.6)" fontFamily="Segoe UI">{data[i].label}</text>
        </>)}
      </svg>
    );
  }

  // Barre (default)
  const barW = (el.w-40)/(data.length||1);
  return (
    <svg width={el.w} height={el.h} style={{width:"100%",height:"100%"}}>
      {data.map((d,i)=>{
        const bh=((d.val/max)*(el.h-40));
        const x=20+i*barW+barW*0.15, bw=barW*0.7;
        const col=colors[i%colors.length];
        return <g key={i}>
          <rect x={x} y={el.h-20-bh} width={bw} height={bh} fill={col} rx={3}/>
          <text x={x+bw/2} y={el.h-4} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.7)" fontFamily="Segoe UI">{d.label}</text>
          <text x={x+bw/2} y={el.h-24-bh} textAnchor="middle" fontSize={10} fill={col} fontFamily="Segoe UI">{d.val}</text>
        </g>;
      })}
    </svg>
  );
}

// ── Pannello proprietà ──
function PropsPanel({ el, onChange, onDelete, c }) {
  if (!el) return (
    <div style={{padding:16,color:c.textHint,fontSize:13,textAlign:"center"}}>
      <div style={{fontSize:28,marginBottom:8}}>👆</div>
      Seleziona un elemento per modificarlo
    </div>
  );

  const inp = (style={}) => ({ width:"100%",padding:"5px 8px",borderRadius:6,border:`1px solid ${c.border}`,background:c.inputBg,color:c.text,fontSize:12,outline:"none",boxSizing:"border-box",...style });
  const lbl = (text) => <div style={{fontSize:10,color:c.textHint,letterSpacing:1,marginBottom:3,marginTop:8}}>{text}</div>;
  const row = (children) => <div style={{display:"flex",gap:6,alignItems:"center"}}>{children}</div>;

  return (
    <div style={{padding:"10px 12px",overflow:"auto",flex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:12,fontWeight:600,color:c.text,textTransform:"capitalize"}}>{el.type}</div>
        <button onClick={onDelete} style={{background:"rgba(239,68,68,0.1)",border:"1px solid #ef4444",borderRadius:6,color:"#ef4444",cursor:"pointer",fontSize:11,padding:"3px 8px"}}>Elimina</button>
      </div>

      {/* Posizione e dimensione */}
      {lbl("POSIZIONE & DIMENSIONE")}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
        {[["X",el.x,"x"],["Y",el.y,"y"],["L",el.w,"w"],["H",el.h,"h"]].map(([l,v,k])=>(
          <div key={k} style={{display:"flex",gap:4,alignItems:"center"}}>
            <span style={{fontSize:10,color:c.textHint,minWidth:10}}>{l}</span>
            <input type="number" value={Math.round(v||0)} onChange={e=>onChange({[k]:Number(e.target.value)})} style={inp({textAlign:"center"})}/>
          </div>
        ))}
      </div>

      {/* TESTO */}
      {el.type==="text" && <>
        {lbl("TESTO")}
        <textarea value={el.text||""} onChange={e=>onChange({text:e.target.value})} rows={3}
          style={{...inp(),resize:"vertical",marginBottom:4}}/>
        {lbl("FONT")}
        <select value={el.fontFamily||"Segoe UI"} onChange={e=>onChange({fontFamily:e.target.value})} style={inp()}>
          {FONTS.map(f=><option key={f} value={f}>{f}</option>)}
        </select>
        {lbl("DIMENSIONE")}
        <select value={el.fontSize||16} onChange={e=>onChange({fontSize:Number(e.target.value)})} style={inp()}>
          {FONT_SIZES.map(s=><option key={s} value={s}>{s}px</option>)}
        </select>
        {lbl("STILE")}
        {row(<>
          {[["G","bold"],["C","italic"],["S","underline"]].map(([l,k])=>(
            <button key={k} onClick={()=>onChange({[k]:!el[k]})}
              style={{flex:1,padding:"4px",borderRadius:6,border:`1px solid ${el[k]?c.accent:c.border}`,background:el[k]?c.accentBg:"transparent",color:el[k]?c.accent:c.textMuted,cursor:"pointer",fontSize:12,fontWeight:k==="bold"?"bold":"normal",fontStyle:k==="italic"?"italic":"normal",textDecoration:k==="underline"?"underline":"none"}}>
              {l}
            </button>
          ))}
        </>)}
        {lbl("ALLINEAMENTO")}
        {row(<>
          {[["⬅","left"],["≡","center"],["➡","right"]].map(([ic,v])=>(
            <button key={v} onClick={()=>onChange({align:v})}
              style={{flex:1,padding:"4px",borderRadius:6,border:`1px solid ${el.align===v?c.accent:c.border}`,background:el.align===v?c.accentBg:"transparent",color:el.align===v?c.accent:c.textMuted,cursor:"pointer",fontSize:14}}>
              {ic}
            </button>
          ))}
        </>)}
        {lbl("COLORE TESTO")}
        <input type="color" value={el.color||"#ffffff"} onChange={e=>onChange({color:e.target.value})} style={{width:"100%",height:30,border:"none",borderRadius:6,cursor:"pointer",padding:2}}/>
        {lbl("SFONDO CASELLA")}
        <input type="color" value={el.bgColor==="transparent"?"#000000":el.bgColor||"#000000"} onChange={e=>onChange({bgColor:e.target.value})} style={{width:"100%",height:30,border:"none",borderRadius:6,cursor:"pointer",padding:2}}/>
        <button onClick={()=>onChange({bgColor:"transparent"})} style={{width:"100%",marginTop:3,padding:"3px",borderRadius:5,border:`1px solid ${c.border}`,background:"transparent",color:c.textMuted,cursor:"pointer",fontSize:10}}>Sfondo trasparente</button>
        {lbl("BORDO")}
        <input type="color" value={el.borderColor==="transparent"?"#ffffff":el.borderColor||"#ffffff"} onChange={e=>onChange({borderColor:e.target.value})} style={{width:"100%",height:30,border:"none",borderRadius:6,cursor:"pointer",padding:2}}/>
        <button onClick={()=>onChange({borderColor:"transparent"})} style={{width:"100%",marginTop:3,padding:"3px",borderRadius:5,border:`1px solid ${c.border}`,background:"transparent",color:c.textMuted,cursor:"pointer",fontSize:10}}>Nessun bordo</button>
        {lbl("ARROTONDAMENTO")}
        <input type="range" min={0} max={40} value={el.borderRadius||0} onChange={e=>onChange({borderRadius:Number(e.target.value)})} style={{width:"100%",accentColor:c.accent}}/>
      </>}

      {/* FORMA */}
      {el.type==="shape" && <>
        {lbl("RIEMPIMENTO")}
        <input type="color" value={el.fill||"#ff6b9d"} onChange={e=>onChange({fill:e.target.value})} style={{width:"100%",height:30,border:"none",borderRadius:6,cursor:"pointer",padding:2}}/>
        {lbl("BORDO")}
        <input type="color" value={el.stroke||NEON} onChange={e=>onChange({stroke:e.target.value})} style={{width:"100%",height:30,border:"none",borderRadius:6,cursor:"pointer",padding:2}}/>
        {lbl("SPESSORE BORDO")}
        <input type="range" min={0} max={10} value={el.strokeW||2} onChange={e=>onChange({strokeW:Number(e.target.value)})} style={{width:"100%",accentColor:c.accent}}/>
        <div style={{fontSize:10,color:c.textHint,textAlign:"right"}}>{el.strokeW||2}px</div>
      </>}

      {/* IMMAGINE */}
      {el.type==="image" && <>
        {lbl("ADATTAMENTO")}
        <select value={el.fit||"contain"} onChange={e=>onChange({fit:e.target.value})} style={inp()}>
          <option value="contain">Adatta</option>
          <option value="cover">Riempi</option>
          <option value="fill">Stira</option>
          <option value="none">Originale</option>
        </select>
        {lbl("OPACITÀ")}
        <input type="range" min={0.1} max={1} step={0.05} value={el.opacity||1} onChange={e=>onChange({opacity:Number(e.target.value)})} style={{width:"100%",accentColor:c.accent}}/>
        <div style={{fontSize:10,color:c.textHint,textAlign:"right"}}>{Math.round((el.opacity||1)*100)}%</div>
        {lbl("BORDO")}
        <input type="color" value={el.borderColor==="transparent"?"#ffffff":el.borderColor||"#ffffff"} onChange={e=>onChange({borderColor:e.target.value})} style={{width:"100%",height:30,border:"none",borderRadius:6,cursor:"pointer",padding:2}}/>
        <button onClick={()=>onChange({borderColor:"transparent"})} style={{width:"100%",marginTop:3,padding:"3px",borderRadius:5,border:`1px solid ${c.border}`,background:"transparent",color:c.textMuted,cursor:"pointer",fontSize:10}}>Nessun bordo</button>
        {lbl("ARROTONDAMENTO")}
        <input type="range" min={0} max={50} value={el.borderRadius||0} onChange={e=>onChange({borderRadius:Number(e.target.value)})} style={{width:"100%",accentColor:c.accent}}/>
      </>}

      {/* TABELLA */}
      {el.type==="table" && <>
        {lbl("RIGHE")}
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>onChange({data:[...(el.data||[]),Array(el.data?.[0]?.length||2).fill("")]})} style={{flex:1,padding:"4px",borderRadius:6,border:`1px solid ${c.border}`,background:"transparent",color:c.textMuted,cursor:"pointer",fontSize:11}}>+ Riga</button>
          <button onClick={()=>{if((el.data?.length||0)>1)onChange({data:el.data.slice(0,-1)});}} style={{flex:1,padding:"4px",borderRadius:6,border:`1px solid ${c.border}`,background:"transparent",color:c.textMuted,cursor:"pointer",fontSize:11}}>- Riga</button>
        </div>
        {lbl("COLONNE")}
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>onChange({data:(el.data||[]).map(r=>[...r,""])})} style={{flex:1,padding:"4px",borderRadius:6,border:`1px solid ${c.border}`,background:"transparent",color:c.textMuted,cursor:"pointer",fontSize:11}}>+ Col</button>
          <button onClick={()=>{if((el.data?.[0]?.length||0)>1)onChange({data:(el.data||[]).map(r=>r.slice(0,-1))});}} style={{flex:1,padding:"4px",borderRadius:6,border:`1px solid ${c.border}`,background:"transparent",color:c.textMuted,cursor:"pointer",fontSize:11}}>- Col</button>
        </div>
        {lbl("COLORE TESTO")}
        <input type="color" value={el.color||"#ffffff"} onChange={e=>onChange({color:e.target.value})} style={{width:"100%",height:30,border:"none",borderRadius:6,cursor:"pointer",padding:2}}/>
        {lbl("INTESTAZIONE")}
        <input type="color" value={el.headerBg||"rgba(255,107,157,0.3)"} onChange={e=>onChange({headerBg:e.target.value})} style={{width:"100%",height:30,border:"none",borderRadius:6,cursor:"pointer",padding:2}}/>
      </>}

      {/* GRAFICO */}
      {el.type==="chart" && <>
        {lbl("TIPO GRAFICO")}
        <select value={el.chartType||"bar"} onChange={e=>onChange({chartType:e.target.value})} style={inp()}>
          <option value="bar">Barre</option>
          <option value="line">Linee</option>
          <option value="pie">Torta</option>
        </select>
        {lbl("DATI (label:valore)")}
        {(el.chartData||[]).map((d,i)=>(
          <div key={i} style={{display:"flex",gap:4,marginBottom:3}}>
            <input value={d.label} onChange={e=>{const nd=[...(el.chartData||[])];nd[i]={...nd[i],label:e.target.value};onChange({chartData:nd});}} style={inp({flex:1})} placeholder="Label"/>
            <input type="number" value={d.val} onChange={e=>{const nd=[...(el.chartData||[])];nd[i]={...nd[i],val:Number(e.target.value)};onChange({chartData:nd});}} style={inp({width:60})} placeholder="Val"/>
            <button onClick={()=>{const nd=(el.chartData||[]).filter((_,j)=>j!==i);onChange({chartData:nd});}} style={{background:"transparent",border:"none",color:"#ef4444",cursor:"pointer",fontSize:13}}>✕</button>
          </div>
        ))}
        <button onClick={()=>onChange({chartData:[...(el.chartData||[]),{label:`D${(el.chartData||[]).length+1}`,val:50}]})}
          style={{width:"100%",padding:"4px",borderRadius:6,border:`1px dashed ${c.border}`,background:"transparent",color:c.textMuted,cursor:"pointer",fontSize:11,marginTop:3}}>+ Dato</button>
      </>}
    </div>
  );
}

// ── MAIN COMPONENT ──
export default function SlideApp({ email, c }) {
  const k = key(email, "slides_v2");
  const [slides, setSlides] = useState(() => {
    try { return JSON.parse(localStorage.getItem(k)||"null") || [defaultSlide("dark")]; }
    catch { return [defaultSlide("dark")]; }
  });
  const [curSlide, setCurSlide] = useState(0);
  const [selEl, setSelEl] = useState(null);
  const [presenting, setPresenting] = useState(false);
  const [presSlide, setPresSlide] = useState(0);
  const [zoom, setZoom] = useState(0.7);
  const [showGrid, setShowGrid] = useState(false);
  const [selTheme, setSelTheme] = useState("dark");
  const fileRef = useRef();
  const canvasRef = useRef();

  const save = (s) => { setSlides(s); localStorage.setItem(k, JSON.stringify(s)); };
  const sl = slides[curSlide];
  const slideH = sl?.orientation==="portrait" ? SLIDE_H_PORT : SLIDE_H_LAND;

  // Aggiunge elemento
  const addEl = (type, extra={}) => {
    const base = { id:newId(), type, x:100, y:100, w:300, h:120 };
    let el;
    if (type==="text")  el = { ...base, text:"Testo", fontSize:20, fontFamily:"Segoe UI", bold:false, italic:false, underline:false, color:sl.elements?.[0]?.color||"#fff", align:"left", bgColor:"transparent", borderColor:"transparent", borderRadius:0, ...extra };
    if (type==="shape") el = { ...base, w:200, h:150, shape:extra.shape||"rect", fill:"rgba(255,107,157,0.25)", stroke:NEON, strokeW:2, ...extra };
    if (type==="image") el = { ...base, w:300, h:200, src:extra.src, fit:"contain", opacity:1, borderRadius:0, borderColor:"transparent" };
    if (type==="table") el = { ...base, w:400, h:180, data:[["Intestazione 1","Intestazione 2","Intestazione 3"],["Dato 1","Dato 2","Dato 3"],["Dato 4","Dato 5","Dato 6"]], fontSize:13, color:"#fff", headerBg:"rgba(255,107,157,0.4)", borderColor:"rgba(255,255,255,0.3)" };
    if (type==="chart") el = { ...base, w:380, h:220, chartType:"bar", chartData:[{label:"Gen",val:40},{label:"Feb",val:65},{label:"Mar",val:55},{label:"Apr",val:80}] };
    const ns = slides.map((s,i)=>i===curSlide?{...s,elements:[...s.elements,el]}:s);
    save(ns); setSelEl(el.id);
  };

  const updateEl = (id, changes) => {
    const ns = slides.map((s,i)=>i===curSlide?{...s,elements:s.elements.map(e=>e.id===id?{...e,...changes}:e)}:s);
    save(ns);
  };

  const deleteEl = (id) => {
    const ns = slides.map((s,i)=>i===curSlide?{...s,elements:s.elements.filter(e=>e.id!==id)}:s);
    save(ns); setSelEl(null);
  };

  const addSlide = () => {
    const ns = [...slides, defaultSlide(selTheme)];
    save(ns); setCurSlide(ns.length-1); setSelEl(null);
  };

  const dupSlide = () => {
    const ns = [...slides]; ns.splice(curSlide+1,0,{...JSON.parse(JSON.stringify(sl)),id:newId()});
    save(ns); setCurSlide(curSlide+1); setSelEl(null);
  };

  const delSlide = () => {
    if (slides.length===1) return;
    const ns = slides.filter((_,i)=>i!==curSlide);
    save(ns); setCurSlide(Math.min(curSlide,ns.length-1)); setSelEl(null);
  };

  const moveSlide = (dir) => {
    const ni = curSlide+dir;
    if (ni<0||ni>=slides.length) return;
    const ns=[...slides]; [ns[curSlide],ns[ni]]=[ns[ni],ns[curSlide]];
    save(ns); setCurSlide(ni);
  };

  const changeSlideBg = (color) => {
    const ns = slides.map((s,i)=>i===curSlide?{...s,bg:color}:s);
    save(ns);
  };

  const applyTheme = (themeId) => {
    const t = THEMES.find(th=>th.id===themeId);
    if (!t) return;
    setSelTheme(themeId);
    const ns = slides.map((s,i)=>i===curSlide?{...s,bg:t.bg}:s);
    save(ns);
  };

  const toggleOrientation = () => {
    const ns = slides.map((s,i)=>i===curSlide?{...s,orientation:s.orientation==="portrait"?"landscape":"portrait"}:s);
    save(ns);
  };

  // Import immagine
  const importImg = (e) => {
    const f = e.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ev => addEl("image",{src:ev.target.result});
    reader.readAsDataURL(f);
    e.target.value="";
  };

  // Esporta PNG usando html2canvas da CDN
  const exportPng = async () => {
    try {
      // Carica html2canvas se non già presente
      if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      const el = canvasRef.current;
      if (!el) return;
      // scale: 2 per esportazione ad alta risoluzione
      const canvas = await window.html2canvas(el, {
        scale: 2,
        backgroundColor: sl.bg,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      const a = document.createElement("a");
      a.download = `slide_${curSlide + 1}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } catch {
      // Fallback: canvas vuoto con sfondo slide
      try {
        const el = canvasRef.current;
        if (!el) return;
        const canvas = document.createElement("canvas");
        canvas.width = SLIDE_W * 2;
        canvas.height = slideH * 2;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = sl.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const a = document.createElement("a");
        a.download = `slide_${curSlide + 1}.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
      } catch (ex) {
        alert("Errore durante l'esportazione: " + ex.message);
      }
    }
  };

  // Tastiera
  useEffect(()=>{
    const handler = (e) => {
      if (presenting) {
        if (e.key==="ArrowRight"||e.key==="ArrowDown") setPresSlide(p=>Math.min(slides.length-1,p+1));
        if (e.key==="ArrowLeft"||e.key==="ArrowUp")   setPresSlide(p=>Math.max(0,p-1));
        if (e.key==="Escape") setPresenting(false);
        return;
      }
      if ((e.key==="Delete"||e.key==="Backspace") && selEl && document.activeElement.tagName!=="INPUT" && document.activeElement.tagName!=="TEXTAREA") {
        deleteEl(selEl);
      }
    };
    window.addEventListener("keydown",handler);
    return ()=>window.removeEventListener("keydown",handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[presenting,selEl,slides,curSlide]);

  const tbtn = (active,onClick,children,title,small) => (
    <button onClick={onClick} title={title}
      style={{ padding:small?"4px 8px":"6px 10px", borderRadius:7, border:`1px solid ${active?c.accent:c.border}`, background:active?c.accentBg:"transparent", color:active?c.accent:c.textMuted, cursor:"pointer", fontSize:small?11:12, transition:"all .2s", whiteSpace:"nowrap" }}>
      {children}
    </button>
  );

  // Handler estratto per evitare accesso a ref durante render
  const handleImageClick = () => { if (fileRef.current) fileRef.current.click(); };

  // ── MODALITÀ PRESENTAZIONE ──
  if (presenting) {
    const ps = slides[presSlide];
    const pH = ps?.orientation==="portrait" ? SLIDE_H_PORT : SLIDE_H_LAND;
    const sc = Math.min(window.innerWidth/SLIDE_W, window.innerHeight/pH)*0.92;
    return (
      <div style={{position:"fixed",inset:0,background:"#000",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}} onClick={()=>setPresSlide(p=>Math.min(slides.length-1,p+1))}>
        <div style={{position:"relative",width:SLIDE_W*sc,height:pH*sc,background:ps?.bg,overflow:"hidden",borderRadius:4,boxShadow:"0 8px 60px rgba(0,0,0,0.8)"}}>
          {ps?.elements.map(el=>(
            <div key={el.id} style={{position:"absolute",left:el.x*sc,top:el.y*sc,width:el.w*sc,height:el.h*sc,fontSize:(el.fontSize||16)*sc,pointerEvents:"none"}}>
              {el.type==="text"&&<div style={{width:"100%",height:"100%",padding:4*sc,boxSizing:"border-box",color:el.color,fontWeight:el.bold?"bold":"normal",fontStyle:el.italic?"italic":"normal",textDecoration:el.underline?"underline":"none",textAlign:el.align||"left",fontFamily:el.fontFamily||"Segoe UI",background:el.bgColor||"transparent",lineHeight:1.4,whiteSpace:"pre-wrap",wordBreak:"break-word",borderRadius:(el.borderRadius||0)*sc}}>{el.text}</div>}
              {el.type==="shape"&&<svg width={el.w*sc} height={el.h*sc} style={{width:"100%",height:"100%"}}><ShapeSVG shape={el.shape} w={el.w*sc} h={el.h*sc} fill={el.fill} stroke={el.stroke} strokeW={el.strokeW}/></svg>}
              {el.type==="image"&&<img src={el.src} alt="" style={{width:"100%",height:"100%",objectFit:el.fit||"contain",opacity:el.opacity||1,borderRadius:(el.borderRadius||0)*sc}} draggable={false}/>}
              {el.type==="table"&&<div style={{transform:`scale(${sc})`,transformOrigin:"top left",width:el.w,height:el.h}}><ChartEl el={{...el,type:"table"}} /></div>}
              {el.type==="chart"&&<ChartEl el={el}/>}
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <button onClick={e=>{e.stopPropagation();setPresSlide(p=>Math.max(0,p-1));}} style={{padding:"8px 18px",borderRadius:8,border:"1px solid rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.1)",color:"#fff",cursor:"pointer",fontSize:14}}>‹</button>
          <span style={{color:"rgba(255,255,255,0.5)",fontSize:13}}>{presSlide+1} / {slides.length}</span>
          <button onClick={e=>{e.stopPropagation();setPresSlide(p=>Math.min(slides.length-1,p+1));}} style={{padding:"8px 18px",borderRadius:8,border:"1px solid rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.1)",color:"#fff",cursor:"pointer",fontSize:14}}>›</button>
          <button onClick={e=>{e.stopPropagation();setPresenting(false);}} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${NEON}`,background:`rgba(255,107,157,0.15)`,color:NEON,cursor:"pointer",fontSize:13,fontWeight:600}}>✕ Esci</button>
        </div>
        <div style={{color:"rgba(255,255,255,0.25)",fontSize:11}}>← → per navigare · ESC per uscire · Click per avanzare</div>
      </div>
    );
  }

  const selElData = sl?.elements.find(e=>e.id===selEl);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={importImg}/>

      {/* ── TOOLBAR ── */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center",padding:"8px 10px",borderBottom:`1px solid ${c.border}`,background:c.surface,flexShrink:0}}>
        {/* Inserisci */}
        <span style={{fontSize:10,color:c.textHint,marginRight:2}}>INSERISCI</span>
        {tbtn(false,()=>addEl("text"),"T Testo")}
        <div style={{position:"relative",display:"inline-block"}}>
          <select onChange={e=>{if(e.target.value)addEl("shape",{shape:e.target.value});e.target.value="";}}
            style={{padding:"6px 8px",borderRadius:7,border:`1px solid ${c.border}`,background:c.inputBg,color:c.textMuted,cursor:"pointer",fontSize:12,outline:"none"}}>
            <option value="">⬟ Forma</option>
            {SHAPES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <button onClick={handleImageClick} style={{ padding:"6px 10px", borderRadius:7, border:`1px solid ${c.border}`, background:"transparent", color:c.textMuted, cursor:"pointer", fontSize:12, transition:"all .2s", whiteSpace:"nowrap" }}>🖼 Immagine</button>
        {tbtn(false,()=>addEl("table"),"⊞ Tabella")}
        {tbtn(false,()=>addEl("chart"),"📊 Grafico")}

        <div style={{width:1,height:20,background:c.border,margin:"0 4px"}}/>

        {/* Sfondo */}
        <span style={{fontSize:10,color:c.textHint}}>SFONDO</span>
        <input type="color" value={sl?.bg||"#1a1a2e"} onChange={e=>changeSlideBg(e.target.value)}
          style={{width:30,height:28,border:"none",borderRadius:6,cursor:"pointer",padding:2}}/>
        <select value={selTheme} onChange={e=>applyTheme(e.target.value)}
          style={{padding:"5px 8px",borderRadius:7,border:`1px solid ${c.border}`,background:c.inputBg,color:c.text,fontSize:12,outline:"none",cursor:"pointer"}}>
          {THEMES.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <div style={{width:1,height:20,background:c.border,margin:"0 4px"}}/>

        {/* Slide */}
        {tbtn(false,addSlide,"+ Slide")}
        {tbtn(false,dupSlide,"⧉ Duplica")}
        {tbtn(false,delSlide,"🗑 Elimina",undefined,true)}
        {tbtn(false,()=>moveSlide(-1),"↑",undefined,true)}
        {tbtn(false,()=>moveSlide(1),"↓",undefined,true)}

        <div style={{width:1,height:20,background:c.border,margin:"0 4px"}}/>

        {/* Orientamento e zoom */}
        {tbtn(false,toggleOrientation,sl?.orientation==="portrait"?"⬜ Verticale":"⬛ Orizzontale")}
        {tbtn(showGrid,()=>setShowGrid(!showGrid),"⊞ Griglia")}

        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <button onClick={()=>setZoom(z=>Math.max(0.3,z-0.1))} style={{padding:"4px 7px",borderRadius:6,border:`1px solid ${c.border}`,background:"transparent",color:c.textMuted,cursor:"pointer",fontSize:13}}>−</button>
          <span style={{fontSize:11,color:c.textHint,minWidth:36,textAlign:"center"}}>{Math.round(zoom*100)}%</span>
          <button onClick={()=>setZoom(z=>Math.min(1.5,z+0.1))} style={{padding:"4px 7px",borderRadius:6,border:`1px solid ${c.border}`,background:"transparent",color:c.textMuted,cursor:"pointer",fontSize:13}}>+</button>
          <button onClick={()=>setZoom(0.7)} style={{padding:"4px 6px",borderRadius:6,border:`1px solid ${c.border}`,background:"transparent",color:c.textHint,cursor:"pointer",fontSize:10}}>Fit</button>
        </div>

        <div style={{marginLeft:"auto",display:"flex",gap:4}}>
          <button onClick={exportPng} style={{ padding:"6px 10px", borderRadius:7, border:`1px solid ${c.border}`, background:"transparent", color:c.textMuted, cursor:"pointer", fontSize:12, transition:"all .2s", whiteSpace:"nowrap" }}>⬇ PNG</button>
          <button onClick={()=>{setPresenting(true);setPresSlide(curSlide);}}
            style={{padding:"6px 16px",borderRadius:7,border:`1px solid ${NEON}`,background:NEON,color:"#fff",cursor:"pointer",fontSize:12,fontWeight:600,boxShadow:`0 0 10px ${NEON}66`}}>
            ▶ Presenta
          </button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* ── SIDEBAR SLIDE ── */}
        <div style={{width:120,flexShrink:0,borderRight:`1px solid ${c.border}`,overflow:"auto",background:c.surface,padding:"8px 6px",display:"flex",flexDirection:"column",gap:6}}>
          {slides.map((s,i)=>{
            const sh = s.orientation==="portrait"?SLIDE_H_PORT:SLIDE_H_LAND;
            const sc2 = 108/SLIDE_W;
            return (
              <div key={s.id} onClick={()=>{setCurSlide(i);setSelEl(null);}}
                style={{position:"relative",width:108,height:sh*sc2,background:s.bg,border:`2px solid ${curSlide===i?NEON:c.border}`,borderRadius:6,cursor:"pointer",overflow:"hidden",flexShrink:0,boxShadow:curSlide===i?`0 0 8px ${NEON}66`:"none",transition:"all .2s"}}>
                {s.elements.slice(0,3).map(el=>(
                  <div key={el.id} style={{position:"absolute",left:el.x*sc2,top:el.y*sc2,width:el.w*sc2,height:el.h*sc2,fontSize:(el.fontSize||16)*sc2,color:el.color,fontWeight:el.bold?"bold":"normal",overflow:"hidden",whiteSpace:"nowrap",pointerEvents:"none"}}>
                    {el.type==="text"&&<div style={{fontSize:(el.fontSize||16)*sc2,lineHeight:1.2}}>{el.text}</div>}
                    {el.type==="shape"&&<svg width={el.w*sc2} height={el.h*sc2}><ShapeSVG shape={el.shape} w={el.w*sc2} h={el.h*sc2} fill={el.fill} stroke={el.stroke} strokeW={1}/></svg>}
                    {el.type==="image"&&<img src={el.src} alt="" style={{width:"100%",height:"100%",objectFit:"contain"}} draggable={false}/>}
                  </div>
                ))}
                <div style={{position:"absolute",bottom:2,right:4,fontSize:9,color:"rgba(255,255,255,0.4)",background:"rgba(0,0,0,0.4)",borderRadius:3,padding:"1px 4px"}}>{i+1}</div>
              </div>
            );
          })}
        </div>

        {/* ── CANVAS AREA ── */}
        <div style={{flex:1,overflow:"auto",background:c.bg==="f5f5f7"?"#e8e8ec":"#1a1a22",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
          onClick={()=>setSelEl(null)}>
          <div ref={canvasRef}
            style={{position:"relative",width:SLIDE_W*zoom,height:slideH*zoom,background:sl?.bg,overflow:"hidden",boxShadow:"0 4px 40px rgba(0,0,0,0.5)",flexShrink:0,cursor:"default"}}
            onClick={e=>e.stopPropagation()}>
            {/* Griglia */}
            {showGrid && (
              <svg style={{position:"absolute",inset:0,pointerEvents:"none",opacity:.2}} width="100%" height="100%">
                <defs><pattern id="grid" width={40*zoom} height={40*zoom} patternUnits="userSpaceOnUse"><path d={`M ${40*zoom} 0 L 0 0 0 ${40*zoom}`} fill="none" stroke="#fff" strokeWidth="0.5"/></pattern></defs>
                <rect width="100%" height="100%" fill="url(#grid)"/>
              </svg>
            )}
            {sl?.elements.map(el=>(
              <SlideElement key={el.id} el={{...el,x:el.x*zoom,y:el.y*zoom,w:el.w*zoom,h:el.h*zoom,fontSize:(el.fontSize||16)*zoom}}
                selected={selEl===el.id} onSelect={setSelEl}
                onChange={ch=>{
                  const scaled={};
                  if(ch.x!==undefined) scaled.x=Math.round(ch.x/zoom);
                  if(ch.y!==undefined) scaled.y=Math.round(ch.y/zoom);
                  if(ch.w!==undefined) scaled.w=Math.round(ch.w/zoom);
                  if(ch.h!==undefined) scaled.h=Math.round(ch.h/zoom);
                  updateEl(el.id,{...ch,...scaled});
                }}
                onDelete={()=>deleteEl(el.id)}
                scale={zoom} presenting={false}
              />
            ))}
          </div>
        </div>

        {/* ── PANNELLO PROPRIETÀ ── */}
        <div style={{width:200,flexShrink:0,borderLeft:`1px solid ${c.border}`,background:c.surface,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"10px 12px",borderBottom:`1px solid ${c.border}`,fontSize:11,color:c.textHint,letterSpacing:1,flexShrink:0}}>PROPRIETÀ</div>
          <PropsPanel el={selElData} onChange={ch=>updateEl(selEl,ch)} onDelete={()=>deleteEl(selEl)} c={c}/>
          {/* Info slide */}
          <div style={{padding:"10px 12px",borderTop:`1px solid ${c.border}`,flexShrink:0}}>
            <div style={{fontSize:10,color:c.textHint,marginBottom:6}}>SLIDE {curSlide+1} / {slides.length}</div>
            <div style={{fontSize:10,color:c.textHint}}>
              {sl?.orientation==="portrait"?"Verticale (9:16)":"Orizzontale (16:9)"} · {sl?.elements.length} elementi
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}