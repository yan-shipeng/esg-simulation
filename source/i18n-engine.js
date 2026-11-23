/* ══════════════ i18n engine (ZH⇄EN runtime translator) ══════════════
   Non-invasive: game logic keeps Chinese internally; this layer translates
   rendered DOM text when English is selected, and restores originals for Chinese. */
(function(){
'use strict';
if(window.__I18N_LOADED__) return; window.__I18N_LOADED__ = true;

const ZH_EN = Object.create(null);           // exact: full Chinese string -> English
const SEGS  = Object.create(null);           // fragment: Chinese segment -> English segment
window.__ZH_EN_SRC__ = ZH_EN; window.__ZH_SEGS__ = SEGS;

const zhRe = /[一-鿿]/;
const hasZh = s => zhRe.test(s);

/* longest-first greedy segmentation over the dictionary (exact + segs) */
let KEYS = [], KEYMAP = Object.create(null);
let PATTERNS = [];   // [{re, tpl}] built from dict keys containing ${...}
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function buildPattern(key, val){
  // key like: 你已使用 ${n} 次 —— matched MANUALLY (indexOf/endsWith), no regex:
  // anchored lazy-capture regexes like ^lit([\s\S]*?)lit([\s\S]*?)lit$ backtrack
  // catastrophically on long dynamic strings (O(n^(caps+1))) and froze the page.
  const parts = key.split(/\$\{[^}]*\}/);
  const nCaps = parts.length - 1;
  if(nCaps < 1) return null;
  // reject weak patterns: too little literal text -> they match almost anything
  const litTotal = parts.reduce((a,p)=> a + p.trim().length, 0);
  const litMax = Math.max.apply(null, parts.map(p=>p.trim().length));
  if(litTotal < 3 || litMax < 2) return null;
  const tpl = val.split(/\$\{[^}]*\}/);  // value uses $1..$n? we use positional join instead
  return { lits: parts, parts: tpl, nCaps, litLen: litTotal, tag: key.slice(0,60) };
}
/* linear-time anchored match against literal parts; returns captures or null.
   Semantics mirror ^lit1(.*?)lit2(...)$ with lazy fills: earliest occurrence for
   middle literals, and the final literal must reach the very end of the string. */
function matchLits(lits, s){
  let pos = 0;
  const first = lits[0];
  if(first){
    if(s.length < first.length || s.slice(0, first.length) !== first) return null;
    pos = first.length;
  }
  const caps = [];
  const last = lits.length - 1;
  for(let i = 1; i <= last; i++){
    const lit = lits[i];
    if(i === last){
      if(lit){
        if(s.length - pos < lit.length) return null;
        if(s.slice(s.length - lit.length) !== lit) return null;
        caps.push(s.slice(pos, s.length - lit.length));
      }else{
        caps.push(s.slice(pos));
      }
    }else if(lit === ''){
      caps.push('');   // adjacent placeholders: lazy fill captures empty
    }else{
      const idx = s.indexOf(lit, pos);
      if(idx < 0) return null;
      caps.push(s.slice(pos, idx));
      pos = idx + lit.length;
    }
  }
  return caps;
}
/* non-anchored variant: find the template's literals as a SUBSTRING of a longer
   text node. The game concatenates template pieces into single text nodes
   (e.g. `（成果 62 ＋ … 里程碑 4）。剩下的资源…`), so anchored patterns never see
   them. Returns {start, end, caps} or null. Linear time, no backtracking. */
function matchLitsLoose(lits, s, from){
  let start;
  if(lits[0]){
    start = s.indexOf(lits[0], from);
    if(start < 0) return null;
  }else{
    start = from;
    if(start > s.length) return null;
  }
  let pos = start + lits[0].length;
  const caps = [];
  for(let i = 1; i < lits.length; i++){
    const lit = lits[i];
    if(lit === ''){ caps.push(''); continue; }
    const idx = s.indexOf(lit, pos);
    if(idx < 0) return null;
    caps.push(s.slice(pos, idx));
    pos = idx + lit.length;
  }
  return {start, end: pos, caps};
}
function applyPattern(p, s){
  let caps;
  if(p.lits){ caps = matchLits(p.lits, s); if(!caps) return null; }
  else{
    const m = s.match(p.re);
    if(!m) return null;
    caps = Array.prototype.slice.call(m, 1);
  }
  let out = p.parts[0];
  for(let i = 1; i <= p.nCaps; i++){
    let cap = caps[i-1] == null ? '' : caps[i-1];
    const t = translateString(cap);
    out += (t != null ? t : cap) + (p.parts[i] != null ? p.parts[i] : '');
  }
  return out;
}

