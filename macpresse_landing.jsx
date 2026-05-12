import { useState, useEffect, useRef, useCallback } from "react";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  white:      "#ffffff",
  offwhite:   "#f3ffef",
  green:      "#a5be00",
  greenLight: "#c8d96a",
  greenPale:  "#e4f0c0",
  greenDeep:  "#7a8f00",
  neutral:    "#6b7a5a",
  neutralLt:  "#9aaa82",
  gray:       "#e4edd8",
  grayDark:   "#c0cfaa",
  text:       "#2d3a1e",
  textMid:    "#4a5c35",
  textSoft:   "#7a8f6a",
  font:       "'Poppins', sans-serif",
};

// ─── SOUND ENGINE ─────────────────────────────────────────────────────────────
function createSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (type === "crack") {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++)
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      const dist = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) curve[i] = ((i / 128) - 1) > 0 ? 1 : -1;
      dist.curve = curve;
      src.buffer = buf;
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      src.connect(dist); dist.connect(gain); gain.connect(ctx.destination);
      src.start();
    } else if (type === "solid") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.22);
    } else if (type === "collapse") {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t / 1.2, 1.5) * (Math.sin(t * 40) * 0.3 + 0.7);
      }
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buf;
      gain.gain.setValueAtTime(0.8, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      src.connect(gain); gain.connect(ctx.destination);
      src.start();
    }
  } catch (e) {}
}

// ─── CRACK PATHS ──────────────────────────────────────────────────────────────
const CRACK_PATHS = [
  "M 50 20 L 45 40 L 55 50 L 40 70",
  "M 80 30 L 75 55 L 85 60 L 70 90",
  "M 30 50 L 50 55 L 40 75 L 60 80",
  "M 60 10 L 55 30 L 70 45 L 50 65 L 65 85",
  "M 20 40 L 35 50 L 25 70 L 45 80",
  "M 90 20 L 80 45 L 95 55 L 75 75",
  "M 40 15 L 30 35 L 50 50 L 35 70 L 55 90",
  "M 70 60 L 60 80 L 80 85 L 65 100",
];

// ─── PARTICLE ─────────────────────────────────────────────────────────────────
function Particle({ x, y, onDone }) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 2 + Math.random() * 5;
  const size  = 3 + Math.random() * 4;
  const [pos, setPos]         = useState({ x, y });
  const [opacity, setOpacity] = useState(1);
  const frameRef = useRef(0);
  const velRef   = useRef({ vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2 });
  const startRef = useRef(Date.now());

  useEffect(() => {
    const go = () => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      velRef.current.vy += 0.28;
      setPos(p => ({ x: p.x + velRef.current.vx, y: p.y + velRef.current.vy }));
      setOpacity(Math.max(0, 1 - elapsed / 1.1));
      elapsed < 1.1 ? (frameRef.current = requestAnimationFrame(go)) : onDone?.();
    };
    frameRef.current = requestAnimationFrame(go);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const colors = ["#b0c088","#8fa060","#d0dcb0","#c4c870","#9ab040"];
  return (
    <div style={{
      position:"fixed", left:pos.x, top:pos.y, width:size, height:size,
      backgroundColor: colors[Math.floor(Math.random()*colors.length)],
      opacity, borderRadius:"2px", pointerEvents:"none", zIndex:9999,
      transform:`rotate(${Math.random()*360}deg)`,
    }} />
  );
}

