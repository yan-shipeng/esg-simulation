/* ═══════════════════════════════════════════════════════════════
   FX ·「全息驾驶舱 Holo-Cockpit」视觉系统（v3，配色不变）
   - WebGL 极光背景（开场/决策页，鼠标搅动漩涡，自动降级 Canvas 2D）
   - 全局氛围：胶片颗粒 + 暗角 + 漂浮微尘
   - 网络图光晕层：脉冲/冲击波/呼吸/光河/环境脉冲/3D 视差倾斜
   - 微动效：KPI 脉冲+迷你走势 / 涟漪 / 倾斜 / 全息玻璃 / 涟漪转场
   - 开场星野粒子 · 指针辉光 · 结局礼花 + 环形仪表/雷达图
   纯视觉层：不读写玩法状态，只观察；全部动画走 rAF + transform/opacity。
   ═══════════════════════════════════════════════════════════════ */
(function(){
'use strict';
if(window.__FX_LIVING_NET) return; window.__FX_LIVING_NET = true;

/* ── 环境探测 ─────────────────────────────────────────────── */
const MQ = window.matchMedia ? window.matchMedia.bind(window) : ()=>({matches:false});
const REDUCE = MQ('(prefers-reduced-motion: reduce)').matches;
const COARSE = MQ('(pointer: coarse)').matches;
const CORES = navigator.hardwareConcurrency || 4;
const MEM = navigator.deviceMemory || 8;
const LOW = CORES <= 4 || MEM <= 4;          // 低端设备：自动降级
const NO_MORPH = /nofxmorph/.test(location.hash || '');   /* 诊断开关：只关数字滚动 */
const DPR = Math.min(window.devicePixelRatio || 1, LOW ? 1.25 : 2);
const TAU = Math.PI * 2;
/* 画布文本走运行时词典（DOM  MutationObserver 覆盖不到 canvas） */
const TXT = s => (typeof I18N !== 'undefined' && I18N && I18N.t && I18N.lang === 'en') ? I18N.t(s) : s;

/* ESG 调色板（与主题一致） */
const CLR = {
  teal:[13,139,150], green:[47,158,95], bright:[111,216,160], mint:[159,232,192],
  warn:[224,160,80], danger:[224,90,90], gold:[255,217,102], blue:[96,165,250]
};
function rgba(c,a){ return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

/* ── 全局 rAF 调度：所有 FX 动画共用一条循环 ──────────────── */
const tasks = new Set();
let looping = false;
function pump(t){
  if(!tasks.size || document.hidden){ looping = false; return; }
  tasks.forEach(f => { try{ f(t); }catch(_){ } });
  requestAnimationFrame(pump);
}
function addTask(f){ tasks.add(f); if(!looping && !document.hidden){ looping = true; requestAnimationFrame(pump); } }
function dropTask(f){ tasks.delete(f); }
document.addEventListener('visibilitychange', () => {
  if(!document.hidden && tasks.size && !looping){ looping = true; requestAnimationFrame(pump); }
});

/* ── 小工具 ──────────────────────────────────────────────── */
function $(s,r){ return (r||document).querySelector(s); }
function $all(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }
function elx(id){ return document.getElementById(id); }
function fitCanvas(cv){
  const r = cv.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width * DPR));
  const h = Math.max(1, Math.round(r.height * DPR));
  if(cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
  /* 关键：位图是 CSS×DPR，但所有绘制代码都用 CSS 坐标（含 getBoundingClientRect 推导的位置）。
     统一设 DPR 变换，保证 clearRect 覆盖整个位图——否则 DPR>1 时右/下边缘只画不清，
     颗粒层每帧自我叠加，几分钟就糊成一条不透明白带。 */
  try{
    const c2 = cv.__fx2d || (cv.__fx2d = cv.getContext('2d'));
    if(c2 && c2.setTransform) c2.setTransform(DPR, 0, 0, DPR, 0, 0);
  }catch(_){ }
  return { w:r.width, h:r.height };
}
/* easeOutCubic / spring-ish */
function easeOut(t){ return 1 - Math.pow(1-t, 3); }

/* ═══ 样式注入（keyframes / 玻璃 / 涟漪 / 转场）══════════════ */
const css = document.createElement('style');
css.textContent = [
  /* 屏幕转场 */
  '.screen.active{animation:fxScreenIn .3s ease-out}',
  '@keyframes fxScreenIn{from{opacity:.35;transform:translateY(10px)}to{opacity:1;transform:none}}',
  /* KPI 数值弹跳与变色脉冲 */
  '.kpi .num.fx-pop{animation:fxPop .45s cubic-bezier(.2,1.6,.4,1)}',
  '@keyframes fxPop{0%{transform:scale(1)}35%{transform:scale(1.22)}100%{transform:scale(1)}}',
  '.kpi.fx-good{animation:fxFlashG .8s ease-out}',
  '.kpi.fx-bad{animation:fxFlashR .8s ease-out}',
  '@keyframes fxFlashG{0%{box-shadow:0 0 0 0 rgba(111,216,160,.55)}100%{box-shadow:0 0 0 14px rgba(111,216,160,0)}}',
  '@keyframes fxFlashR{0%{box-shadow:0 0 0 0 rgba(224,90,90,.55)}100%{box-shadow:0 0 0 14px rgba(224,90,90,0)}}',
  /* KPI 迷你走势线 */
  '.kpi{position:relative}',
  'canvas.fx-spark{position:absolute;left:8px;right:8px;bottom:6px;width:calc(100% - 16px);height:16px;opacity:.85;pointer-events:none}',
  /* 按钮涟漪 */
  '.btn,.net-toggle{position:relative;overflow:hidden}',
  'span.fx-ripple{position:absolute;border-radius:50%;background:rgba(159,232,192,.35);transform:scale(0);animation:fxRipple .6s ease-out forwards;pointer-events:none}',
  '@keyframes fxRipple{to{transform:scale(3.2);opacity:0}}',
  /* 全息玻璃：旋转渐变描边（border-image）+ 扫描线 + 缓动光泽（背景层，不遮内容） */
  '@property --fx-ang{syntax:"<angle>";initial-value:0deg;inherits:false}',
  '.fx-glass{box-shadow:inset 0 0 0 1px var(--border);border:1px solid transparent;',
  '  border-image:conic-gradient(from var(--fx-ang),rgba(111,216,160,0) 0%,rgba(111,216,160,.5) 10%,rgba(13,139,150,.35) 18%,rgba(111,216,160,0) 32%) 1;',
  '  animation:fxSpin 7s linear infinite}',
  '@keyframes fxSpin{to{--fx-ang:360deg}}',
  /* 面板内部氛围（叠加在原背景色之上、内容之下；用背景图层，不用伪元素） */
  '.fx-holo{background-image:',
  '  linear-gradient(115deg,transparent 42%,rgba(159,232,192,.045) 50%,transparent 58%),',
  '  repeating-linear-gradient(0deg,rgba(255,255,255,.022) 0 1px,transparent 1px 3px);',
  '  background-size:260% 100%,100% 100%;background-repeat:no-repeat,repeat;',
  '  animation:fxSheen 9s ease-in-out infinite}',
  '@keyframes fxSheen{0%,100%{background-position:130% 0,0 0}50%{background-position:-40% 0,0 0}}',
  /* 全局氛围层：暗角常开，颗粒/微尘画在同一块画布上 */
  'canvas.fx-atmo{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9988;box-shadow:inset 0 0 190px rgba(2,8,12,.6)}',
  /* 指针辉光 */
  '.fx-cursor{position:fixed;left:0;top:0;width:230px;height:230px;border-radius:50%;pointer-events:none;z-index:9970;',
  '  background:radial-gradient(circle,rgba(111,216,160,.10),rgba(13,139,150,.05) 42%,transparent 66%);mix-blend-mode:screen;will-change:transform}',
  /* 屏幕切换涟漪擦除 */
  '.fx-wipe{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:9984}',
  '.fx-wipe i{display:block;width:46vmax;height:46vmax;border-radius:50%;border:2px solid rgba(111,216,160,.5);',
  '  box-shadow:0 0 70px rgba(13,139,150,.35),inset 0 0 70px rgba(13,139,150,.28);animation:fxWipe .7s ease-out forwards}',
  '@keyframes fxWipe{from{transform:scale(.04);opacity:1}to{transform:scale(3);opacity:0}}',
  /* 卡片 3D 倾斜 */
  '.fx-tilt{transition:transform .18s ease-out;will-change:transform}',
  /* 网络图节点呼吸/漂浮 */
  '.svg-wrapper .node{transform-box:fill-box;transform-origin:center;animation:fxDrift 7s ease-in-out infinite}',
  '.svg-wrapper .node:nth-of-type(2n){animation-duration:8.4s;animation-delay:-2s}',
  '.svg-wrapper .node:nth-of-type(3n){animation-duration:6.2s;animation-delay:-4s}',
  '@keyframes fxDrift{0%,100%{transform:translate(0,0)}30%{transform:translate(1.3px,-1.8px)}65%{transform:translate(-1.5px,1.2px)}}',
  /* 网络图光晕层 */
  'canvas.fx-net{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}',
  /* 拖拽平移期间由 JS 动态设置 touch-action:none，平时不拦手机滚动 */
  /* 里程碑脉冲 */
  '.fx-ms{animation:fxMs 2.2s ease-in-out infinite}',
  '@keyframes fxMs{0%,100%{opacity:.35}50%{opacity:1}}',
  /* 决策页极光宿主 */
  '#screen-decision{position:relative}',
  'canvas.fx-aurora{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}',
  '#screen-decision > *:not(canvas.fx-aurora){position:relative;z-index:1;background:rgba(6,17,26,.52)}',
  /* 战局回放 */
  '.fx-replay{margin-bottom:14px}',
  '.fx-replay-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}',
  '.fx-replay-title{font-weight:700;font-size:15px;color:#eaf6ef;margin-bottom:2px}',
  'canvas.fx-replay-cv{display:block;width:100%;height:320px;background:rgba(3,10,15,.55);border-radius:10px}',
  '.fx-replay-track{height:5px;background:rgba(255,255,255,.08);border-radius:3px;margin-top:8px;cursor:pointer}',
  '.fx-replay-track i{display:block;height:100%;width:0;background:linear-gradient(90deg,#0d8b96,#2f9e5f);border-radius:3px}',
  /* 网络推进过场（全屏） */
  '.fx-netcine{position:fixed;inset:0;z-index:2500;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(3,9,14,.94);opacity:0;transition:opacity .3s ease;pointer-events:none}',
  '.fx-netcine.on{opacity:1}',
  '.fx-netcine canvas{width:min(1100px,94vw);height:min(640px,72vh);display:block}',
  '.fx-netcine-cap{display:flex;align-items:baseline;gap:12px}',
  '.fx-netcine-kicker{font-size:12px;letter-spacing:4px;color:#6fd8a0;font-weight:700}',
  '.fx-netcine-action{font-size:20px;font-weight:800;color:#eaf6ef}',
  '.fx-netcine-notes{display:flex;gap:18px;min-height:18px;align-items:center}',
  '.fx-netcine-notes span{font-size:12.5px;font-weight:700;letter-spacing:2px;opacity:0;animation:fxNoteIn .45s forwards}',
  '.fx-n-direct{color:#8ef0a8}',
  '.fx-n-spread{color:#a6f4ff}',
  '.fx-n-decay{color:#9ab4c2}',
  '.fx-netcine-line{min-height:30px;font-size:21px;font-weight:800;letter-spacing:4px;color:#ffffff;'+'text-shadow:0 0 20px rgba(120,235,175,.75),0 0 42px rgba(120,235,175,.35),0 2px 3px rgba(0,0,0,.8);opacity:0}',
  '.fx-netcine-line.on{animation:fxNoteIn .45s forwards}',
  '@keyframes fxNoteIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',
  /* 减少动态：全停 */
  '@media (prefers-reduced-motion: reduce){.screen.active,.kpi .num.fx-pop,.fx-glass,.fx-holo,.svg-wrapper .node,.fx-ms,.fx-wipe i{animation:none!important}}'
].join('\n');
document.head.appendChild(css);

/* ═══ WebGL 极光背景（fbm 域扭曲噪声，青绿极光）══════════════ */
const FRAG = `
precision mediump float;
uniform float uT; uniform vec2 uR; uniform vec2 uP; uniform vec2 uV;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.,0.)), u.x),
             mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<4;i++){ v += a*noise(p); p = p*2.03 + vec2(1.7,9.2); a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uR;
  vec2 q = uv * vec2(uR.x/uR.y, 1.0) * 2.2;
  float t = uT * 0.045;
  vec2 warp = vec2(fbm(q + t), fbm(q + vec2(5.2,1.3) - t));
  /* 鼠标搅动：纯速度驱动——静止时完全衰减，不留静态伪影 */
  vec2 pd = (uv - uP - vec2(.5)) * vec2(uR.x/uR.y, 1.0);
  float fall = exp(-dot(pd,pd)*5.5);
  float glow = exp(-dot(pd,pd)*14.0);   /* 更紧的径向：指针光点不做成长条 */
  float vig = length(uV);
  vec2 swirl = vec2(-pd.y, pd.x) * fall * min(vig*22.0, 3.0);
  float n = fbm(q + 2.1*warp + uP*0.35 + swirl*0.30);
  float band = smoothstep(.35,.95,n);
  vec3 deep  = vec3(0.023,0.066,0.102);            /* #06111a */
  vec3 teal  = vec3(0.051,0.545,0.588);            /* #0d8b96 */
  vec3 green = vec3(0.184,0.620,0.373);            /* #2f9e5f */
  vec3 mint  = vec3(0.435,0.847,0.627);
  vec3 col = deep;
  col = mix(col, teal*0.55, band*0.75);
  col = mix(col, green*0.5, smoothstep(.55,1.0,n)*0.6);
  col += mint * pow(max(n-.72,0.0)*3.2, 2.0) * 0.28;
  /* 指针处微点亮（紧径向光点） */
  col += mint * glow * (0.05 + min(vig*1.5, 0.18));
  col *= 0.85;                       /* 整体压暗：面板缝隙里露出的亮纹更含蓄 */
  float vig2 = smoothstep(1.25, .35, distance(uv, vec2(.5,.45)));
  col *= mix(.75, 1.0, vig2);
  gl_FragColor = vec4(col, 1.0);
}`;

function makeAurora(host, opts){
  if(!host) return;
  const cv = document.createElement('canvas');
  cv.className = 'fx-aurora';
  host.insertBefore(cv, host.firstChild);
  if(REDUCE){ cv.style.background = 'radial-gradient(120% 90% at 70% 20%, rgba(13,139,150,.16), transparent 60%), radial-gradient(100% 80% at 20% 85%, rgba(47,158,95,.12), transparent 55%), #06111a'; return; }
  let gl = null;
  try{ gl = cv.getContext('webgl', {antialias:false, depth:false, alpha:false, powerPreference: LOW ? 'low-power' : 'high-performance'}); }catch(_){ }
  let prog=null, buf=null, uT, uR, uP, uV, mode = gl ? 'gl' : '2d';
  const ctx2d = mode === '2d' ? cv.getContext('2d') : null;
  const ptr = { x:.5, y:.5, tx:.5, ty:.5, vx:0, vy:0 };
  function initGL(){
    const mk=(t,s)=>{ const sh=gl.createShader(t); gl.shaderSource(sh,s); gl.compileShader(sh); return sh; };
    prog = gl.createProgram();
    gl.attachShader(prog, mk(gl.VERTEX_SHADER,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER,FRAG));
    gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){ mode='2d'; return false; }
    gl.useProgram(prog);
    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog,'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    uT = gl.getUniformLocation(prog,'uT'); uR = gl.getUniformLocation(prog,'uR');
    uP = gl.getUniformLocation(prog,'uP'); uV = gl.getUniformLocation(prog,'uV');
    return true;
  }
  if(mode==='gl' && !initGL()) mode='2d';
  let lastPX = null, lastPY = null;
  host.addEventListener('pointermove', e => {
    const r = host.getBoundingClientRect();
    const nx = (e.clientX - r.left) / Math.max(1, r.width);
    const ny = 1 - (e.clientY - r.top) / Math.max(1, r.height);
    if(lastPX !== null){
      ptr.vx = ptr.vx * .5 + (nx - lastPX) * 2.2;
      ptr.vy = ptr.vy * .5 + (ny - lastPY) * 2.2;
    }
    lastPX = nx; lastPY = ny;
    ptr.tx = nx; ptr.ty = ny;
  }, {passive:true});
  host.addEventListener('pointerleave', () => { lastPX = lastPY = null; }, {passive:true});
  let t0 = performance.now();
  function frame(now){
    if(!cv.isConnected){ dropTask(frame); return; }
    const on = opts.visible();
    cv.style.opacity = on ? '1' : '0';
    if(!on) return;
    const { w, h } = fitCanvas(cv);
    if(w < 2 || h < 2) return;
    ptr.x += (ptr.tx - ptr.x) * .04; ptr.y += (ptr.ty - ptr.y) * .04;
    ptr.vx *= .94; ptr.vy *= .94;
    const t = (now - t0) / 1000;
    if(mode === 'gl' && gl){
      gl.viewport(0,0,cv.width,cv.height);
      gl.uniform1f(uT, t); gl.uniform2f(uR, cv.width, cv.height);
      gl.uniform2f(uP, ptr.x-.5, ptr.y-.5);
      gl.uniform2f(uV, ptr.vx, ptr.vy);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else if(ctx2d){
      /* Canvas 2D 降级：漂移的径向辉光 */
      ctx2d.clearRect(0,0,w,h);
      ctx2d.fillStyle = '#06111a'; ctx2d.fillRect(0,0,w,h);
      const g1x = w*(.65 + .18*Math.sin(t*.23) + (ptr.x-.5)*40);
      const g1y = h*(.25 + .12*Math.cos(t*.19) - (ptr.y-.5)*30);
      let g = ctx2d.createRadialGradient(g1x,g1y,0,g1x,g1y,Math.max(w,h)*.65);
      g.addColorStop(0,'rgba(13,139,150,.20)'); g.addColorStop(1,'rgba(13,139,150,0)');
      ctx2d.fillStyle = g; ctx2d.fillRect(0,0,w,h);
      const g2x = w*(.25 - .15*Math.sin(t*.17));
      const g2y = h*(.8 + .1*Math.sin(t*.29));
      g = ctx2d.createRadialGradient(g2x,g2y,0,g2x,g2y,Math.max(w,h)*.55);
      g.addColorStop(0,'rgba(47,158,95,.16)'); g.addColorStop(1,'rgba(47,158,95,0)');
      ctx2d.fillStyle = g; ctx2d.fillRect(0,0,w,h);
    }
  }
  addTask(frame);
}

/* ═══ 网络图光晕层 ═══════════════════════════════════════════ */
/* viewBox 基准（与 drawNetwork 一致） */
const VB = { x:-60, y:-50, w:500, h:450 };
const nets = new Map();   /* svgId -> entry */

function netEntry(svgId){
  if(nets.has(svgId)) return nets.get(svgId);
  const svg = elx(svgId);
  if(!svg) return null;
  const wrap = svg.closest('.svg-wrapper') || svg.parentElement;
  if(!wrap) return null;
  if(getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
  const cv = document.createElement('canvas');
  cv.className = 'fx-net';
  wrap.appendChild(cv);
  const entry = {
    svgId, svg, wrap, cv, ctx: cv.getContext('2d'),
    k:1, tx:0, ty:0, vx:0, vy:0,       /* 缩放/平移（viewBox 单位） */
    panning:false, moved:0, px:0, py:0,
    ptr:{x:-999, y:-999, inside:false},
    offsets:{},                        /* 斥力视觉偏移 */
    pulses:[], waves:[], seeds:{}, floats:[],
    hover:null, lastStatus:{}, lastHist:0, lastSoft:{},
    hasPulse:false, hasWave:false
  };
  setupNetInput(entry);
  nets.set(svgId, entry);
  addTask(netFrame);
  return entry;
}

/* 图坐标 → 屏幕坐标（含缩放平移） */
function netMap(entry, gx, gy){
  const r = entry.wrap.getBoundingClientRect();
  const bw = Math.min(r.width / VB.w, r.height / VB.h);
  const cx = (r.width - VB.w * bw) / 2, cy = (r.height - VB.h * bw) / 2;
  return [ cx + (gx - VB.x - entry.tx) * bw * entry.k,
           cy + (gy - VB.y - entry.ty) * bw * entry.k ];
}
function netUnmap(entry, sx, sy){
  const r = entry.wrap.getBoundingClientRect();
  const base = Math.min(r.width / VB.w, r.height / VB.h);
  const cx = (r.width - VB.w * base) / 2, cy = (r.height - VB.h * base) / 2;
  return [ VB.x + entry.tx + (sx - cx) / (base * entry.k), VB.y + entry.ty + (sy - cy) / (base * entry.k) ];
}
function applyView(entry){
  entry.svg.setAttribute('viewBox', `${VB.x + entry.tx} ${VB.y + entry.ty} ${VB.w / entry.k} ${VB.h / entry.k}`);
}

function setupNetInput(entry){
  const { wrap, svg } = entry;
  /* 滚轮缩放（以指针为锚） */
  wrap.addEventListener('wheel', e => {
    if(REDUCE) return;
    e.preventDefault();
    const r = wrap.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const before = netUnmap(entry, mx, my);
    entry.k = Math.min(2.6, Math.max(.6, entry.k * (e.deltaY < 0 ? 1.12 : 1/1.12)));
    const after = netUnmap(entry, mx, my);
    entry.tx += before[0] - after[0]; entry.ty += before[1] - after[1];
    applyView(entry);
  }, {passive:false});
  /* 拖拽平移 + 惯性 */
  wrap.addEventListener('pointerdown', e => {
    if(e.target.closest('.net-toggle')) return;
    entry.panning = true; entry.moved = 0;
    entry.px = e.clientX; entry.py = e.clientY;
    entry.vx = entry.vy = 0;
    wrap.style.touchAction = 'none';    /* 仅本次手势拦截滚动，手势结束恢复 */
    try{ wrap.setPointerCapture(e.pointerId); }catch(_){ }
  });
  wrap.addEventListener('pointermove', e => {
    const r = wrap.getBoundingClientRect();
    entry.ptr.x = e.clientX - r.left; entry.ptr.y = e.clientY - r.top; entry.ptr.inside = true;
    if(!entry.panning) return;
    const base = Math.min(r.width / VB.w, r.height / VB.h);
    const dx = (e.clientX - entry.px) / (base * entry.k);
    const dy = (e.clientY - entry.py) / (base * entry.k);
    entry.tx -= dx; entry.ty -= dy;
    entry.vx = -dx; entry.vy = -dy;
    entry.moved += Math.abs(e.clientX - entry.px) + Math.abs(e.clientY - entry.py);
    entry.px = e.clientX; entry.py = e.clientY;
    applyView(entry);
  });
  const endPan = () => {
    if(!entry.panning) return;
    entry.panning = false;
    wrap.style.touchAction = '';
    if(entry.moved > 6) entry.inertia = true;   /* 惯性在帧循环里衰减 */
  };
  wrap.addEventListener('pointerup', endPan);
  wrap.addEventListener('pointercancel', endPan);
  wrap.addEventListener('pointerleave', () => { entry.ptr.inside = false; entry.hover = null; endPan(); });
}

/* 状态观察：状态变化 → 冲击波；新回合 → 脉冲；扩散圈 → 微脉冲 */
function netObserve(entry){
  try{
    const P = (typeof state !== 'undefined') ? state.people : null;
    if(!P) return;
    if(!entry._obsInit){
      /* 首次只建立基线，不补放旧动画 */
      entry._obsInit = true;
      entry.lastHist = (state.history || []).length;
      Object.keys(P).forEach(id => { entry.lastStatus[id] = P[id] ? P[id].status : undefined; });
      return;
    }
    Object.keys(P).forEach(id => {
      const p = P[id]; if(!p) return;
      const prev = entry.lastStatus[id];
      if(prev !== undefined && prev !== p.status && !p.removed){
        const good = p.status > prev;
        netWave(entry, id, good ? CLR.bright : CLR.warn, good ? 1 : .7);
      }
      entry.lastStatus[id] = p.status;
    });
    const H = state.history || [];
    if(H.length > entry.lastHist){
      const h = H[H.length - 1];
      (h.targets || []).forEach(tid => netPulse(entry, 'pm', tid, CLR.bright));
      entry.lastHist = H.length;
    }
    const S = state.softened || {};
    Object.keys(S).forEach(id => {
      if(!entry.lastSoft[id]) netPulse(entry, state.softenedOrigin && state.softenedOrigin[id] || 'pm', id, CLR.mint, .6);
      entry.lastSoft[id] = S[id];
    });
  }catch(_){ }
}

/* 公开效果 API（脉冲沿边/曲线传播；冲击波扩散） */
function netPulse(entry, fromId, toId, color, power, speed){
  if(REDUCE || !entry) return;
  const P = state.people;
  if(!P || !P[fromId] || !P[toId]) return;
  entry.pulses.push({ a:fromId, b:toId, t:0, speed:(speed||(.011 + Math.random()*.004)), color:color||CLR.bright, power:power||1 });
  entry.hasPulse = true;
}
function netWave(entry, id, color, power){
  if(REDUCE || !entry) return;
  entry.waves.push({ id, r:8, alpha:.8 * (power||1), color:color||CLR.bright });
  entry.hasWave = true;
}

/* ═══ 回合触发动画：结算弹窗关闭后，立刻从网络角度回放这一回合 ═══
   能量从「你」错峰流向每个被触及的人，到达时冲击波 + 节点头顶浮出 ±N；
   升档金环 / 降档红环。每个 lastImpact 只播一次；结局页有完整战局回放，不重复播。 */
/* 网络推进过场：全屏播放本回合动作如何沿网络扩散（替代原全屏过场）。
   点击「执行决策」后铺满屏幕的大网络图上：能量从「你」错峰流向每个被触及的人，
   到达时冲击波 + 头顶浮出 ±N，升档金环/降档红环。 */
const NETCINE_MS = 4600;
function playNetCinematic(a){
  if(REDUCE || typeof state === 'undefined' || !state) return;
  const P = state.people;
  const li = state.lastImpact;
  if(!P || !li) return;
  const rows = (li.people || []).filter(r => P[r.id] && !P[r.id].removed);
  const d = document.createElement('div');
  d.className = 'fx-netcine';
  d.innerHTML = '<div class="fx-netcine-cap"><span class="fx-netcine-kicker">网络推进</span>' +
    '<span class="fx-netcine-action">' + (li.actionLabel || (a && a.label) || '') + '</span></div>' +
    '<canvas></canvas>' +
    '<div class="fx-netcine-notes"></div>' +
    '<div class="fx-netcine-line"></div>';
  document.body.appendChild(d);
  const cv = d.querySelector('canvas');
  const ctx = cv.getContext('2d');
  requestAnimationFrame(() => d.classList.add('on'));
  setTimeout(() => { d.classList.remove('on'); setTimeout(() => d.remove(), 340); }, NETCINE_MS - 320);
  const r0 = cv.getBoundingClientRect();
  const W = r0.width, H = r0.height;
  const bw = Math.min(W / VB.w, H / VB.h);
  const ox = (W - VB.w * bw) / 2, oy = (H - VB.h * bw) / 2;
  const pos = id => { const p = P[id]; return [ox + (p.x - VB.x) * bw, oy + (p.y - VB.y) * bw]; };
  const rowCol = row => row.to > row.from ? CLR.gold
    : row.to < row.from ? CLR.danger
    : row.delta > 0 ? CLR.bright
    : row.delta < 0 ? CLR.warn : CLR.teal;
  const stCol = st => st === 4 ? CLR.green : st === 3 ? CLR.bright : st === 2 ? CLR.teal : [96, 116, 128];
  const pulses = [], waves = [], floats = [], cooling = [];
  const notes = d.querySelector('.fx-netcine-notes');
  const line = d.querySelector('.fx-netcine-line');
  const LINES = { direct:'你亲自出马，正面推动', spread:'网络替你发力，层层带动', decay:'无人推动，自然回落' };
  const note = kind => {
    if(notes){
      const el = document.createElement('span');
      el.className = 'fx-n-' + kind;
      el.textContent = { direct:'直接推动', spread:'间接推动', decay:'自然冷却' }[kind];
      notes.appendChild(el);
    }
    if(line){
      line.textContent = LINES[kind] || '';
      line.classList.remove('on');
      line.style.animation = 'none';
      void line.offsetWidth;
      line.style.animation = '';
      line.classList.add('on');
    }
  };
  /* 三分类：直接命中 / 网络带动 / 自然冷却（无能量流动） */
  const isDirect = row => (row.reasons || []).some(t => t === '直接推动' || t === '动作直接作用' || t === '广覆盖');
  const isDecay = row => !isDirect(row) && (row.reasons || []).indexOf('自然衰减') >= 0 && (row.reasons || []).indexOf('网络扩散') < 0;
  rows.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  const direct = rows.filter(isDirect).slice(0, 12);
  const decay = rows.filter(isDecay).slice(0, 12);
  const spread = rows.filter(r => !isDirect(r) && !isDecay(r)).slice(0, 12);
  /* 间接推动的源头：从受影响最深、与其有关系的直接推动节点沿网络流过去 */
  const srcOf = row => {
    let best = null, bestScore = -1;
    direct.forEach(dr => {
      const p = P[row.id];
      if(!p || !P[dr.id]) return;
      if((p.ties || []).indexOf(dr.id) < 0 && (P[dr.id].ties || []).indexOf(row.id) < 0) return;
      const score = Math.abs(dr.delta) + (P[dr.id].status || 0) * 2;
      if(score > bestScore){ bestScore = score; best = dr.id; }
    });
    return best || 'pm';
  };
  const STEEL = [130, 160, 175];
  /* 三个明确错开的相位：直接 → 间接 → 冷却，各配旁白 */
  const D0 = 400, D_STEP = 120;
  const iBase = D0 + direct.length * D_STEP + 850;
  const dBase = iBase + spread.length * 140 + 700;
  /* 第一波：直接推动——从「你」直线出击 */
  setTimeout(() => { if(d.parentNode) note('direct'); }, D0);
  direct.forEach((row, i) => {
    const delay = D0 + i * D_STEP;
    setTimeout(() => { if(d.parentNode) pulses.push({ a:'pm', b:row.id, t:0, col:rowCol(row), power:Math.min(1.7, .7 + Math.abs(row.delta) / 8) }); }, delay);
    setTimeout(() => {
      if(!d.parentNode) return;
      const s2 = pos(row.id);
      if(row.revealed !== false) floats.push({ x:s2[0], y:s2[1], t:0, txt:(row.delta > 0 ? '+' : '') + row.delta, col:rowCol(row) });
      waves.push({ x:s2[0], y:s2[1], r:5, alpha:.85, col:rowCol(row) });
    }, delay + 760);
  });
  /* 第二波：间接推动——沿网络边从邻居流过来 */
  if(spread.length) setTimeout(() => { if(d.parentNode) note('spread'); }, iBase);
  spread.forEach((row, i) => {
    const delay = iBase + i * 140;
    const src = srcOf(row);
    const col = row.to > row.from ? CLR.gold : row.to < row.from ? CLR.danger
      : row.delta > 0 ? CLR.mint : row.delta < 0 ? CLR.warn : CLR.teal;
    setTimeout(() => { if(d.parentNode && P[src]) pulses.push({ a:src, b:row.id, t:0, col:col, power:Math.min(1.2, .45 + Math.abs(row.delta) / 10) }); }, delay);
    setTimeout(() => {
      if(!d.parentNode) return;
      const s2 = pos(row.id);
      if(row.revealed !== false) floats.push({ x:s2[0], y:s2[1], t:0, txt:(row.delta > 0 ? '+' : '') + row.delta, col:col });
      waves.push({ x:s2[0], y:s2[1], r:5, alpha:.8, col:col });
    }, delay + 740);
  });
  /* 第三波：自然冷却——不发射脉冲、不点亮连线，只在节点上做向内收缩的降温环 */
  if(decay.length) setTimeout(() => { if(d.parentNode) note('decay'); }, dBase);
  decay.forEach((row, i) => {
    const delay = dBase + i * 120;
    setTimeout(() => {
      if(!d.parentNode) return;
      const s2 = pos(row.id);
      if(row.revealed !== false) floats.push({ x:s2[0], y:s2[1], t:0, txt:(row.delta > 0 ? '+' : '') + row.delta, col:STEEL });
      cooling.push({ x:s2[0], y:s2[1], t:0 });
    }, delay + 200);
  });
  setTimeout(() => { if(d.parentNode && P.pm){ const s2 = pos('pm'); waves.push({ x:s2[0], y:s2[1], r:6, alpha:.9, col:CLR.mint }); } }, 90);
  const seed = id => { let h = 0; for(let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997; return h / 997 * 6.28; };
  let last = 0;
  (function frame(now){
    if(!d.parentNode) return;
    const dt = Math.min(.05, last ? (now - last) / 1000 : .016); last = now;
    const t = now / 1000;
    const fw = cv.getBoundingClientRect().width, fh = cv.getBoundingClientRect().height;
    if(cv.width !== Math.round(fw * DPR)){ cv.width = Math.round(fw * DPR); cv.height = Math.round(fh * DPR); }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, fw, fh);
    /* 边 */
    const seen = {};
    ctx.lineWidth = 1;
    Object.keys(P).forEach(id => {
      const p = P[id]; if(!p || p.removed || typeof p.x !== 'number') return;
      (p.ties || []).forEach(tid => {
        if(id >= tid || !P[tid]) return;
        const k = id + '|' + tid; if(seen[k]) return; seen[k] = 1;
        const A = pos(id), B = pos(tid);
        ctx.strokeStyle = rgba(CLR.teal, .16);
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      });
    });
    /* 脉冲：弧线 + 拖尾 */
    for(let i = pulses.length - 1; i >= 0; i--){
      const pu = pulses[i];
      const pb = P[pu.b];
      if(!pb){ pulses.splice(i, 1); continue; }
      pu.t += dt / .7;
      if(pu.t >= 1){
        pulses.splice(i, 1);
        const s2 = pos(pu.b);
        waves.push({ x:s2[0], y:s2[1], r:5, alpha:.6, col:pu.col });
        continue;
      }
      const A = pos(pu.a || 'pm'), B = pos(pu.b);
      const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
      const dx = B[0] - A[0], dy = B[1] - A[1];
      const len = Math.max(1, Math.hypot(dx, dy));
      const nx = mx - dy / len * len * .18, ny = my + dx / len * len * .18;
      const tt = easeOut(pu.t);
      ctx.globalCompositeOperation = 'lighter';
      for(let k = 3; k >= 0; k--){
        const tk = Math.max(0, tt - k * .05);
        const xk = (1-tk)*(1-tk)*A[0] + 2*(1-tk)*tk*nx + tk*tk*B[0];
        const yk = (1-tk)*(1-tk)*A[1] + 2*(1-tk)*tk*ny + tk*tk*B[1];
        const rr = (4.5 - k) * pu.power;
        const g = ctx.createRadialGradient(xk, yk, 0, xk, yk, rr * 2.4);
        g.addColorStop(0, rgba(pu.col, .55 - k * .11));
        g.addColorStop(1, rgba(pu.col, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(xk, yk, rr * 2.4, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    /* 冲击波 */
    for(let i = waves.length - 1; i >= 0; i--){
      const wv = waves[i];
      wv.r += 70 * dt; wv.alpha -= 1.2 * dt;
      if(wv.alpha <= .02){ waves.splice(i, 1); continue; }
      ctx.strokeStyle = rgba(wv.col, wv.alpha);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(wv.x, wv.y, wv.r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgba(wv.col, wv.alpha * .4);
      ctx.beginPath(); ctx.arc(wv.x, wv.y, wv.r * .72, 0, TAU); ctx.stroke();
    }
    /* 节点 */
    Object.keys(P).forEach(id => {
      const p = P[id]; if(!p || p.removed || typeof p.x !== 'number') return;
      const s2 = pos(id);
      const c = id === 'pm' ? CLR.mint : stCol(p.status);
      const breath = .5 + .5 * Math.sin(t * 1.6 + seed(id));
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(s2[0], s2[1], 0, s2[0], s2[1], 22);
      g.addColorStop(0, rgba(c, .22 + .1 * breath)); g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s2[0], s2[1], 22, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      const R = id === 'pm' ? 13 : 10;
      ctx.fillStyle = 'rgba(8,20,28,.94)';
      ctx.beginPath(); ctx.arc(s2[0], s2[1], R, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(c, .92); ctx.lineWidth = id === 'pm' ? 2.2 : 1.6;
      ctx.beginPath(); ctx.arc(s2[0], s2[1], R, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(214,232,224,.88)';
      ctx.font = '10.5px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(TXT(p.name), s2[0], s2[1] + R + 4);
    });
    /* 自然冷却：向内收缩的降温环（无能量流动，不碰连线） */
    for(let i = cooling.length - 1; i >= 0; i--){
      const cc = cooling[i];
      cc.t += dt;
      if(cc.t > .95){ cooling.splice(i, 1); continue; }
      const cr = 30 - cc.t * 22;
      const ca = .55 * (1 - cc.t / .95);
      ctx.strokeStyle = rgba(STEEL, ca);
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(cc.x, cc.y, Math.max(6, cr), 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    /* 浮字 */
    for(let i = floats.length - 1; i >= 0; i--){
      const f = floats[i];
      f.t += dt;
      const life = 1.5;
      if(f.t > life){ floats.splice(i, 1); continue; }
      const a = f.t < .12 ? f.t / .12 : 1 - (f.t - .12) / (life - .12);
      const fy = f.y - 16 - f.t * 30;
      ctx.font = '700 15px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = rgba(f.col, .85 * a); ctx.shadowBlur = 9;
      ctx.fillStyle = 'rgba(4,12,18,' + (.9 * a).toFixed(2) + ')';
      ctx.fillText(f.txt, f.x, fy);
      ctx.fillStyle = rgba(f.col, a);
      ctx.fillText(f.txt, f.x, fy);
      ctx.shadowBlur = 0;
    }
    requestAnimationFrame(frame);
  })(performance.now());
}
/* 用网络推进过场替换全屏过场：不再创建 #cine overlay。
   节奏：把 _cineStart 写到未来（NETCINE_MS - CINE_MS），revealAfter 的等待就被拉长到
   整场播完（~2.7s），结算弹窗/祝贺动画随后照常。 */
function setupNetCinematic(){
  if(typeof playActionCinematic !== 'function' || playActionCinematic.__fxNetCine) return;
  const _pac = playActionCinematic;
  playActionCinematic = function(a, targetIds){
    if(typeof cineDisabled === 'function' && cineDisabled()){ _pac(a, targetIds); return; }
    try{
      _cineStart = Date.now() + (REDUCE ? 0 : (NETCINE_MS - CINE_MS));
      _cineBusy = true;
    }catch(_){ }
    if(!REDUCE) setTimeout(() => { try{ playNetCinematic(a); }catch(_){ } }, 60);
  };
  playActionCinematic.__fxNetCine = true;
}

/* 每帧渲染 */
function netFrame(now){
  let anyVisible = false;
  nets.forEach(entry => {
    const { cv, ctx, wrap } = entry;
    if(!cv.isConnected){ nets.delete(entry.svgId); return; }
    const r = wrap.getBoundingClientRect();
    const visible = r.width > 4 && r.bottom > 0 && r.top < innerHeight && !document.hidden;
    if(!visible){ return; }
    anyVisible = true;
    const { w, h } = fitCanvas(cv);
    ctx.clearRect(0, 0, w, h);
    if(REDUCE) return;
    const P = (typeof state !== 'undefined') ? state.people : null;
    if(!P) return;

    /* 惯性衰减 */
    if(entry.inertia && !entry.panning){
      entry.tx += entry.vx; entry.ty += entry.vy;
      entry.vx *= .92; entry.vy *= .92;
      if(Math.abs(entry.vx) + Math.abs(entry.vy) < .02) entry.inertia = false;
      applyView(entry);
    }

    netObserve(entry);

    /* 斥力偏移（指针靠近推开节点） */
    const offs = entry.offsets;
    Object.keys(offs).forEach(id => {
      offs[id][0] *= .86; offs[id][1] *= .86;
      if(Math.abs(offs[id][0]) + Math.abs(offs[id][1]) < .3) delete offs[id];
    });
    let hoverNode = null;
    if(entry.ptr.inside && !COARSE){
      let best = 42;
      Object.keys(P).forEach(id => {
        const p = P[id]; if(!p || p.removed || typeof p.x !== 'number') return;
        const s = netMap(entry, p.x, p.y);
        const d = Math.hypot(s[0] - entry.ptr.x, s[1] - entry.ptr.y);
        if(d < best){ best = d; hoverNode = id; }
      });
      if(hoverNode){
        const p = P[hoverNode];
        const s = netMap(entry, p.x, p.y);
        const dx = s[0] - entry.ptr.x, dy = s[1] - entry.ptr.y;
        const d = Math.max(6, Math.hypot(dx, dy));
        const f = Math.min(10, 90 / d) * .6;
        offs[hoverNode] = [offs[hoverNode] ? offs[hoverNode][0] : 0, offs[hoverNode] ? offs[hoverNode][1] : 0];
        offs[hoverNode][0] += (dx / d) * f; offs[hoverNode][1] += (dy / d) * f;
      }
    }
    entry.hover = hoverNode;
    /* 斥力视觉同步到 SVG 节点 */
    $all('.node', entry.svg).forEach(g => {
      const id = g.getAttribute('data-id');
      const o = offs[id];
      g.style.transform = o ? `translate(${o[0].toFixed(1)}px,${o[1].toFixed(1)}px)` : '';
    });

    /* 邻域高亮数据 */
    const nbr = {};
    if(hoverNode){
      nbr[hoverNode] = true;
      (P[hoverNode].ties || []).forEach(t => nbr[t] = true);
      ((state.informal || [])).forEach(k => {
        const pr = k.split('|');
        if(pr[0] === hoverNode) nbr[pr[1]] = true;
        if(pr[1] === hoverNode) nbr[pr[0]] = true;
      });
    }

    const t = now / 1000;
    const kScale = Math.min(r.width / VB.w, r.height / VB.h) * entry.k;

    /* 0) 光河：关系边持续流动的微光（虚线前移），正式/非正式两种色 */
    if(!LOW){
      ctx.save();
      ctx.setLineDash([5 * kScale, 9 * kScale]);
      ctx.lineDashOffset = -t * 26 * kScale;
      ctx.lineCap = 'round';
      const seen = {};
      ctx.globalCompositeOperation = 'lighter';
      const edge = (a, b, col, al) => {
        if(!a || !b || a.removed || b.removed) return;
        const key = a.x < b.x ? 'ab' : 'ba';
        const k2 = (typeof a.id === 'string' ? a.id : '') + '|' + (typeof b.id === 'string' ? b.id : '') + col;
        if(seen[k2]) return; seen[k2] = 1;
        const A = netMap(entry, a.x, a.y), B = netMap(entry, b.x, b.y);
        ctx.strokeStyle = rgba(col, al);
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      };
      Object.keys(P).forEach(id => {
        const p = P[id]; if(!p || p.removed) return;
        (p.ties || []).forEach(tid => { if(id < tid) edge(p, P[tid], CLR.teal, .09); });
      });
      ctx.setLineDash([3 * kScale, 12 * kScale]);
      ctx.lineDashOffset = t * 18 * kScale;
      ((state.informal) || []).forEach(k => {
        const pr = k.split('|');
        if(pr.length === 2) edge(P[pr[0]], P[pr[1]], CLR.mint, .07);
      });
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      /* 环境脉冲：图上随机一条边偶尔泛起 faint 能量流 */
      if(Math.random() < .016){
        const ids = Object.keys(P).filter(id => { const p = P[id]; return p && !p.removed && p.ties && p.ties.length; });
        if(ids.length){
          const a = ids[Math.floor(Math.random() * ids.length)];
          const tids = P[a].ties.filter(x => P[x] && !P[x].removed);
          if(tids.length) netPulse(entry, a, tids[Math.floor(Math.random() * tids.length)], CLR.teal, .45);
        }
      }
    }

    /* 图整体 3D 视差倾斜（指针驱动，layout 尺寸做基准避免反馈） */
    if(!COARSE && !REDUCE){
      const lw = wrap.offsetWidth || r.width, lh = wrap.offsetHeight || r.height;
      const tRX = entry.ptr.inside ? ((entry.ptr.y / lh) - .5) * -3.4 : 0;
      const tRY = entry.ptr.inside ? ((entry.ptr.x / lw) - .5) * 3.4 : 0;
      entry.tiltX = (entry.tiltX || 0) + (tRX - (entry.tiltX || 0)) * .05;
      entry.tiltY = (entry.tiltY || 0) + (tRY - (entry.tiltY || 0)) * .05;
      wrap.style.transform = `perspective(1200px) rotateX(${entry.tiltX.toFixed(2)}deg) rotateY(${entry.tiltY.toFixed(2)}deg)`;
    }

    /* 1) 节点光晕（加色混合） */
    if(!LOW){
      ctx.globalCompositeOperation = 'lighter';
      Object.keys(P).forEach(id => {
        const p = P[id]; if(!p || p.removed || typeof p.x !== 'number') return;
        if(hoverNode && !nbr[id] && id !== 'pm') return;      /* 悬停淡出无关节点 */
        const seed = entry.seeds[id] || (entry.seeds[id] = Math.random() * TAU);
        const breath = .5 + .5 * Math.sin(t * 1.4 + seed);
        const s = netMap(entry, p.x, p.y);
        const ox = (offs[id] ? offs[id][0] : 0), oy = (offs[id] ? offs[id][1] : 0);
        const x = s[0] + ox, y = s[1] + oy;
        const hot = (typeof state !== 'undefined') && (state.focusedNode === id || (state.selectedTargets || []).indexOf(id) >= 0);
        const influenced = state.softened && state.softened[id];
        let col = CLR.teal, base = .10 + breath * .06;
        if(p.status === 4){ col = CLR.green; base = .16 + breath * .10; }
        else if(p.status === 3){ col = CLR.bright; base = .13 + breath * .08; }
        if(influenced){ col = CLR.mint; base = Math.max(base, .12 + breath * .08); }
        if(hot){ base *= 1.9; }
        const rad = (hot ? 44 : 30) * kScale * (0.9 + breath * .12);
        if(rad < 4) return;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, rgba(col, Math.min(.5, base)));
        g.addColorStop(.55, rgba(col, base * .35));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
    }

    /* 2) 冲击波 */
    for(let i = entry.waves.length - 1; i >= 0; i--){
      const wv = entry.waves[i];
      const p = P[wv.id]; if(!p){ entry.waves.splice(i,1); continue; }
      const s = netMap(entry, p.x, p.y);
      wv.r += 2.4; wv.alpha *= .94;
      if(wv.alpha < .02){ entry.waves.splice(i,1); continue; }
      ctx.strokeStyle = rgba(wv.color, wv.alpha);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s[0], s[1], wv.r * kScale, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgba(wv.color, wv.alpha * .4);
      ctx.beginPath(); ctx.arc(s[0], s[1], wv.r * kScale * .72, 0, TAU); ctx.stroke();
    }

    /* 3) 能量脉冲（粒子流 + 拖尾，沿曲线 from→to） */
    for(let i = entry.pulses.length - 1; i >= 0; i--){
      const pu = entry.pulses[i];
      const pa = P[pu.a], pb = P[pu.b];
      if(!pa || !pb){ entry.pulses.splice(i,1); continue; }
      pu.t += pu.speed * (LOW ? 1.35 : 1);
      if(pu.t >= 1){
        netWave(entry, pu.b, pu.color, .8 * pu.power);
        entry.pulses.splice(i,1); continue;
      }
      const A = netMap(entry, pa.x, pa.y), B = netMap(entry, pb.x, pb.y);
      const mx = (A[0]+B[0])/2, my = (A[1]+B[1])/2;
      const dx = B[0]-A[0], dy = B[1]-A[1];
      const len = Math.max(1, Math.hypot(dx,dy));
      const nx = mx - dy/len * len * .18, ny = my + dx/len * len * .18;   /* 控制点：弯出弧线 */
      const tt = easeOut(pu.t);
      const x = (1-tt)*(1-tt)*A[0] + 2*(1-tt)*tt*nx + tt*tt*B[0];
      const y = (1-tt)*(1-tt)*A[1] + 2*(1-tt)*tt*ny + tt*tt*B[1];
      /* 拖尾：沿贝塞尔回退三点 */
      ctx.globalCompositeOperation = 'lighter';
      for(let k = 3; k >= 0; k--){
        const tk = Math.max(0, tt - k * .045);
        const xk = (1-tk)*(1-tk)*A[0] + 2*(1-tk)*tk*nx + tk*tk*B[0];
        const yk = (1-tk)*(1-tk)*A[1] + 2*(1-tk)*tk*ny + tk*tk*B[1];
        const rr = (4.2 - k) * kScale * pu.power;
        if(rr <= 0) continue;
        const g = ctx.createRadialGradient(xk, yk, 0, xk, yk, rr * 2.2);
        g.addColorStop(0, rgba(pu.color, .5 - k * .1));
        g.addColorStop(1, rgba(pu.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(xk, yk, rr * 2.2, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    /* 4) 回合分数浮字（升/降，向上飘后淡出） */
    if(entry.floats.length){
      const fdt = Math.min(.05, (now - (entry._fNow || now)) / 1000);
      entry._fNow = now;
      for(let i = entry.floats.length - 1; i >= 0; i--){
        const f = entry.floats[i];
        const fp = P[f.id];
        if(!fp){ entry.floats.splice(i,1); continue; }
        f.t += fdt;
        const life = 1.6;
        if(f.t > life){ entry.floats.splice(i,1); continue; }
        const fs = netMap(entry, fp.x, fp.y);
        const a = f.t < .15 ? f.t / .15 : 1 - (f.t - .15) / (life - .15);
        const fy = fs[1] - 14 - f.t * 26;
        ctx.font = '700 12px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = rgba(f.color, .85 * a); ctx.shadowBlur = 7;
        ctx.fillStyle = 'rgba(4,12,18,' + (.9 * a).toFixed(2) + ')';
        ctx.fillText(f.txt, fs[0], fy);
        ctx.fillStyle = rgba(f.color, a);
        ctx.fillText(f.txt, fs[0], fy);
        ctx.shadowBlur = 0;
      }
    }
    if(!entry.waves.length) entry.hasWave = false;
    if(!entry.pulses.length) entry.hasPulse = false;
  });
}

/* 包装 drawNetwork：重建后刷新光晕层基准 */
if(typeof drawNetwork === 'function'){
  const _draw = drawNetwork;
  drawNetwork = function(svgId, forceView){
    _draw(svgId, forceView);
    try{ netEntry(svgId); }catch(_){ }
  };
}

/* ═══ KPI：数字滚动 + 变色脉冲 + 迷你走势 ═══════════════════ */
const kpiHist = {};   /* id -> [values] */
const kpiLast = {};   /* id -> number */
const KPI_WATCH = [
  { id:'resourcesKpi', color:CLR.bright, inv:true },   /* 资源减少 = 泛红 */
  { id:'roundKpi', color:CLR.teal },
  { id:'convertedKpi', color:CLR.green },
  { id:'credKpi', color:CLR.teal },
  { id:'pressureKpi', color:CLR.warn, inv:true },      /* 压力涨 = 泛红 */
  { id:'scoreKpi', color:CLR.gold }
];
function kpiNum(id){
  const x = elx(id); if(!x) return null;
  const v = parseFloat(String(x.textContent).replace(/[^\d.\-]/g,''));
  return isNaN(v) ? null : v;
}
function setupKpi(){
  const hud = elx('hudBar'); if(!hud) return;
  /* 初始基线 + 迷你走势画布 */
  KPI_WATCH.forEach(w => {
    const v = kpiNum(w.id); if(v !== null) kpiLast[w.id] = v;
    const x = elx(w.id);
    if(x){
      const card = x.closest('.kpi');
      if(card && !card.querySelector('canvas.fx-spark')){
        const cv = document.createElement('canvas');
        cv.className = 'fx-spark';
        card.appendChild(cv);
      }
    }
  });
  /* 拦截 setText（KPI 更新的唯一通道）：数字滚动后恢复游戏原值（保留 % 等后缀）。
     不用 MutationObserver——会和翻译引擎互相触发形成回环 */
  if(typeof setText === 'function' && !setText.__fxWrapped){
    const _setText = setText;
    const wrapped = function(id, val){
      const w = KPI_WATCH.find(q => q.id === id);
      const x = elx(id);
      const nv = parseFloat(String(val).replace(/[^\d.\-]/g, ''));
      if(!w || REDUCE || !x || isNaN(nv)){ _setText(id, val); return; }
      const ov = (kpiLast[id] !== undefined) ? kpiLast[id] : nv;
      kpiLast[id] = nv;
      pushKpiHist(id, nv);
      if(nv === ov || NO_MORPH){ _setText(id, val); return; }
      /* 弹跳 + 变色（资源/压力下降为好，其余上升为好） */
      x.classList.remove('fx-pop'); void x.offsetWidth; x.classList.add('fx-pop');
      const card = x.closest('.kpi');
      if(card){
        const good = (id === 'resourcesKpi' || id === 'pressureKpi') ? nv < ov : nv > ov;
        card.classList.remove('fx-good','fx-bad'); void card.offsetWidth;
        card.classList.add(good ? 'fx-good' : 'fx-bad');
        setTimeout(() => card.classList.remove('fx-good','fx-bad'), 850);
      }
      /* 数字直接落值（不做滚动动画——后台标签页 rAF 停摆会导致值冻结，
         弹跳+变色脉冲+迷你 sparkline 已足够传达"活"感，且都不依赖 rAF 恢复） */
      _setText(id, val);
    };
    wrapped.__fxWrapped = true;
    setText = wrapped;
  }
  addTask(drawSparks);
}
function pushKpiHist(id, v){
  const a = kpiHist[id] || (kpiHist[id] = []);
  if(a.length && a[a.length-1] === v) return;   /* 同值不重复压点 */
  a.push(v); if(a.length > 24) a.shift();
}
function drawSparks(){
  if(document.hidden) return;
  KPI_WATCH.forEach(w => {
    const cv = (elx(w.id) || {parentElement:null}).parentElement && (function(){
      const c = elx(w.id).closest('.kpi'); return c ? c.querySelector('canvas.fx-spark') : null;
    })();
    if(!cv || !cv.isConnected) return;
    const r = cv.getBoundingClientRect();
    if(r.width < 4 || r.bottom < 0 || r.top > innerHeight) return;
    if(cv.width !== Math.round(r.width * DPR)){ cv.width = Math.round(r.width * DPR); cv.height = Math.round(r.height * DPR); }
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    const a = kpiHist[w.id];
    if(!a || a.length < 2) return;
    const mn = Math.min.apply(null, a), mx = Math.max.apply(null, a);
    const span = Math.max(1, mx - mn);
    ctx.beginPath();
    a.forEach((v, i) => {
      const x = i / (a.length - 1) * cv.width;
      const y = cv.height - 3 - (v - mn) / span * (cv.height - 6);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.strokeStyle = rgba(w.color, .8); ctx.lineWidth = 1.4 * DPR; ctx.stroke();
    const lx = cv.width, lv = a[a.length-1];
    const ly = cv.height - 3 - (lv - mn) / span * (cv.height - 6);
    ctx.fillStyle = rgba(w.color, .95);
    ctx.beginPath(); ctx.arc(lx - 2, ly, 2 * DPR, 0, TAU); ctx.fill();
  });
}

/* ═══ 涟漪 / 倾斜 / 玻璃 ═════════════════════════════════════ */
function setupRipple(){
  if(REDUCE || COARSE) return;
  document.addEventListener('click', e => {
    const b = e.target.closest('.btn, .net-toggle');
    if(!b) return;
    const r = b.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * .8;
    const s = document.createElement('span');
    s.className = 'fx-ripple';
    s.style.width = s.style.height = d + 'px';
    s.style.left = (e.clientX - r.left - d/2) + 'px';
    s.style.top = (e.clientY - r.top - d/2) + 'px';
    b.appendChild(s);
    setTimeout(() => s.remove(), 650);
  }, {passive:true});
}
function setupTilt(){
  if(REDUCE || COARSE || LOW) return;
  document.addEventListener('pointermove', e => {
    const card = e.target.closest && e.target.closest('.panel, .trend-card, .round-card');
    if(card !== tiltCur){
      if(tiltCur){ tiltCur.style.transform = ''; tiltCur.classList.remove('fx-tilt'); }
      tiltCur = card;
    }
    if(!card) return;
    const r = card.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - .5) * -3.2;
    const ry = ((e.clientX - r.left) / r.width - .5) * 3.2;
    card.classList.add('fx-tilt');
    card.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  }, {passive:true});
  document.addEventListener('pointerout', e => {
    if(tiltCur && !tiltCur.contains(e.relatedTarget)){
      tiltCur.style.transform = ''; tiltCur.classList.remove('fx-tilt'); tiltCur = null;
    }
  }, {passive:true});
}
let tiltCur = null;
function setupGlass(){
  const apply = () => {
    $all('.panel, .trend-card, .round-card, .modal-card').forEach(elm => {
      if(!elm.classList.contains('fx-glass')) elm.classList.add('fx-glass');
      /* 全息扫描线/光泽层在减少动态模式下不加 */
      if(!REDUCE && !elm.classList.contains('fx-holo')) elm.classList.add('fx-holo');
    });
  };
  apply();
  const mo = new MutationObserver(() => apply());
  const app = $('.app'); if(app) mo.observe(app, { childList:true, subtree:true });
}

/* ═══ 决策页/开场 极光 ═══════════════════════════════════════ */
function setupAurora(){
  makeAurora(elx('screen-decision'), { visible: () => document.body.dataset.screen === 'decision' });
  /* 开场页：叠在 introCanvas 之下 */
  const intro = elx('screen-intro');
  if(intro){
    const cv = intro.querySelector('canvas.fx-aurora');
    if(!cv){
      makeAurora(intro, { visible: () => intro.classList.contains('active') });
    }
  }
}

/* ═══ 结局页：环形仪表 + 雷达图 ══════════════════════════════ */
function drawGauge(cv, total, grade){
  const ctx = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  const cx = w/2, cy = h/2, R = Math.min(w,h)/2 - 10 * DPR;
  const t0 = performance.now(), dur = REDUCE ? 1 : 1300;
  function frame(now){
    const t = Math.min(1, (now - t0)/dur), e = easeOut(t);
    ctx.clearRect(0,0,w,h);
    /* 轨道 */
    ctx.lineWidth = 9 * DPR; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.07)';
    ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI*.75, Math.PI*.25); ctx.stroke();
    /* 分值弧（绿→金） */
    const frac = Math.max(0, Math.min(1, total/100)) * e;
    const grad = ctx.createLinearGradient(cx-R, cy, cx+R, cy);
    grad.addColorStop(0, '#2f9e5f'); grad.addColorStop(1, '#ffd966');
    ctx.strokeStyle = grad;
    ctx.shadowColor = 'rgba(111,216,160,.55)'; ctx.shadowBlur = 14 * DPR;
    ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI*.75, -Math.PI*.75 + Math.PI*1.5*frac); ctx.stroke();
    ctx.shadowBlur = 0;
    /* 中央数字 + 评级 */
    ctx.fillStyle = '#eaf6ef';
    ctx.font = `700 ${Math.round(30*DPR)}px 'Noto Sans SC',sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(Math.round(total * e)), cx, cy - 6*DPR);
    ctx.fillStyle = grade && 'S' === grade.k ? '#ffd966' : 'rgba(159,232,192,.9)';
    ctx.font = `600 ${Math.round(13*DPR)}px 'Noto Sans SC',sans-serif`;
    ctx.fillText(grade ? grade.k : '', cx, cy + 20*DPR);
    if(t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
function drawRadar(cv, dims){
  const ctx = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  const cx = w/2, cy = h/2 + 4*DPR, R = Math.min(w,h)/2 - 22*DPR;
  const n = dims.length;
  const t0 = performance.now(), dur = REDUCE ? 1 : 1100;
  const shape = pts => { ctx.beginPath(); pts.forEach((p,i)=> i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath(); };
  function frame(now){
    const t = Math.min(1, (now - t0)/dur), e = easeOut(t);
    ctx.clearRect(0,0,w,h);
    /* 网格 */
    for(let ring = 1; ring <= 3; ring++){
      const rr = R * ring / 3;
      shape(dims.map((d,i) => {
        const a = -Math.PI/2 + i * TAU / n;
        return [cx + Math.cos(a)*rr, cy + Math.sin(a)*rr];
      }));
      ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = DPR; ctx.stroke();
    }
    /* 轴 */
    dims.forEach((d,i) => {
      const a = -Math.PI/2 + i * TAU / n;
      ctx.strokeStyle = 'rgba(255,255,255,.09)';
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*R, cy+Math.sin(a)*R); ctx.stroke();
      /* 维度点 */
      const px = cx + Math.cos(a)*R*d.frac*e, py = cy + Math.sin(a)*R*d.frac*e;
      ctx.fillStyle = rgba(CLR.bright, .95);
      ctx.beginPath(); ctx.arc(px, py, 3*DPR, 0, TAU); ctx.fill();
    });
    /* 数据面 */
    const pts = dims.map((d,i) => {
      const a = -Math.PI/2 + i * TAU / n;
      return [cx + Math.cos(a)*R*d.frac*e, cy + Math.sin(a)*R*d.frac*e];
    });
    shape(pts);
    ctx.fillStyle = 'rgba(47,158,95,.22)'; ctx.fill();
    ctx.strokeStyle = 'rgba(111,216,160,.85)'; ctx.lineWidth = 1.6*DPR; ctx.stroke();
    if(t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
function setupEndingFx(){
  if(typeof renderEndingScreen !== 'function') return;
  const _re = renderEndingScreen;
  renderEndingScreen = function(){
    _re();
    try{
      const body = elx('endingBody');
      if(!body || !body.innerHTML) return;
      try{ buildReplay(body); }catch(_){ }
      if(body.querySelector('.fx-end-charts')) return;
      const sc = scoreBreakdown();
      const box = document.createElement('div');
      box.className = 'log-item fx-end-charts';
      box.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:center">' +
        '<div style="text-align:center"><canvas class="fx-gauge" width="' + Math.round(210*DPR) + '" height="' + Math.round(180*DPR) + '" style="width:210px;height:180px"></canvas>' +
        '<div class="small muted" style="margin-top:4px">本局总积分 · 满分 100</div></div>' +
        '<div style="text-align:center"><canvas class="fx-radar" width="' + Math.round(230*DPR) + '" height="' + Math.round(200*DPR) + '" style="width:230px;height:200px"></canvas>' +
        '<div class="small muted" style="margin-top:4px">成果 · 效率 · 节奏 · 组织 · 里程碑</div></div>' +
      '</div>';
      const anchor = body.querySelector('.panel.section') || body;
      anchor.appendChild(box);
      const dims = [
        { frac: sc.parts.outcome / 66 },
        { frac: sc.parts.efficiency / 8 },
        { frac: sc.parts.pacing / 7 },
        { frac: sc.parts.org / 15 },
        { frac: sc.parts.milestone / 4 }
      ].map(d => ({ frac: Math.max(0, Math.min(1, isFinite(d.frac) ? d.frac : 0)) }));
      requestAnimationFrame(() => {
        drawRadar(box.querySelector('.fx-radar'), dims);
        drawGauge(box.querySelector('.fx-gauge'), sc.total, sc.grade);
        spawnConfetti();
      });
    }catch(_){ }
  };
}

/* ═══ 全局氛围：胶片颗粒 + 漂浮微尘（暗角在 CSS）══════════════ */
function setupAtmosphere(){
  const cv = document.createElement('canvas');
  cv.className = 'fx-atmo';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  /* 预渲染颗粒瓦片 */
  const tile = document.createElement('canvas');
  const TS = Math.max(36, Math.round(144 / DPR));   /* 瓦片保持 144 设备像素的粒度 */
  tile.width = tile.height = TS;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(TS, TS);
  for(let i = 0; i < img.data.length; i += 4){
    const v = 120 + Math.random() * 135 | 0;
    img.data[i] = img.data[i+1] = img.data[i+2] = v;
    img.data[i+3] = Math.random() * 22;
  }
  tctx.putImageData(img, 0, 0);
  let pattern = null;
  const dust = [];
  const N_DUST = LOW ? 0 : 26;
  for(let i = 0; i < N_DUST; i++){
    dust.push({
      x: Math.random(), y: Math.random(),
      z: .35 + Math.random() * .65,          /* 远近：视差与大小 */
      ph: Math.random() * TAU,
      sp: .000016 + Math.random() * .00003
    });
  }
  let t0 = performance.now();
  function frame(now){
    if(!cv.isConnected){ dropTask(frame); return; }
    const { w, h } = fitCanvas(cv);
    if(w < 2 || h < 2) return;
    ctx.clearRect(0, 0, w, h);
    if(REDUCE) return;
    /* 颗粒：两层错速漂移，透明度极低 */
    if(!LOW){
      if(!pattern) pattern = ctx.createPattern(tile, 'repeat');
      const t = (now - t0) / 1000;
      ctx.globalAlpha = .55;
      ctx.save(); ctx.translate(-((t * 7) % TS), -((t * 4.3) % TS));
      ctx.fillStyle = pattern; ctx.fillRect(0, 0, w + TS, h + TS);
      ctx.restore();
      ctx.globalAlpha = .35;
      ctx.save(); ctx.translate(-((t * 11 + 60) % TS), -((t * 6.1 + 40) % TS));
      ctx.fillStyle = pattern; ctx.fillRect(0, 0, w + TS, h + TS);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    /* 微尘：缓慢上浮 + 左右摇摆，加法混合发出微光 */
    if(dust.length){
      ctx.globalCompositeOperation = 'lighter';
      const t = now / 1000;
      dust.forEach(d => {
        d.y -= d.sp * 16 * (1 + d.z);
        if(d.y < -.02){ d.y = 1.02; d.x = Math.random(); }
        const x = (d.x + Math.sin(t * .35 + d.ph) * .012) * w;
        const y = d.y * h;
        const tw = .5 + .5 * Math.sin(t * 1.1 + d.ph * 3);
        const r = 0.8 + d.z * 1.7;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.4);
        g.addColorStop(0, rgba(CLR.mint, .10 * tw * d.z));
        g.addColorStop(1, rgba(CLR.mint, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r * 3.4, 0, TAU); ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  addTask(frame);
}

/* ═══ 开场星野：缓慢漂移 + 视差 + 闪烁的星点 ═════════════════ */
function setupStarfield(){
  const intro = elx('screen-intro');
  if(!intro || REDUCE) return;
  const cv = document.createElement('canvas');
  cv.className = 'fx-aurora';
  cv.style.zIndex = '0';
  intro.insertBefore(cv, null);   /* 在已有极光层之上、内容之下 */
  const ctx = cv.getContext('2d');
  const stars = [];
  const N = LOW ? 36 : 90;
  for(let i = 0; i < N; i++){
    stars.push({
      x: Math.random(), y: Math.random(),
      z: .3 + Math.random() * .7,
      ph: Math.random() * TAU,
      r: .5 + Math.random() * 1.3
    });
  }
  const ptr = { x:.5, y:.5, tx:.5, ty:.5 };
  intro.addEventListener('pointermove', e => {
    const r = intro.getBoundingClientRect();
    ptr.tx = (e.clientX - r.left) / Math.max(1, r.width);
    ptr.ty = (e.clientY - r.top) / Math.max(1, r.height);
  }, {passive:true});
  function frame(now){
    if(!cv.isConnected){ dropTask(frame); return; }
    const on = intro.classList.contains('active');
    cv.style.opacity = on ? '1' : '0';
    if(!on) return;
    const { w, h } = fitCanvas(cv);
    if(w < 2 || h < 2) return;
    ptr.x += (ptr.tx - ptr.x) * .05; ptr.y += (ptr.ty - ptr.y) * .05;
    ctx.clearRect(0, 0, w, h);
    const t = now / 1000;
    ctx.globalCompositeOperation = 'lighter';
    stars.forEach(s => {
      s.x += .000006 * s.z; if(s.x > 1.01) s.x = -.01;
      const px = (s.x + (ptr.x - .5) * .035 * s.z) * w;
      const py = (s.y + (ptr.y - .5) * .025 * s.z) * h;
      const tw = .35 + .65 * Math.abs(Math.sin(t * (.6 + s.z) + s.ph));
      const col = s.z > .75 ? CLR.mint : CLR.teal;
      ctx.fillStyle = rgba(col, .5 * tw * s.z);
      ctx.beginPath(); ctx.arc(px, py, s.r * s.z, 0, TAU); ctx.fill();
      if(s.z > .8 && tw > .8){
        ctx.fillStyle = rgba(col, .12 * tw);
        ctx.beginPath(); ctx.arc(px, py, s.r * s.z * 3, 0, TAU); ctx.fill();
      }
    });
    ctx.globalCompositeOperation = 'source-over';
  }
  addTask(frame);
}

/* ═══ 指针辉光（桌面端）══════════════════════════════════════ */
function setupCursorGlow(){
  if(REDUCE || COARSE || LOW) return;
  const d = document.createElement('div');
  d.className = 'fx-cursor';
  document.body.appendChild(d);
  const cur = { x: innerWidth/2, y: innerHeight/2, tx: innerWidth/2, ty: innerHeight/2, on: 0, ton: 0 };
  document.addEventListener('pointermove', e => { cur.tx = e.clientX; cur.ty = e.clientY; cur.ton = 1; }, {passive:true});
  document.addEventListener('pointerleave', () => { cur.ton = 0; });
  function frame(){
    if(!d.isConnected){ dropTask(frame); return; }
    cur.x += (cur.tx - cur.x) * .16; cur.y += (cur.ty - cur.y) * .16;
    cur.on += (cur.ton - cur.on) * .08;
    d.style.opacity = String(Math.max(0, cur.on * .9).toFixed(2));
    d.style.transform = `translate(${cur.x - 115}px,${cur.y - 115}px)`;
  }
  addTask(frame);
}

/* ═══ 屏幕切换：涟漪擦除 ═════════════════════════════════════ */
function setupWipe(){
  if(REDUCE) return;
  let last = document.body.dataset.screen;
  const mo = new MutationObserver(() => {
    const s = document.body.dataset.screen;
    if(s === last) return;
    last = s;
    const d = document.createElement('div');
    d.className = 'fx-wipe';
    d.innerHTML = '<i></i>';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 750);
  });
  mo.observe(document.body, { attributes:true, attributeFilter:['data-screen'] });
}

/* ═══ 结局礼花：积分揭晓时的粒子爆发 ═════════════════════════ */
function spawnConfetti(){
  if(REDUCE || LOW) return;
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9982';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const cols = [CLR.bright, CLR.mint, CLR.green, CLR.teal, CLR.gold];
  const parts = [];
  for(let i = 0; i < 130; i++){
    parts.push({
      x: .5 + (Math.random() - .5) * .5,
      y: -.05 - Math.random() * .25,
      vx: (Math.random() - .5) * .0032,
      vy: .0018 + Math.random() * .0028,
      rot: Math.random() * TAU, vr: (Math.random() - .5) * .25,
      w: 3 + Math.random() * 4, h: 2 + Math.random() * 3,
      col: cols[i % cols.length], ph: Math.random() * TAU
    });
  }
  const t0 = performance.now();
  function frame(now){
    if(!cv.isConnected){ dropTask(frame); return; }
    const el = (now - t0) / 1000;
    const { w, h } = fitCanvas(cv);
    ctx.clearRect(0, 0, w, h);
    let alive = false;
    ctx.globalCompositeOperation = 'lighter';
    parts.forEach(p => {
      p.vy += .000012;                                  /* 轻重力 */
      p.vx *= .995;
      p.x += p.vx + Math.sin(el * 2.2 + p.ph) * .0004;  /* 摇摆 */
      p.y += p.vy;
      p.rot += p.vr * .02;
      if(p.y > 1.05 || el > 5.5) return;
      alive = true;
      const fade = el < 3.2 ? 1 : Math.max(0, 1 - (el - 3.2) / 1.6);
      const px = p.x * w, py = p.y * h;
      ctx.save();
      ctx.translate(px, py); ctx.rotate(p.rot);
      ctx.fillStyle = rgba(p.col, .75 * fade);
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    ctx.globalCompositeOperation = 'source-over';
    if(!alive || el > 6){ cv.remove(); dropTask(frame); }
  }
  addTask(frame);
}

/* ═══ 结局页：战局回放（逐回合动画：动作如何沿网络扩散）══════ */
const RP = {
  built:false, playing:false, ended:false, t:0,
  dur: LOW ? 1.5 : 1.9, R:0, hist:null, statusAt:null,
  fired:{}, pulses:[], floats:[], waves:[], flash:{},
  cv:null, ctx:null, btn:null, barFill:null, lastNow:0
};
function rpLayout(){
  const r = RP.cv.getBoundingClientRect();
  const bw = Math.min(r.width / VB.w, r.height / VB.h);
  return { r, bw, cx:(r.width - VB.w*bw)/2, cy:(r.height - VB.h*bw)/2 };
}
function rpPos(id, L){
  const p = state.people[id]; if(!p) return [0,0];
  L = L || rpLayout();
  return [ L.cx + (p.x - VB.x)*L.bw, L.cy + (p.y - VB.y)*L.bw ];
}
function rpStatusColor(st, removed){
  if(removed) return [120,130,138];
  if(st === 4) return CLR.green;
  if(st === 3) return CLR.bright;
  if(st === 2) return CLR.teal;
  if(st === 1) return [120,150,160];
  return [90,105,115];
}
function resetReplayOverlays(){
  RP.pulses = []; RP.floats = []; RP.waves = []; RP.flash = {}; RP.fired = {};
  RP.ended = false;
}
function syncReplayBtn(){
  if(!RP.btn) return;
  RP.btn.textContent = RP.ended ? '↻ 重新播放' : (RP.playing ? '⏸ 暂停' : '▶ 播放');
}
function seekReplay(t){
  RP.t = Math.max(0, Math.min(t, RP.R * RP.dur));
  resetReplayOverlays();
  const upto = Math.floor(RP.t / RP.dur);
  for(let r = 0; r < upto; r++) RP.fired[r] = true;
  if(RP.t >= RP.R * RP.dur - .01){ RP.playing = false; RP.ended = true; }
  syncReplayBtn();
}
function rpBestSource(id, r){
  const P = state.people, me = P[id]; if(!me) return null;
  let best = null, bs = -1;
  const consider = nid => {
    const p = P[nid]; if(!p || nid === id || p.removed) return;
    const st = (RP.statusAt[r] && RP.statusAt[r][nid]) || 0;
    if(st > bs){ bs = st; best = nid; }
  };
  (me.ties || []).forEach(consider);
  ((state.informal) || []).forEach(k => {
    const pr = k.split('|');
    if(pr[0] === id) consider(pr[1]);
    if(pr[1] === id) consider(pr[0]);
  });
  return best;
}
function fireRound(r){
  const h = RP.hist[r], P = state.people;
  const tIds = h.targetIds || [];
  tIds.forEach(id => { if(P[id] && !P[id].removed) RP.pulses.push({ a:'pm', b:id, t:0, col:CLR.mint, power:1 }); });
  const pp = h.perPerson || {};
  const L = rpLayout();
  Object.keys(pp).forEach(id => {
    const p = P[id]; if(!p) return;
    const ef = pp[id];
    const pos = rpPos(id, L);
    if(ef.d){
      RP.floats.push({ x:pos[0], y:pos[1]-10, txt:(ef.d > 0 ? '+' : '') + ef.d,
        col: ef.d > 0 ? CLR.bright : CLR.danger, t0: performance.now() });
    }
    if(ef.from !== undefined && ef.to !== ef.from){
      RP.waves.push({ x:pos[0], y:pos[1], r:6, alpha:.9,
        col: ef.to > ef.from ? CLR.gold : CLR.danger });
      RP.flash[id] = { t0: performance.now(), col: ef.to > ef.from ? CLR.gold : CLR.danger };
      /* 被网络带动（未被点名却受影响）：从最强的已转化邻居引来一束微光 */
      if(tIds.indexOf(id) < 0){
        const src = rpBestSource(id, r) || 'pm';
        RP.pulses.push({ a:src, b:id, t:0, col: ef.d >= 0 ? CLR.bright : CLR.warn, power:.55 });
      }
    }
  });
}
function buildReplay(body){
  if(RP.built && RP.cv && RP.cv.isConnected) return;
  if(RP.built && RP.cv && !RP.cv.isConnected){ RP.built = false; dropTask(replayFrame); }
  RP._auto = false;
  const hist = (typeof state !== 'undefined' && state.history) || [];
  if(!hist.length) return;
  RP.hist = hist; RP.R = hist.length;
  /* 状态时间线：从终态倒推每回合开始时的状态 */
  const finalS = {};
  Object.keys(state.people).forEach(id => {
    finalS[id] = state.people[id] ? state.people[id].status : 0;
  });
  RP.statusAt = new Array(RP.R + 1);
  RP.statusAt[RP.R] = finalS;
  for(let r = RP.R - 1; r >= 0; r--){
    const prev = Object.assign({}, RP.statusAt[r + 1]);
    const pp = hist[r].perPerson || {};
    Object.keys(pp).forEach(id => { if(pp[id].from !== undefined) prev[id] = pp[id].from; });
    RP.statusAt[r] = prev;
  }
  const box = document.createElement('div');
  box.className = 'log-item fx-replay';
  box.innerHTML =
    '<div class="fx-replay-head"><div>' +
      '<div class="fx-replay-title">战局回放</div>' +
      '<div class="small muted">每个动作如何在关系网里扩散——亮点是被网络带动的人</div>' +
    '</div><button class="btn fx-replay-btn" type="button">▶ 播放</button></div>' +
    '<div class="fx-replay-stage"><canvas class="fx-replay-cv"></canvas>' +
    '<div class="fx-replay-track"><i></i></div></div>';
  body.insertBefore(box, body.firstChild);
  RP.cv = box.querySelector('canvas');
  RP.ctx = RP.cv.getContext('2d');
  RP.btn = box.querySelector('.fx-replay-btn');
  RP.barFill = box.querySelector('.fx-replay-track i');
  const track = box.querySelector('.fx-replay-track');
  track.addEventListener('click', e => {
    const r = track.getBoundingClientRect();
    seekReplay((e.clientX - r.left) / Math.max(1, r.width) * RP.R * RP.dur);
    RP.playing = !RP.ended;
    syncReplayBtn();
  });
  RP.btn.addEventListener('click', () => {
    if(RP.ended){ seekReplay(0); RP.playing = true; }
    else RP.playing = !RP.playing;
    syncReplayBtn();
  });
  RP.built = true;
  if(REDUCE){ RP.btn.style.display = 'none'; seekReplay(RP.R * RP.dur); }
  else if('IntersectionObserver' in window){
    const io = new IntersectionObserver(en => {
      en.forEach(x => {
        if(x.isIntersecting && !RP._auto){ RP._auto = true; RP.playing = true; syncReplayBtn(); }
      });
    }, { threshold:.3 });
    io.observe(box);
  }
  seekReplay(REDUCE ? RP.R * RP.dur : 0);
  addTask(replayFrame);
}
function replayFrame(now){
  if(!RP.cv || !RP.cv.isConnected){ dropTask(replayFrame); return; }
  const box = RP.cv.closest('.fx-replay');
  if(!box) { dropTask(replayFrame); return; }
  const br = box.getBoundingClientRect();
  if(br.bottom < 0 || br.top > innerHeight || document.hidden){ RP.lastNow = now; return; }
  const { w, h } = fitCanvas(RP.cv);
  const ctx = RP.ctx;
  ctx.clearRect(0, 0, w, h);
  const P = (typeof state !== 'undefined') ? state.people : null;
  if(!P) return;
  const dt = RP.lastNow ? Math.min(.06, (now - RP.lastNow) / 1000) : 0;
  RP.lastNow = now;
  if(RP.playing && !REDUCE){
    RP.t += dt;
    if(RP.t >= RP.R * RP.dur){
      RP.t = RP.R * RP.dur; RP.playing = false; RP.ended = true; syncReplayBtn();
    }
  }
  const rr = Math.max(0, Math.min(RP.R - 1, Math.floor(RP.t / RP.dur)));
  const phase = RP.t / RP.dur - rr;
  const fireAt = LOW ? .3 : .42;
  if(!REDUCE && !RP.fired[rr] && phase >= fireAt){ RP.fired[rr] = true; fireRound(rr); }

  const L = rpLayout();
  const curStatus = RP.statusAt[RP.fired[rr] ? Math.min(RP.R, rr + 1) : rr] || RP.statusAt[RP.R];
  const t = now / 1000;

  /* 边 */
  const seen = {};
  ctx.lineWidth = 1;
  Object.keys(P).forEach(id => {
    const p = P[id]; if(!p || typeof p.x !== 'number') return;
    (p.ties || []).forEach(tid => {
      if(id >= tid || !P[tid]) return;
      const key = id + '|' + tid;
      if(seen[key]) return; seen[key] = 1;
      const A = rpPos(id, L), B = rpPos(tid, L);
      ctx.strokeStyle = rgba(CLR.teal, .16);
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
    });
  });
  ((state.informal) || []).forEach(k => {
    const pr = k.split('|');
    if(pr.length !== 2 || seen[k] || !P[pr[0]] || !P[pr[1]]) return;
    seen[k] = 1;
    const A = rpPos(pr[0], L), B = rpPos(pr[1], L);
    ctx.strokeStyle = rgba(CLR.mint, .12);
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
    ctx.setLineDash([]);
  });

  /* 脉冲（能量沿弧线流动） */
  for(let i = RP.pulses.length - 1; i >= 0; i--){
    const pu = RP.pulses[i];
    const pa = P[pu.a], pb = P[pu.b];
    if(!pa || !pb){ RP.pulses.splice(i, 1); continue; }
    pu.t += dt / 1.05;
    if(pu.t >= 1){
      RP.waves.push({ x:rpPos(pu.b, L)[0], y:rpPos(pu.b, L)[1], r:5, alpha:.55, col:pu.col });
      RP.pulses.splice(i, 1); continue;
    }
    const A = rpPos(pu.a, L), B = rpPos(pu.b, L);
    const mx = (A[0]+B[0])/2, my = (A[1]+B[1])/2;
    const dx = B[0]-A[0], dy = B[1]-A[1];
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = mx - dy/len*len*.18, ny = my + dx/len*len*.18;
    const tt = easeOut(pu.t);
    ctx.globalCompositeOperation = 'lighter';
    for(let k = 3; k >= 0; k--){
      const tk = Math.max(0, tt - k * .05);
      const xk = (1-tk)*(1-tk)*A[0] + 2*(1-tk)*tk*nx + tk*tk*B[0];
      const yk = (1-tk)*(1-tk)*A[1] + 2*(1-tk)*tk*ny + tk*tk*B[1];
      const rr2 = (4.5 - k) * pu.power;
      const g = ctx.createRadialGradient(xk, yk, 0, xk, yk, rr2 * 2.4);
      g.addColorStop(0, rgba(pu.col, .55 - k * .11));
      g.addColorStop(1, rgba(pu.col, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(xk, yk, rr2 * 2.4, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* 冲击波 */
  for(let i = RP.waves.length - 1; i >= 0; i--){
    const wv = RP.waves[i];
    wv.r += 46 * dt; wv.alpha *= Math.pow(.02, dt);
    if(wv.alpha < .02){ RP.waves.splice(i, 1); continue; }
    ctx.strokeStyle = rgba(wv.col, wv.alpha);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(wv.x, wv.y, wv.r, 0, TAU); ctx.stroke();
  }

  /* 节点 */
  const rad = Math.max(6, 13 * L.bw);
  Object.keys(P).forEach(id => {
    const p = P[id]; if(!p || typeof p.x !== 'number') return;
    const pos = rpPos(id, L);
    const st = curStatus[id] !== undefined ? curStatus[id] : (p.status || 0);
    const col = rpStatusColor(st, p.removed);
    const isPm = id === 'pm';
    /* 光晕 */
    if(!LOW && (isPm || st >= 3) && !p.removed){
      ctx.globalCompositeOperation = 'lighter';
      const gr = rad * (isPm ? 3 : 2.4);
      const g = ctx.createRadialGradient(pos[0], pos[1], 0, pos[0], pos[1], gr);
      g.addColorStop(0, rgba(isPm ? CLR.gold : col, isPm ? .22 : .14 + .05 * Math.sin(t * 2 + pos[0])));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(pos[0], pos[1], gr, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.beginPath();
    ctx.arc(pos[0], pos[1], isPm ? rad * 1.25 : rad, 0, TAU);
    ctx.fillStyle = p.removed ? 'rgba(20,28,34,.9)' : rgba(col, st >= 2 ? .28 : .16);
    ctx.fill();
    ctx.lineWidth = isPm ? 2.2 : 1.6;
    ctx.strokeStyle = rgba(isPm ? CLR.gold : col, p.removed ? .4 : .95);
    if(p.removed) ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    /* 转化闪光环 */
    const fl = RP.flash[id];
    if(fl){
      const age = (now - fl.t0) / 1000;
      if(age < 1.2){
        ctx.strokeStyle = rgba(fl.col, .8 * (1 - age / 1.2));
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(pos[0], pos[1], rad + 4 + age * 16, 0, TAU); ctx.stroke();
      } else delete RP.flash[id];
    }
    /* 名字 */
    ctx.fillStyle = 'rgba(214,232,224,.6)';
    ctx.font = '9.5px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(TXT(p.name || id), pos[0], pos[1] + rad + 3);
  });

  /* 浮动分数 */
  for(let i = RP.floats.length - 1; i >= 0; i--){
    const f = RP.floats[i];
    const age = (now - f.t0) / 1000;
    if(age > 1.3){ RP.floats.splice(i, 1); continue; }
    ctx.fillStyle = rgba(f.col, 1 - age / 1.3);
    ctx.font = '700 12px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(f.txt, f.x, f.y - age * 30);
  }

  /* 回合标注 */
  const hh = RP.hist[rr];
  ctx.fillStyle = 'rgba(214,232,224,.85)';
  ctx.font = '600 12.5px sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText((rr + 1) + '/' + RP.R + ' · ' + TXT(hh.actionLabel || ''), 12, 10);

  if(RP.barFill) RP.barFill.style.width = (RP.t / (RP.R * RP.dur) * 100).toFixed(1) + '%';
}

/* ═══ 启动 ═══════════════════════════════════════════════════ */
function boot(){
  try{ setupAurora(); }catch(_){ }
  try{ netEntry('networkSvg'); netEntry('networkSvg2'); }catch(_){ }
  try{ setupKpi(); }catch(_){ }
  try{ setupRipple(); }catch(_){ }
  try{ setupTilt(); }catch(_){ }
  try{ setupGlass(); }catch(_){ }
  try{ setupEndingFx(); }catch(_){ }
  try{ setupNetCinematic(); }catch(_){ }
  try{ setupAtmosphere(); }catch(_){ }
  try{ setupStarfield(); }catch(_){ }
  try{ setupCursorGlow(); }catch(_){ }
  try{ setupWipe(); }catch(_){ }
  /* 网络页/决策页切换后 svg 可能重建，兜底巡检 */
  if(typeof showScreen === 'function'){
    const _ss = showScreen;
    showScreen = function(name){ _ss(name); try{
      netEntry('networkSvg'); netEntry('networkSvg2');
      if(name === 'log' || name === 'ending'){ /* 图表已在对应渲染函数内升级 */ }
    }catch(_){ } };
  }
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