function rebuildKeys(){
  KEYS.length = 0;
  PATTERNS = [];
  const all = [];
  for(const k in ZH_EN) all.push([k, ZH_EN[k]]);
  for(const k in SEGS) if(!ZH_EN.hasOwnProperty(k)) all.push([k, SEGS[k]]);
  KEYMAP = Object.create(null);
  for(const [k,v] of all){
    if(k.indexOf('${') >= 0){
      const p = buildPattern(k, v);
      if(p) PATTERNS.push(p);
    }else{
      KEYMAP[k] = v; KEYS.push(k);
    }
  }
  KEYS.sort((a,b)=> b.length - a.length);
  // built-in numeric forms: 18分 / 3人 / 1–2人 / 2轮 / 冷却2轮 (tiny anchored regexes — safe)
  const mk = (re, parts) => ({re, parts, nCaps: parts.length - 1, litLen: re.source.length, tag: re.source.slice(0,60)});
  PATTERNS.push(
    mk(/^([\d.]+)分$/, ['', '']),
    mk(/^([\d.]+)\s+分$/, ['', ' pts']),
    mk(/^([+\-−][\d.]+)\s*分$/, ['', ' pts']),
    mk(/^([\d–-]+)人$/, ['', ' people']),
    mk(/^([\d–-]+)\s+人$/, ['', ' people']),
    mk(/^等\s*([\d]+)\s*人$/, ['and ', ' more']),
    mk(/^👤 ([\d–-]+)人$/, ['👤 ', ' people']),
    mk(/^([\d]+)轮$/, ['', ' rounds']),
    mk(/^第\s*([\d]+)\s*回合$/, ['Round ', '']),
    mk(/^回合\s*([\d]+)$/, ['R', '']),
    mk(/^([\d]+)\s*回合$/, ['', ' round(s)']),
    mk(/^冷却\s*([\d]+)\s*轮$/, ['Cooldown: ', ' rounds']),
    mk(/^([⛔⏳🔒⚠️]*)\s*冷却\s*([\d]+)\s*轮$/, ['', ' Cooldown: ', ' rounds']),
    mk(/^还需\s*([\d]+)\s*轮$/, ['', ' more round(s) needed']),
    mk(/^等\s*([\d]+)\s*轮$/, ['Wait ', ' round(s)'])
  );
  // longer templates first so specific patterns win
  PATTERNS.sort((a,b)=> b.litLen - a.litLen);
}
let segRe = null;
/* keys listed in window.__I18N_EXACT_ONLY__ stay exact-only: they translate a
   full text node that equals them, but never substring-match inside longer
   prose (short UI labels like table headers would otherwise half-translate
   sentences that have no full entry). Populated by the host page before boot. */
const EXACT_ONLY = new Set(window.__I18N_EXACT_ONLY__ || []);
function rebuildRe(){
  /* single-char CJK punctuation joins segmentation (safe: full-width marks only
     occur in Chinese prose); 1-char word keys like 你 stay exact-only */
  const PUNCT1 = new Set(['，','。','：','、','「','」','；','！','？','（','）','你']);
  const parts = KEYS.filter(k=> !EXACT_ONLY.has(k) && (k.length>=2 || PUNCT1.has(k))).map(escRe);
  segRe = parts.length ? new RegExp(parts.join('|'),'g') : null;
  window.__DBG_KEYS = KEYS; window.__DBG_SEGRE = segRe ? segRe.source.length : -1;
  window.__DBG_HAS = k => KEYS.includes(k);
}