// ─── CONVENTIONAL BLOCK ───────────────────────────────────────────────────────
function ConventionalBlock({ onDestroyed }) {
  const [clicks, setClicks]             = useState(0);
  const [cracks, setCracks]             = useState([]);
  const [shaking, setShaking]           = useState(false);
  const [particles, setParticles]       = useState([]);
  const [collapsed, setCollapsed]       = useState(false);
  const [collapseAnim, setCollapseAnim] = useState(false);
  const blockRef = useRef(null);
  const MAX = 18;
  const pid = useRef(0);

  const handleClick = useCallback(() => {
    if (collapsed) return;
    const n = clicks + 1;
    setClicks(n);
    createSound("crack");
    setShaking(true);
    setTimeout(() => setShaking(false), 270);
    if (n <= CRACK_PATHS.length) setCracks(prev => [...prev, CRACK_PATHS[n - 1]]);

    if (blockRef.current) {
      const rect  = blockRef.current.getBoundingClientRect();
      const cx    = rect.left + rect.width / 2 + (Math.random() - 0.5) * rect.width * 0.5;
      const cy    = rect.top  + rect.height * 0.3 + Math.random() * rect.height * 0.45;
      const count = 3 + Math.floor(n / 3);
      const ps    = Array.from({ length: count }, () => ({
        id: ++pid.current,
        x: cx + (Math.random() - 0.5) * 36,
        y: cy + (Math.random() - 0.5) * 18,
      }));
      setParticles(prev => [...prev, ...ps]);
    }

    if (n >= MAX) {
      createSound("collapse");
      setCollapseAnim(true);
      setTimeout(() => { setCollapsed(true); onDestroyed?.(); }, 1200);
    }
  }, [clicks, collapsed]);

  const rmP = useCallback((id) => setParticles(prev => prev.filter(p => p.id !== id)), []);

  const progress = Math.min(clicks / MAX, 1);
  const d        = progress;
  const tilt     = shaking
    ? `rotate(${(Math.random()-0.5)*3}deg) translate(${(Math.random()-0.5)*7}px,${(Math.random()-0.5)*3}px)`
    : "none";

  const fL = `hsl(${78 - d*55},${22 - d*14}%,${70 - d*22}%)`;
  const fM = `hsl(${73 - d*50},${18 - d*10}%,${58 - d*18}%)`;
  const fD = `hsl(${68 - d*45},${14 - d*8 }%,${46 - d*14}%)`;
  const tC = `hsl(${80 - d*52},20%,${78 - d*16}%)`;
  const sC = `hsl(${68 - d*42},16%,${52 - d*15}%)`;

  return (
    <>
      {particles.map(p => <Particle key={p.id} x={p.x} y={p.y} onDone={() => rmP(p.id)} />)}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily:T.font, fontWeight:700, fontSize:"1.05rem", letterSpacing:"0.18em", color:T.neutralLt, textTransform:"uppercase" }}>
            Acero Convencional
          </div>
          {!collapsed && (
            <div style={{ fontFamily:T.font, fontSize:"0.56rem", color: d > 0.5 ? "#c07840" : T.neutralLt, marginTop:4, letterSpacing:"0.08em", transition:"color 0.4s" }}>
              {clicks === 0 ? "Haz clic para probar" : `Deterioro: ${Math.round(progress*100)}%`}
            </div>
          )}
        </div>

        <div
          ref={blockRef}
          onClick={handleClick}
          style={{
            cursor: collapsed ? "default" : "pointer",
            transform: collapseAnim
              ? "translateY(55px) scaleY(0.07) scaleX(1.45) rotate(2deg)"
              : shaking ? tilt : "none",
            transition: collapseAnim ? "transform 1.1s cubic-bezier(.4,0,.2,1), opacity 1s" : "transform 0.05s",
            opacity: collapseAnim ? 0.12 : 1,
            filter: `brightness(${1 - d * 0.28}) saturate(${1 - d * 0.38})`,
            position:"relative", userSelect:"none",
          }}
        >
          <svg width="210" height="250" viewBox="0 0 240 280" overflow="visible">
            <defs>
              <linearGradient id="cf" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"   stopColor={fL} />
                <stop offset="55%"  stopColor={fM} />
                <stop offset="100%" stopColor={fD} />
              </linearGradient>
              <linearGradient id="ct" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor={tC} />
                <stop offset="100%" stopColor={`hsl(76,18%,65%)`} />
              </linearGradient>
              <linearGradient id="cs" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor={sC} />
                <stop offset="100%" stopColor={`hsl(66,12%,38%)`} />
              </linearGradient>
              <filter id="cshadow">
                <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor={T.text} floodOpacity="0.1" />
              </filter>
              <clipPath id="cclip"><polygon points="30,50 210,50 210,290 30,290" /></clipPath>
            </defs>

            <ellipse cx="130" cy="272" rx="72" ry="7" fill={T.text} opacity="0.06" />
            <polygon points="30,50 210,50 240,20 60,20"     fill="url(#ct)" />
            <polygon points="210,50 240,20 240,260 210,290" fill="url(#cs)" />
            <polygon points="30,50 210,50 210,290 30,290"   fill="url(#cf)" filter="url(#cshadow)" />

            {[75,105,135,165,195,225,255].map((y,i) => (
              <line key={i} x1="32" y1={y} x2="208" y2={y} stroke={T.text} strokeOpacity={0.04+d*0.04} strokeWidth="0.8" />
            ))}
            {[70,110,150,190].map((x,i) => (
              <line key={i} x1={x} y1="52" x2={x} y2="288" stroke={T.text} strokeOpacity={0.03+d*0.03} strokeWidth="0.8" />
            ))}

            {cracks.map((path, i) => (
              <g key={i} clipPath="url(#cclip)">
                <path d={path} stroke={`hsl(22,${28+i*3}%,${26+i}%)`} strokeWidth={1.4+i*0.15} fill="none" opacity={0.72}
                  transform={`translate(${(i%3)*40},${Math.floor(i/3)*50})`}
                  style={{ strokeDasharray:200, strokeDashoffset:0, animation:"crack-appear 0.28s ease-out forwards" }} />
                <path d={path} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" fill="none"
                  transform={`translate(${(i%3)*40+1},${Math.floor(i/3)*50+1})`} />
              </g>
            ))}

            {d > 0.42 && (
              <polygon points="30,50 210,50 210,290 30,290" fill={`rgba(110,72,30,${(d-0.42)*0.3})`} />
            )}

            <line x1="30" y1="50" x2="210" y2="50" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
            <polygon points="30,50 54,50 54,290 30,290" fill="rgba(255,255,255,0.06)" />
          </svg>

          {!collapsed && clicks > 0 && (
            <div style={{ position:"absolute", bottom:-16, left:"50%", transform:"translateX(-50%)", width:148, height:3, background:T.gray, borderRadius:4 }}>
              <div style={{ width:`${progress*100}%`, height:"100%", background:`hsl(${28-d*18},65%,54%)`, borderRadius:4, transition:"width 0.2s" }} />
            </div>
          )}
        </div>

        {collapsed && (
          <div style={{ textAlign:"center", animation:"fadeUp 0.7s ease-out" }}>
            <div style={{ fontFamily:T.font, fontWeight:700, color:"#c07840", fontSize:"0.82rem", letterSpacing:"0.16em", textTransform:"uppercase" }}>
              Destruido
            </div>
            <div style={{ fontFamily:T.font, color:"#b09878", fontSize:"0.56rem", marginTop:3, letterSpacing:"0.1em" }}>
              Falla estructural total
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── MACPRESSE BLOCK ──────────────────────────────────────────────────────────
function MacpresseBlock({ onMessageReady }) {
  const [clicks, setClicks]   = useState(0);
  const [shaking, setShaking] = useState(false);
  const [ripples, setRipples] = useState([]);
  const [sparks, setSparks]   = useState([]);
  const rId = useRef(0);
  const sId = useRef(0);
  const sent = useRef(false);

  const handleClick = useCallback(() => {
    const n = clicks + 1;
    setClicks(n);
    createSound("solid");
    setShaking(true);
    setTimeout(() => setShaking(false), 130);

    const rid = ++rId.current;
    setRipples(prev => [...prev, { id: rid }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== rid)), 900);

    const newS = Array.from({ length: 5 + Math.floor(n/4) }, () => ({
      id: ++sId.current,
      angle: Math.random() * 360,
      dist:  26 + Math.random() * 52,
    }));
    setSparks(prev => [...prev, ...newS]);
    setTimeout(() => setSparks(prev => prev.filter(s => !newS.find(ns => ns.id === s.id))), 540);

    if (n >= 6 && !sent.current) {
      sent.current = true;
      onMessageReady?.();
    }
  }, [clicks]);

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontFamily:T.font, fontWeight:700, fontSize:"1.05rem", letterSpacing:"0.18em", color:T.green, textTransform:"uppercase" }}>
          Acero Hardox
        </div>
        <div style={{ fontFamily:T.font, fontWeight:400, fontSize:"0.58rem", letterSpacing:"0.14em", color:T.greenDeep, marginTop:3, textTransform:"uppercase", opacity:0.75 }}>
          Macpresse Europa
        </div>
        <div style={{ fontFamily:T.font, fontSize:"0.56rem", color:T.greenDeep, marginTop:5, letterSpacing:"0.08em" }}>
          {clicks === 0 ? "Haz clic para probar" : clicks < 6 ? `${clicks} impacto${clicks>1?"s":""} — sin daño` : "Indestructible ✓"}
        </div>
      </div>

      <div style={{ position:"relative" }}>
        <div
          onClick={handleClick}
          style={{
            cursor:"pointer", userSelect:"none",
            transform: shaking ? `translate(${(Math.random()-0.5)*2}px,${(Math.random()-0.5)*1.4}px)` : "none",
            transition: shaking ? "none" : "transform 0.1s",
            position:"relative",
          }}
        >
          <svg width="210" height="250" viewBox="0 0 240 280" overflow="visible">
            <defs>
              <linearGradient id="mf" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"   stopColor="#edf8d8" />
                <stop offset="40%"  stopColor="#d4ecaa" />
                <stop offset="80%"  stopColor="#bcd878" />
                <stop offset="100%" stopColor="#a8c84e" />
              </linearGradient>
              <linearGradient id="mt" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#f3fce4" />
                <stop offset="100%" stopColor="#ddeea0" />
              </linearGradient>
              <linearGradient id="mside" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#94b028" />
                <stop offset="100%" stopColor="#6e8600" />
              </linearGradient>
              <linearGradient id="mstrip" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={T.green} stopOpacity="0" />
                <stop offset="50%"  stopColor={T.green} stopOpacity="0.3" />
                <stop offset="100%" stopColor={T.green} stopOpacity="0" />
              </linearGradient>
              <radialGradient id="mglow" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor={T.green} stopOpacity="0.09" />
                <stop offset="100%" stopColor={T.green} stopOpacity="0" />
              </radialGradient>
              <filter id="mshadow">
                <feDropShadow dx="0" dy="12" stdDeviation="18" floodColor={T.green} floodOpacity="0.18" />
              </filter>
              <clipPath id="mclip"><polygon points="30,50 210,50 210,290 30,290" /></clipPath>
            </defs>

            <ellipse cx="130" cy="272" rx="72" ry="7" fill={T.green} opacity="0.14" />
            <polygon points="30,50 210,50 240,20 60,20"     fill="url(#mt)" />
            <line   x1="60" y1="20" x2="240" y2="20"       stroke={T.green} strokeOpacity="0.45" strokeWidth="1.5" />
            <polygon points="210,50 240,20 240,260 210,290" fill="url(#mside)" />
            <line   x1="240" y1="20" x2="240" y2="260"     stroke={T.greenDeep} strokeOpacity="0.35" strokeWidth="1" />
            <polygon points="30,50 210,50 210,290 30,290"   fill="url(#mf)" filter="url(#mshadow)" />
            <polygon points="30,50 210,50 210,290 30,290"   fill="url(#mglow)" />

            {[90,130,170,210,250].map((y,i) => (
              <line key={i} x1="32" y1={y} x2="208" y2={y} stroke={T.green} strokeOpacity="0.09" strokeWidth="0.6" />
            ))}
            {[80,120,160,200].map((x,i) => (
              <line key={i} x1={x} y1="52" x2={x} y2="288" stroke={T.green} strokeOpacity="0.07" strokeWidth="0.6" />
            ))}

            {/* shine */}
            <polygon points="30,50 52,50 52,290 30,290" fill="rgba(255,255,255,0.14)" />
            <line x1="30" y1="50" x2="210" y2="50" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />

            {/* brand panel */}
            <rect x="56" y="126" width="128" height="62" rx="4" fill="rgba(255,255,255,0.5)" stroke={T.greenDeep} strokeOpacity="0.25" strokeWidth="0.8" />
            <text x="120" y="149" textAnchor="middle" style={{ fontFamily:"'Poppins',sans-serif", fontWeight:700, fontSize:"10px", fill:T.greenDeep, letterSpacing:"2px" }}>ACERO HARDOX</text>
            <text x="120" y="167" textAnchor="middle" style={{ fontFamily:"'Poppins',sans-serif", fontWeight:400, fontSize:"5.5px", fill:T.green, letterSpacing:"2px", opacity:0.85 }}>MACPRESSE EUROPA</text>

            {/* corner bolts */}
            {[[38,58],[202,58],[38,282],[202,282]].map(([x,y],i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="5.5" fill="rgba(255,255,255,0.6)" stroke={T.green} strokeOpacity="0.35" strokeWidth="1" />
                <circle cx={x} cy={y} r="2.2" fill={T.greenDeep} opacity="0.35" />
              </g>
            ))}

            {/* ripples */}
            {ripples.map(r => (
              <g key={r.id} clipPath="url(#mclip)">
                <circle cx="120" cy="158" r="8" fill="none" stroke={T.green} strokeWidth="2.2" opacity="0.65"
                  style={{ animation:"ripple-out 0.9s ease-out forwards" }} />
                <circle cx="120" cy="158" r="8" fill="none" stroke={T.green} strokeWidth="1" opacity="0.35"
                  style={{ animation:"ripple-out 0.9s ease-out 0.1s forwards" }} />
              </g>
            ))}

            {/* sparks */}
            {sparks.map(s => (
              <line key={s.id}
                x1="120" y1="158"
                x2={120+Math.cos(s.angle*Math.PI/180)*s.dist}
                y2={158+Math.sin(s.angle*Math.PI/180)*s.dist}
                stroke={T.greenLight} strokeWidth="1.2" opacity="0.65"
                style={{ animation:"spark-out 0.5s ease-out forwards" }}
              />
            ))}

            <line x1="30" y1="50" x2="30" y2="290"  stroke="url(#mstrip)" strokeWidth="2.2" />
          </svg>

          {clicks > 0 && (
            <div style={{
              position:"absolute", top:14, right:2,
              background:T.offwhite, border:`1px solid ${T.grayDark}`,
              borderRadius:4, padding:"2px 8px",
              fontFamily:T.font, fontWeight:600,
              fontSize:"0.53rem", color:T.greenDeep, letterSpacing:"0.06em",
            }}>
              {clicks}× impacto
            </div>
          )}
        </div>
      </div>

      {clicks > 0 && (
        <div style={{ display:"flex", gap:5, marginTop:-4, flexWrap:"wrap", justifyContent:"center", maxWidth:200 }}>
          {Array.from({ length: Math.min(clicks,14) }).map((_,i) => (
            <div key={i} style={{ width:5, height:5, borderRadius:"50%", background:T.offwhite, border:`1.5px solid ${T.green}` }} />
          ))}
          {clicks > 14 && <span style={{ fontFamily:T.font, color:T.green, fontSize:"0.5rem" }}>+{clicks-14}</span>}
        </div>
      )}
    </div>
  );
}

