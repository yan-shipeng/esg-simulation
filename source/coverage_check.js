/* 覆盖检查：从 game.html 抽取中文字符串，跑与运行时相同的翻译引擎，报告未被翻译的。 */
const fs = require('fs');
const dict = JSON.parse(fs.readFileSync('dict-merged.json', 'utf8'));
const src = fs.readFileSync('game.html', 'utf8');

const zhRe = /[一-鿿]/;
const hasZh = s => zhRe.test(s);
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const KEYMAP = Object.create(null);
let PATTERNS = [];
function buildPattern(key, val){
  const parts = key.split(/\$\{[^}]*\}/);
  const nCaps = parts.length - 1;
  if(nCaps < 1) return null;
  const litTotal = parts.reduce((a,p)=> a + p.trim().length, 0);
  const litMax = Math.max.apply(null, parts.map(p=>p.trim().length));
  if(litTotal < 3 || litMax < 2) return null;
  const reSrc = '^' + parts.map(escRe).join('([\\s\\S]*?)') + '$';
  const tpl = val.split(/\$\{[^}]*\}/);
  return { re: new RegExp(reSrc), parts: tpl, nCaps };
}
function applyPattern(p, s){
  const m = s.match(p.re);
  if(!m) return null;
  let out = p.parts[0];
  for(let i = 1; i <= p.nCaps; i++){
    let cap = m[i] == null ? '' : m[i];
    const t = translateString(cap);
    out += (t != null ? t : cap) + (p.parts[i] != null ? p.parts[i] : '');
  }
  return out;
}
const KEYS = [];
for(const k in dict){
  if(k.indexOf('${') >= 0){
    const p = buildPattern(k, dict[k]);
    if(p) PATTERNS.push(p);
  }else{ KEYMAP[k] = dict[k]; KEYS.push(k); }
}
KEYS.sort((a,b)=> b.length - a.length);
const mk = (re, parts) => ({re, parts, nCaps: parts.length - 1});
PATTERNS.push(
  mk(/^([\d.]+)分$/, ['', '']),
  mk(/^([\d.]+)\s+分$/, ['', ' pts']),
  mk(/^([+\-−][\d.]+)\s*分$/, ['', ' pts']),
  mk(/^([\d–-]+)人$/, ['', ' people']),
  mk(/^([\d–-]+)\s+人$/, ['', ' people']),
  mk(/^等\s*([\d]+)\s*人$/, ['and ', ' more']),
  mk(/^👤 ([\d–-]+)人$/, ['👤 ', ' people']),
  mk(/^([\d–-]+)轮$/, ['', ' rounds']),
  mk(/^第\s*([\d]+)\s*回合$/, ['Round ', '']),
  mk(/^回合\s*([\d]+)$/, ['R', '']),
  mk(/^([\d]+)\s*回合$/, ['', ' round(s)']),
  mk(/^冷却\s*([\d]+)\s*轮$/, ['Cooldown: ', ' rounds']),
  mk(/^([⛔⏳🔒⚠️]*)\s*冷却\s*([\d]+)\s*轮$/, ['', ' Cooldown: ', ' rounds']),
  mk(/^还需\s*([\d]+)\s*轮$/, ['', ' more round(s) needed']),
  mk(/^等\s*([\d]+)\s*轮$/, ['Wait ', ' round(s)'])
);
PATTERNS.sort((a,b)=> b.re.source.length - a.re.source.length);
const PUNCT1 = new Set(['，','。','：','、','「','」','；','！','？','（','）','你']);
const segRe = new RegExp(KEYS.filter(k=>k.length>=2 || PUNCT1.has(k)).map(escRe).join('|'), 'g');
function translateString(s){
  if(!s) return null;
  if(Object.prototype.hasOwnProperty.call(KEYMAP, s)) return KEYMAP[s];
  if(!hasZh(s)) return null;
  for(const p of PATTERNS){
    if(p.re.test(s)){
      const r = applyPattern(p, s);
      if(r != null) return r;
    }
  }
  let hit = false;
  const out = s.replace(segRe, m => { hit = true; return KEYMAP[m]; });
  return hit ? out : null;
}

/* ---- 抽取候选字符串 ---- */
const cands = new Map(); // string -> firstPos
function add(s, pos){
  s = s.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\//g, '/').trim();
  if(!s || !hasZh(s) || s.length < 2) return;
  if(!cands.has(s)) cands.set(s, pos);
}
// 1) HTML 文本节点
const html = src.replace(/<script[\s\S]*?<\/script>/g, '\n').replace(/<style[\s\S]*?<\/style>/g, '\n');
const textRe = />([^<>]+)</g; let m;
while((m = textRe.exec(html))) add(m[1], m.index);
// 2) JS 字符串字面量（单双引号 + 无 ${} 的模板串）
const jsParts = [];
const jsRe = /<script[^>]*>([\s\S]*?)<\/script>/g;
while((m = jsRe.exec(src))) jsParts.push(m[1]);
for(const js of jsParts){
  const litRe = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\$]|\\.|\$(?!\{))*)`/g;
  let l;
  while((l = litRe.exec(js))){
    const s = l[1] !== undefined ? l[1] : l[2] !== undefined ? l[2] : l[3];
    add(s, l.index);
  }
}

/* ---- 检查 ---- */
const missing = [];
for(const [s, pos] of cands){
  const t = translateString(s);
  if(t === null || hasZh(t)) missing.push([pos, s, t]);
}
missing.sort((a,b)=> a[0]-b[0]);
console.log('candidates:', cands.size, '| still-Chinese after translation:', missing.length);
for(const [pos, s, t] of missing){
  console.log('---', JSON.stringify(s.length > 100 ? s.slice(0,100)+'…' : s));
}