function dictLookup(s){ return Object.prototype.hasOwnProperty.call(KEYMAP, s) ? KEYMAP[s] : null; }

/* translate one fully-rendered string; returns null when nothing applies */
function translateString(s){
  if(!s) return null;
  const exact = dictLookup(s);   // exact first: also covers punctuation-only nodes (，。：) which hasZh() would skip
  if(exact != null){ window.__DBG_LAST='exact'; return exact; }
  if(!hasZh(s)) return null;
  for(const p of PATTERNS){
    // cheap prefix prefilter for dict patterns: anchored match must start with lits[0]
    if(p.lits && p.lits[0] && !s.startsWith(p.lits[0])) continue;
    const r = applyPattern(p, s);
    if(r != null){ window.__DBG_LAST = 'pattern:' + p.tag; return r; }
  }
  /* loose pass: templates embedded INSIDE a longer text node. Dict patterns
     only (built-in numeric regexes stay anchored); skip patterns ending in a
     placeholder (span end would be ambiguous). */
  let work = s, hitLoose = false;
  for(const p of PATTERNS){
    if(!p.lits) continue;
    if(p.lits[p.lits.length-1] === '') continue;
    if(p.lits[0] && work.indexOf(p.lits[0]) < 0) continue;
    let from = 0, guard = 0;
    while(guard++ < 20){
      const m = matchLitsLoose(p.lits, work, from);
      if(!m) break;
      let rep = p.parts[0];
      for(let i = 1; i <= p.nCaps; i++){
        const cap = m.caps[i-1] == null ? '' : m.caps[i-1];
        const t = translateString(cap);
        rep += (t != null ? t : cap) + (p.parts[i] != null ? p.parts[i] : '');
      }
      work = work.slice(0, m.start) + rep + work.slice(m.end);
      from = m.start + rep.length;   // never re-scan what we just wrote
      hitLoose = true;
    }
  }
  if(!segRe){ window.__DBG_LAST = hitLoose ? 'loose' : 'null:nore'; return hitLoose ? work : null; }
  let hit = hitLoose;
  let out = work.replace(segRe, m => { hit = true; return KEYMAP[m]; });
  if(hitLoose){
    // seams left by substring replacement: sentence punctuation glued to the next word
    out = out.replace(/([.!?;)])(?=[A-Za-z])/g, '$1 ');
  }
  window.__DBG_LAST = hit ? (hitLoose ? 'loose+seg' : 'seg') : 'null';
  return hit ? out : null;
}
/* recursive translate used for already-rendered dynamic values: same thing */
function deepTranslate(s){ const r = translateString(s); return r == null ? s : r; }

/* ── DOM translation ───────────────────────────────────────────── */
const origText = new WeakMap();   // text node -> original Chinese
const origAttr = new WeakMap();   // element -> {attr: original}
const ATTRS = ['placeholder','title','aria-label','value','alt'];
const SKIP_TAGS = new Set(['SCRIPT','STYLE','CODE','PRE']);
let translating = false;

function translateTextNode(node){
  const cur = node.nodeValue;
  if(!cur || (!hasZh(cur) && !Object.prototype.hasOwnProperty.call(KEYMAP, cur.trim()))) return;
  if(!origText.has(node)) origText.set(node, cur);
  // preserve leading/trailing whitespace
  const m = cur.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const t = translateString(m[2]);
  if(t != null){
    const next = m[1] + t + m[3];
    if(next !== cur){   // never rewrite identical text: same-value writes still queue mutations
      translating = true;
      node.nodeValue = next;
      translating = false;
    }
  }
}
function translateAttrs(el){
  for(const a of ATTRS){
    const v = el.getAttribute && el.getAttribute(a);
    if(v && hasZh(v)){
      let rec = origAttr.get(el); if(!rec){ rec = {}; origAttr.set(el, rec); }
      if(!(a in rec)) rec[a] = v;
      const t = translateString(v);
      if(t != null && t !== v){ translating = true; el.setAttribute(a, t); translating = false; }
    }
  }
}
/* translate runs of per-character spans (used by entrance animations):
   e.g. <span>你</span><span>被</span><span>派</span><span>往</span><em>海外</em> */
