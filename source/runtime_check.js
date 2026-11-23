/* Simulate RUNTIME node-level translation: feed concrete rendered strings
   (what the DOM text nodes will actually contain) through the same engine logic. */
const fs = require('fs');
const dict = JSON.parse(fs.readFileSync('dict-merged.json', 'utf8'));

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
  mk(/^([\d]+)轮$/, ['', ' rounds']),
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

/* concrete runtime strings (sample values filled in) */
const cases = [
  // pass-tag variants (text nodes split by <b>)
  ['🎯 第 6 回合过线（节奏分定格 5/7），之后选择', 'pass-tag push node1'],
  ['继续推进', 'pass-tag push <b>'],
  ['3 回合——深推阶段动作效果一路降到 ×0.55', 'pass-tag push node3'],
  ['🎯 第 6 回合过线，选择', 'pass-tag stop node1'],
  ['收工结算', 'pass-tag stop <b>'],
  ['——知道什么时候停', 'pass-tag stop node3'],
  ['🎯 第 6 回合过线（资源刚好用尽，没来得及做选择）', 'pass-tag exhausted'],
  // score rows
  ['成果分 · 完全配合 9 人（达标线 6 人，每多 1 人 +3）', 'score outcome'],
  ['效率分 · 剩余 4/24 资源（满分 8）', 'score efficiency'],
  ['组织分 · (可信度 7 − 压力 4) × 5（满分 15）', 'score org'],
  ['里程碑分 · 3 个关键节点 × 1（满分 4）', 'score milestone'],
  ['节奏分 · 第 6 回合到达标线（定格，基准 12 回合，满分 7）', 'score pacing pass'],
  ['节奏分 · 用了 14 回合（基准 12 回合，每多 2 回合 −1，满分 7）', 'score pacing fail'],
  // trust list item
  ['张三 ↔ 李四（信任 3）', 'trust li'],
  // leftovers summary
  ['📋 过程细节（3 条）', 'leftovers summary'],
  // pc-title
  ['🎯 你已经跨过 50% 达标线（6/12 人完全配合）', 'pc-title'],
  // passChoice bullets
  ['✅ 收工', 'pc b1'],
  ['：按现在结算 ', 'pc node after b1'],
  ['42 分', 'pc total pts'],
  ['🔧 继续', 'pc b2'],
  ['：', 'pc colon'],
  ['还能多拿什么', 'pc b3'],
  ['——每多推 1 人，成果分 +3；', 'pc gain1'],
  ['组织分按完全配合的比例算，人越多越高（现在是 6/12 人）。', 'pc gain2'],
  ['节奏分已经', 'pc pace1'],
  ['定格在 5/7', 'pc pace b'],
  ['（你在第 6 回合过的线），之后不再扣——过线之后考的不是速度，是余量。', 'pc pace2'],
  ['（成果 20 ＋ 效率 5 ＋ 节奏 7 ＋ 组织 10 ＋ 里程碑 4）。', 'settle breakdown'],
  // demo mode
  ['🔧 演示模式 · 3 人的说服度抬到 8 分，其中 1 人升了一档。原本就在 8 分以上的人保持不变。', 'demo line'],
  // log page
  ['第 3 回合 · ', 'log head node'],
  ['对象：张三、李四 · 消耗 2 资源 · 剩余 5 资源', 'log targets'],
  ['对象：（面向全体） · 消耗 3 资源 · 剩余 5 资源', 'log targets all'],
  ['📜 完整决策日志（共 8 个回合）', 'log title'],
  ['尚未有决策记录。', 'log empty'],
  // case chip
  ['🎤 案例 2', 'case chip'],
  ['🎤 案例 0 · 半成品 1', 'case chip half'],
  // cooldown chips
  ['⏳ 冷却2轮', 'cooldown chip'],
  // celebrate
  ['本轮 3 个人一起跨过这条线。他们不再只是「不反对」——开始主动替这件事说话，也愿意为它担责任。', 'celebrate multi'],
  // diffusion zone
  ['⚡ 处于扩散影响圈（来自 张三）：剩 2 回合', 'diffusion zone'],
  // bridge chip
  ['🌉 桥梁节点（ties 5）', 'bridge chip'],
  // cred cost line
  ['⚠️ 代价：可信度 −2（现 8）、压力 +3（现 5）。', 'cost line'],
  ['⚠️ 代价：可信度 −2（现 8）、压力 +3（现 5）、额外 2 份资源。', 'cost line +res'],
  // target label
  ['定向推动 3 人 · 消耗 2 资源', 'targeted push'],
  ['全员覆盖 · 消耗 4 资源', 'all cover'],
  // intel locked hint
  ['🔒 隐藏目标与动作偏好：未知。先做一次「信息打探」——一次只问一个人，才问得深。', 'locked hint'],
  // replaced box
  ['你裁掉了 2 个人：张三、李四', 'replaced names'],
  // 未结局 section (in-page?)
  ['未结局。已进入第 4 回合，剩余 9 资源。', 'unfinished'],
  // misc fragments
  ['「信任」和「偏好」', 'quote pair'],
  ['等 3 人', 'and N more'],
  ['+3 分', 'plus pts'],
  ['32 分', 'pts with space'],
  ['1–2 人', 'range people'],
  ['第 5 回合', 'round label'],
  ['回合0', 'axis round'],
  ['8 回合', 'pie rounds'],
  ['18分', 'bare points'],
  ['你只走了「沟通」和「验证」，没碰「赋能」和「制度」。这是变革做一半最常见的形态：前半程靠个人魅力推得动，后半程要靠机制接住——接不住，人一走就回原样。', 'half-way debrief'],
  ['🤝 一起待过就算「一起做事」：张三↔李四 +2、王五↔赵六 +1（信任）。', 'grown line'],
  ['3 个人离下一档只差 1-8 分：张三（差 4）、李四（差 6） 等。这个位置最亏——你已经付了 90% 的成本，却没拿到那一档。下一轮把定向动作压到他们身上，比开新战场划算得多。', 'near tier'],
  ['🤝 张三 ↔ 李四 信任 +2——一起备课、答疑，比任何动作都长得快。', 'trust gain'],
];
const badRe = /[一-鿿〰-ヿ＀-￯]/;
let fails = 0;
for(const [s, label] of cases){
  const out = translateString(s);
  const fin = out == null ? s : out;
  const bad = badRe.test(fin);
  if(bad) fails++;
  console.log((bad ? 'FAIL' : 'ok  ') + ' | ' + label + '\n     ZH: ' + s + '\n     EN: ' + fin);
}
console.log('\nFAILS: ' + fails + '/' + cases.length);