// ─── SCROLL SECTION ───────────────────────────────────────────────────────────
function ScrollSection({ icon, title, subtitle, description, stat, statLabel, index }) {
  const ref  = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const accs = [T.green, "#7aaa20", "#5a9838"];
  const acc  = accs[index % 3];
  const even = index % 2 === 0;

  return (
    <div ref={ref} style={{
      minHeight:"60vh", display:"flex", alignItems:"center", justifyContent:"center",
      padding:"48px 40px",
      background: even ? T.white : T.offwhite,
      opacity: vis ? 1 : 0,
      transform: vis ? "none" : "translateY(48px)",
      transition:`opacity 0.85s ease ${index*0.05}s, transform 0.85s cubic-bezier(.2,0,.1,1) ${index*0.05}s`,
      borderTop:`1px solid ${T.gray}`,
    }}>
      <div style={{
        maxWidth:960, width:"100%",
        display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"center",
        direction: even ? "ltr" : "rtl",
      }}>
        {/* stat card */}
        <div style={{
          background: even ? T.offwhite : T.white,
          border:`1px solid ${T.grayDark}`,
          borderRadius:10, padding:"36px 32px",
          textAlign:"center", direction:"ltr",
          boxShadow:`0 2px 32px rgba(165,190,0,0.08)`,
          position:"relative", overflow:"hidden",
        }}>
          <div style={{
            position:"absolute", top:-50, right:-50, width:180, height:180, borderRadius:"50%",
            background:`radial-gradient(circle, ${acc}16 0%, transparent 70%)`,
            pointerEvents:"none",
          }} />
          <div style={{ fontSize:"2.6rem", marginBottom:18 }}>{icon}</div>
          <div style={{ fontFamily:T.font, fontWeight:700, fontSize:"clamp(2.8rem,7vw,4.2rem)", color:acc, lineHeight:1, letterSpacing:"-0.03em" }}>
            {stat}
          </div>
          <div style={{ fontFamily:T.font, fontWeight:400, fontSize:"0.6rem", letterSpacing:"0.18em", color:T.neutral, textTransform:"uppercase", marginTop:10 }}>
            {statLabel}
          </div>
        </div>

        {/* text */}
        <div style={{ direction:"ltr" }}>
          <div style={{ fontFamily:T.font, fontWeight:600, fontSize:"0.58rem", letterSpacing:"0.22em", color:acc, textTransform:"uppercase", marginBottom:14 }}>
            {subtitle}
          </div>
          <h2 style={{ fontFamily:T.font, fontWeight:700, fontSize:"clamp(1.8rem,3.8vw,2.8rem)", color:T.text, lineHeight:1.12, letterSpacing:"-0.02em", marginBottom:22 }}>
            {title}
          </h2>
          <p style={{ fontFamily:T.font, fontWeight:300, fontSize:"0.94rem", lineHeight:1.82, color:T.textSoft, maxWidth:380 }}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [convDestroyed, setConvDestroyed] = useState(false);
  const [showMsg,  setShowMsg]  = useState(false);
  const [showCta,  setShowCta]  = useState(false);
  const scrollRef = useRef(null);

  const handleMsgReady = () => {
    setShowMsg(true);
    setTimeout(() => setShowCta(true), 1100);
  };

  const sections = [
    {
      icon: "🔩",
      title: "Acero Hardox: resistencia que no negocia.",
      subtitle: "Durabilidad extrema",
      description: "En GTA Ambiental representamos equipos con revestimiento antidesgaste de acero Hardox patentado, 400% más duradero que el acero convencional. Las placas de compactación van atornilladas para sustitución rápida, protegiendo la inversión contra la abrasión y la corrosión durante décadas.",
      stat: "400%",
      statLabel: "Más duradero que el acero normal",
    },
    {
      icon: "⚡",
      title: "Potencia hidráulica de precisión.",
      subtitle: "Rendimiento industrial",
      description: "Las prensas Macpresse Europa incorporan sistemas hidráulicos de caudal variable y motores de alta eficiencia, con un ahorro energético del 30% frente a motores tradicionales. Desde centros logísticos hasta grandes plantas de reciclaje, tenemos la solución para cada operación.",
      stat: "30%",
      statLabel: "Ahorro energético vs. motores convencionales",
    },
    {
      icon: "🛠️",
      title: "Servicio que no te deja solo.",
      subtitle: "Soporte y postventa",
      description: "En GTA Ambiental acompañamos a cada cliente desde el diseño del proyecto hasta la puesta en marcha, con servicio postventa dedicado y stock de refacciones disponible. Porque una prensa sin respaldo no es una solución completa.",
      stat: "360°",
      statLabel: "Servicio y mantenimiento dedicado",
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:${T.white}; }

        @keyframes crack-appear {
          from { stroke-dashoffset:200; opacity:0; }
          to   { stroke-dashoffset:0;   opacity:1; }
        }
        @keyframes ripple-out {
          from { r:8;  opacity:0.65; }
          to   { r:82; opacity:0;    }
        }
        @keyframes spark-out {
          from { opacity:0.7; }
          to   { opacity:0;   }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        @keyframes msg-in {
          from { opacity:0; transform:translateY(22px) scale(0.98); }
          to   { opacity:1; transform:none;                          }
        }
        @keyframes arrow-bob {
          0%,100% { transform:translateY(0);   opacity:0.5; }
          50%     { transform:translateY(7px);  opacity:1;   }
        }
        @keyframes leaf-drift {
          0%,100% { transform:translateY(0)    rotate(-4deg); }
          50%     { transform:translateY(-14px) rotate(4deg);  }
        }

        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:${T.offwhite}; }
        ::-webkit-scrollbar-thumb { background:${T.grayDark}; border-radius:4px; }

        .mac-btn {
          font-family:${T.font}; font-weight:600; font-size:0.7rem;
          letter-spacing:0.1em; text-transform:uppercase;
          color:${T.white}; background:${T.green};
          border:none; padding:14px 42px; border-radius:6px;
          cursor:pointer; transition:background 0.22s, transform 0.18s, box-shadow 0.22s;
        }
        .mac-btn:hover {
          background:${T.greenDeep};
          transform:translateY(-2px);
          box-shadow:0 10px 28px rgba(165,190,0,0.28);
        }
      `}</style>

      <div style={{ background:T.white, minHeight:"100vh" }}>

        {/* ─── HERO ─── */}
        <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", position:"relative", overflow:"hidden", background:T.white }}>

          {/* ambient shapes */}
          <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
            <div style={{ position:"absolute", top:-140, left:-100, width:520, height:520, borderRadius:"50%",
              background:`radial-gradient(circle, ${T.green}0d 0%, transparent 62%)` }} />
            <div style={{ position:"absolute", bottom:-90, right:-70, width:440, height:440, borderRadius:"50%",
              background:`radial-gradient(circle, ${T.greenPale}cc 0%, transparent 68%)` }} />
            <div style={{ position:"absolute", top:"35%", left:"42%", width:320, height:320, borderRadius:"50%",
              background:`radial-gradient(circle, ${T.offwhite} 0%, transparent 72%)` }} />
          </div>

          {/* dot grid */}
          <div style={{
            position:"absolute", inset:0, pointerEvents:"none",
            backgroundImage:`radial-gradient(circle, ${T.grayDark} 1px, transparent 1px)`,
            backgroundSize:"36px 36px", opacity:0.35,
          }} />

          {/* floating leaves */}
          <div style={{ position:"absolute", top:72, right:68, fontSize:"2.2rem", opacity:0.11, animation:"leaf-drift 6.5s ease-in-out infinite", pointerEvents:"none" }}>🌿</div>
          <div style={{ position:"absolute", bottom:180, left:50, fontSize:"1.7rem", opacity:0.09, animation:"leaf-drift 8s ease-in-out infinite 2.5s", pointerEvents:"none" }}>🌱</div>
          <div style={{ position:"absolute", top:"50%", right:100, fontSize:"1.4rem", opacity:0.07, animation:"leaf-drift 7s ease-in-out infinite 1s", pointerEvents:"none" }}>🍃</div>

          {/* header */}
          <header style={{
            padding:"16px 48px",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            borderBottom:`1px solid ${T.gray}`,
            position:"relative", zIndex:10,
            background:"rgba(255,255,255,0.92)", backdropFilter:"blur(10px)",
          }}>
            {/* GTA Ambiental logo — left */}
            <a href="https://gtaambiental.com" target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", textDecoration:"none", gap:8 }}>
              <div style={{ width:36, height:36, background:T.green, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', fontWeight:'bold', color:T.white }}>GTA</div>
              <span style={{ fontFamily:T.font, fontWeight:700, fontSize:'0.82rem', letterSpacing:'0.05em', color:T.text }}>Ambiental</span>
            </a>
            
            {/* Macpresse logo — right */}
            <a href="https://www.macpresse.com" target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", textDecoration:"none", gap:8 }}>
              <div style={{ width:34, height:34, background:T.greenDeep, borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem', fontWeight:'bold', color:T.white }}>⚙</div>
              <span style={{ fontFamily:T.font, fontWeight:700, fontSize:'0.8rem', letterSpacing:'0.05em', color:T.text }}>Macpresse</span>
            </a>
          </header>

          {/* hero body */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            padding:"48px 24px 110px", position:"relative", zIndex:10 }}>

            {/* eyebrow */}
            <div style={{ textAlign:"center", marginBottom:52 }}>
              <div style={{
                display:"inline-block",
                background:T.offwhite, border:`1px solid ${T.grayDark}`,
                borderRadius:20, padding:"5px 18px", marginBottom:22,
              }}>
                <span style={{ fontFamily:T.font, fontWeight:600, fontSize:"0.58rem", letterSpacing:"0.2em", color:T.green, textTransform:"uppercase" }}>
                  Prueba de resistencia
                </span>
              </div>
              <h1 style={{
                fontFamily:T.font, fontWeight:700,
                fontSize:"clamp(2rem,5.5vw,3.3rem)",
                color:T.text, letterSpacing:"-0.025em", lineHeight:1.08,
              }}>
                Rompe lo que puedas.
              </h1>
              <p style={{ fontFamily:T.font, fontWeight:300, fontStyle:"italic", fontSize:"1.05rem", color:T.textSoft, marginTop:12 }}>
                Solo uno sobrevivirá.
              </p>
            </div>

            {/* blocks */}
            <div style={{ display:"flex", gap:"clamp(28px,7vw,110px)", alignItems:"flex-start", justifyContent:"center", flexWrap:"wrap" }}>
              <ConventionalBlock onDestroyed={() => setConvDestroyed(true)} />

              {/* VS */}
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:70, gap:10 }}>
                <div style={{ width:1, height:48, background:`linear-gradient(to bottom, transparent, ${T.grayDark})` }} />
                <div style={{ fontFamily:T.font, fontWeight:700, fontSize:"0.65rem", letterSpacing:"0.25em", color:T.grayDark }}>VS</div>
                <div style={{ width:1, height:48, background:`linear-gradient(to bottom, ${T.grayDark}, transparent)` }} />
              </div>

              <MacpresseBlock onMessageReady={handleMsgReady} />
            </div>

            {/* labels */}
            <div style={{ display:"flex", gap:"clamp(28px,7vw,110px)", marginTop:42, flexWrap:"wrap", justifyContent:"center" }}>
              <div style={{ textAlign:"center", minWidth:196 }}>
                <div style={{ fontFamily:T.font, fontWeight:500, fontSize:"0.53rem", letterSpacing:"0.16em", color: convDestroyed ? "#c07840" : T.neutralLt, textTransform:"uppercase", transition:"color 0.5s" }}>
                  {convDestroyed ? "☠ Destruido" : "Susceptible al desgaste"}
                </div>
              </div>
              <div style={{ minWidth:44 }} />
              <div style={{ textAlign:"center", minWidth:196 }}>
                <div style={{ fontFamily:T.font, fontWeight:500, fontSize:"0.53rem", letterSpacing:"0.16em", color:T.green, textTransform:"uppercase" }}>
                  ◆ Sin daño alguno
                </div>
              </div>
            </div>
          </div>

          {/* message */}
          {showMsg && (
            <div style={{
              position:"absolute", bottom:0, left:0, right:0,
              background:`linear-gradient(to top, rgba(243,255,239,0.97) 0%, rgba(243,255,239,0.84) 52%, transparent 100%)`,
              padding:"56px 24px 42px", textAlign:"center",
              animation:"msg-in 0.9s cubic-bezier(.2,0,.1,1) forwards",
              zIndex:20,
            }}>
              <p style={{
                fontFamily:T.font, fontWeight:300, fontStyle:"italic",
                fontSize:"clamp(1.05rem,2.7vw,1.65rem)",
                color:T.text, lineHeight:1.48,
                maxWidth:560, margin:"0 auto 28px",
              }}>
                "Hay estructuras que se desgastan.<br/>
                Y otras diseñadas para durar décadas."
              </p>

              {showCta && (
                <div
                  onClick={() => scrollRef.current?.scrollIntoView({ behavior:"smooth" })}
                  style={{ cursor:"pointer", display:"inline-flex", flexDirection:"column", alignItems:"center", gap:10 }}
                >
                  <div style={{ fontFamily:T.font, fontWeight:500, fontSize:"0.56rem", letterSpacing:"0.26em", color:T.textSoft, textTransform:"uppercase" }}>
                    Descubre por qué
                  </div>
                  <div style={{ animation:"arrow-bob 1.9s ease-in-out infinite" }}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path d="M11 3 L11 17 M5 12 L11 19 L17 12" stroke={T.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── SCROLL SECTIONS ─── */}
        <div ref={scrollRef}>
          {sections.map((s,i) => <ScrollSection key={i} index={i} {...s} />)}
        </div>

        {/* ─── FOOTER CTA ─── */}
        <div style={{
          borderTop:`1px solid ${T.gray}`,
          padding:"80px 24px 64px",
          textAlign:"center",
          background: T.offwhite,
        }}>
          <h2 style={{
            fontFamily:T.font, fontWeight:700,
            fontSize:"clamp(2rem,5.5vw,3.8rem)",
            color:T.text, letterSpacing:"-0.025em",
            lineHeight:1.1, marginBottom:16,
          }}>
            Construida para resistir<br/>donde otros fallan.
          </h2>
          <p style={{
            fontFamily:T.font, fontWeight:300, fontSize:"0.96rem",
            color:T.textSoft, lineHeight:1.8,
            maxWidth:460, margin:"0 auto 44px",
          }}>
            En GTA Ambiental llevamos la ingeniería Macpresse Europa a cada rincón de América Latina.<br/>
            Contáctanos y diseñamos la solución ideal para tu operación.
          </p>
          <a
            href="https://api.whatsapp.com/send?phone=5214422191556&text=%C2%A1Recib%C3%AD%20tu%20correo!%20Me%20gustar%C3%ADa%20valorizar%20mis%20residuos%20papeleros%20%F0%9F%93%83%F0%9F%93%A6"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration:"none" }}
          >
            <button className="mac-btn">Contactar a GTA Ambiental</button>
          </a>

          <div style={{ marginTop:64, display:"flex", alignItems:"center", justifyContent:"center", gap:32, flexWrap:"wrap" }}>
            <div style={{ width:36, height:36, background:T.green, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem', fontWeight:'bold', color:T.white }}>GTA</div>
            <div style={{ width:1, height:24, background:T.grayDark, opacity:0.5 }} />
            <div style={{ width:34, height:34, background:T.greenDeep, borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', fontWeight:'bold', color:T.white }}>⚙</div>
          </div>
          <div style={{ marginTop:24 }}>
            <span style={{ fontFamily:T.font, fontWeight:400, fontSize:"0.5rem", letterSpacing:"0.16em", color:T.neutralLt, textTransform:"uppercase" }}>
              © 2025 GTA Ambiental · Distribuidor oficial Macpresse Europa en América Latina
            </span>
          </div>
        </div>
      </div>
    </>
  );
}