function translateCharRuns(el){
  const kids = el.childNodes;
  const isCharItem = n => {
    if(n.nodeType === 3) return (n.nodeValue||'').trim().length === 1 && hasZh(n.nodeValue);
    if(n.nodeType === 1 && n.childNodes.length === 1 && n.firstChild.nodeType === 3){
      const v = n.firstChild.nodeValue||'';
      return v.trim().length === 1 && hasZh(v);
    }
    return false;
  };
  const textOf = n => n.nodeType === 3 ? n.nodeValue : n.firstChild.nodeValue;
  const setText = (n, v) => {
    const tn = n.nodeType === 3 ? n : n.firstChild;
    if(tn.nodeValue === v) return;   // same-value writes still queue mutations — skip
    if(!origText.has(tn)) origText.set(tn, tn.nodeValue);
    translating = true; tn.nodeValue = v; translating = false;
  };
  let run = [];
  const flush = () => {
    if(run.length >= 2){
      const joined = run.map(textOf).join('');
      const t = translateString(joined.trim());
      if(t != null){
        // inline-block spans collapse edge whitespace — use nbsp to preserve spacing
        setText(run[0], t.replace(/^ /, ' ').replace(/ $/, ' '));
        for(let i = 1; i < run.length; i++) setText(run[i], '');
      }
    }
    run = [];
  };
  for(const n of kids){
    if(isCharItem(n)) run.push(n);
    else flush();
  }
  flush();
}

function walkTranslate(root){
  if(!root) return;
  if(root.nodeType === 3){ translateTextNode(root); return; }
  if(root.nodeType !== 1 && root.nodeType !== 11 && root.nodeType !== 9) return;
  if(root.nodeType === 1){
    if(SKIP_TAGS.has(root.tagName)) return;
    translateAttrs(root);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n){
      if(!n.nodeValue) return NodeFilter.FILTER_REJECT;
      const core = n.nodeValue.trim();
      if(!hasZh(core) && !Object.prototype.hasOwnProperty.call(KEYMAP, core)) return NodeFilter.FILTER_REJECT;
      const p = n.parentElement;
      if(p && SKIP_TAGS.has(p.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  /* per-character span runs FIRST (entrance animations): aggregating before
     single-node translation prevents 1-char dict entries (e.g. 你->You) from
     consuming the first char and breaking the run's full-phrase match */
  const allEls = [];
  if(root.nodeType === 1) allEls.push(root);
  if(root.querySelectorAll) for(const e of root.querySelectorAll('*')) allEls.push(e);
  for(const e of allEls){ if(!SKIP_TAGS.has(e.tagName)) translateCharRuns(e); }
  for(const n of nodes) translateTextNode(n);
  // attributes on descendants
  if(root.querySelectorAll){
    const els = root.querySelectorAll('[placeholder],[title],[aria-label],[value],[alt]');
    for(const el of els){ if(!SKIP_TAGS.has(el.tagName)) translateAttrs(el); }
  }
}
function restoreNode(n){
  const o = origText.get(n);
  if(o != null && n.nodeValue !== o){ translating = true; n.nodeValue = o; translating = false; }
}
function walkRestore(root){
  if(!root) return;
  if(root.nodeType === 3){ restoreNode(root); return; }
  if(root.nodeType !== 1 && root.nodeType !== 11 && root.nodeType !== 9) return;
  if(root.nodeType === 1){
    const rec = origAttr.get(root);
    if(rec){ translating = true; for(const a in rec) root.setAttribute(a, rec[a]); translating = false; }
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  for(const n of nodes) restoreNode(n);
  if(root.querySelectorAll){
    const els = root.querySelectorAll('[placeholder],[title],[aria-label],[value],[alt]');
    for(const el of els){
      const rec = origAttr.get(el);
      if(rec){ translating = true; for(const a in rec) el.setAttribute(a, rec[a]); translating = false; }
    }
  }
}

/* ── language state ────────────────────────────────────────────── */
let lang = 'zh';
try{ lang = localStorage.getItem('sim_lang') || 'zh'; }catch(e){}

let observer = null;
function startObserver(){
  if(observer) return;
  observer = new MutationObserver(muts => {
    if(lang !== 'en' || translating) return;
    for(const mu of muts){
      if(mu.type === 'characterData'){
        if(mu.target && hasZh(mu.target.nodeValue||'')) translateTextNode(mu.target);
      }else if(mu.type === 'childList'){
        for(const n of mu.addedNodes){
          walkTranslate(n);
          /* entrance animations append per-char spans one by one — the walk above
             treats each span alone and can never aggregate a run; re-run the
             aggregation on the PARENT so completed titles still translate */
          const p = n.parentElement;
          if(p && !SKIP_TAGS.has(p.tagName) && p.querySelector &&
             p.querySelector(':scope > .ch')) translateCharRuns(p);
        }
      }else if(mu.type === 'attributes'){
        // re-translate changed attribute (e.g. title set by game)
        const el = mu.target, a = mu.attributeName;
        if(el && ATTRS.includes(a)){
          const v = el.getAttribute(a);
          if(v && hasZh(v)){
            let rec = origAttr.get(el); if(!rec){ rec = {}; origAttr.set(el, rec); }
            if(!(a in rec)) rec[a] = v;
            const t = translateString(v);
            if(t != null && t !== v){ translating = true; el.setAttribute(a, t); translating = false; }
          }
        }
      }
    }
  });
  observer.observe(document.body, {childList:true, subtree:true, characterData:true,
    attributes:true, attributeFilter:ATTRS});
}

const titleZh = document.title;
function applyLang(next, first){
  lang = next;
  try{ localStorage.setItem('sim_lang', lang); }catch(e){}
  document.documentElement.lang = (lang === 'en') ? 'en' : 'zh-CN';
  if(lang === 'en'){
    walkTranslate(document.body);
    document.title = translateString(titleZh) || titleZh;
  }else{
    walkRestore(document.body);
    document.title = titleZh;
  }
  const btn = document.getElementById('langToggleBtn');
  if(btn) btn.textContent = (lang === 'en') ? '中文' : 'EN';
  const introBtn = document.getElementById('langToggleIntro');
  if(introBtn) introBtn.textContent = (lang === 'en') ? '中文' : 'EN';
  /* v115：语言切换会改变标签栏按钮的字体与折行，高度可能变——复测量再定位推进栏 */
  try{ if(typeof syncTabbarMetrics === 'function') setTimeout(syncTabbarMetrics, 60); }catch(_){}
}

/* ── toggle button (persistent, fixed top-right) ───────────────── */
function ensureButton(){
  if(document.getElementById('langToggleBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'langToggleBtn';
  btn.type = 'button';
  btn.textContent = (lang === 'en') ? '中文' : 'EN';
  btn.setAttribute('aria-label', 'Switch language / 切换语言');
  btn.addEventListener('click', () => applyLang(lang === 'en' ? 'zh' : 'en'));
  /* v119：不浮动——放进顶栏操作区（没有则退回 body） */
  const host = document.getElementById('topbarActions');
  (host || document.body).appendChild(btn);
  /* v122：开场页的同款按钮——点击走同一个切换，标签由 applyLang 统一刷新 */
  const introBtn = document.getElementById('langToggleIntro');
  if(introBtn) introBtn.addEventListener('click', () => applyLang(lang === 'en' ? 'zh' : 'en'));
}

/* ── public api ────────────────────────────────────────────────── */
window.I18N = {
  get lang(){ return lang; },
  set: applyLang,
  t: deepTranslate,              // translate a fully rendered string (for canvas/pdf/export)
  rebuild(){ rebuildKeys(); rebuildRe(); }
};

/* ── boot ──────────────────────────────────────────────────────── */
function boot(){
  rebuildKeys(); rebuildRe();
  ensureButton();
  startObserver();
  if(lang === 'en') applyLang('en', true);
  else {
    const btn = document.getElementById('langToggleBtn'); if(btn) btn.textContent = 'EN';
    const ib = document.getElementById('langToggleIntro'); if(ib) ib.textContent = 'EN';
  }
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
