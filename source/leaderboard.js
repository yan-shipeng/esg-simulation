/* ══════════════ Leaderboard module (global ranking) ══════════════
   Submits the score once per finished game and shows a global leaderboard.
   All user-facing strings are Chinese; the i18n layer translates them when EN is on. */
(function(){
'use strict';
if(window.__LEADERBOARD_LOADED__) return; window.__LEADERBOARD_LOADED__ = true;

/* ── config ── set by build; API_QS carries the preview token while unpublished */
const API_BASE = window.__LEADERBOARD_API_BASE__ || '';
const API_QS   = window.__LEADERBOARD_API_QS__ || '';
const COURSE_ID = window.__LEADERBOARD_COURSE_ID__ || 'esg';

if(!API_BASE) return;   // backend URL not configured yet — module stays inert

/* ── access the game's top-level `let state` (global lexical scope, NOT window.state) ── */
function getState(){
  try{ if(typeof state !== 'undefined' && state) return state; }catch(e){}
  return window.state || null;
}
function getScore(){
  try{ if(typeof scoreBreakdown === 'function') return scoreBreakdown(); }catch(e){}
  try{ if(window.scoreBreakdown) return window.scoreBreakdown(); }catch(e){}
  return null;
}

/* ── player identity (local only) ── */
function playerId(){
  let id = null;
  try{ id = localStorage.getItem('sim_player_id'); }catch(e){}
  if(!id){
    id = (crypto.randomUUID ? crypto.randomUUID() : 'p-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
    try{ localStorage.setItem('sim_player_id', id); }catch(e){}
  }
  return id;
}

/* ── fetch helpers ── */
function joinQs(path){
  let u = API_BASE + path;
  if(API_QS){
    const bare = API_QS.replace(/^\?/, '');
    u += (path.indexOf('?') >= 0 ? '&' : '?') + bare;
  }
  return u;
}
function req(method, path, body){
  const ctl = new AbortController();
  const to = setTimeout(()=>ctl.abort(), 8000);
  return fetch(joinQs(path), {
    method,
    headers: body ? {'Content-Type':'application/json'} : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: ctl.signal
  }).finally(()=>clearTimeout(to));
}

/* ── UI: floating button ── */
function ensureButton(){
  if(document.getElementById('lbBtn')) return;
  const b = document.createElement('button');
  b.id = 'lbBtn'; b.type = 'button'; b.textContent = '🏆 积分榜';
  b.setAttribute('aria-label','全球积分榜 Global Leaderboard');
  b.addEventListener('click', openPanel);
  document.body.appendChild(b);
}

/* ── UI: modal panel ── */
function ensurePanel(){
  if(document.getElementById('lbOverlay')) return;
  const ov = document.createElement('div');
  ov.id = 'lbOverlay';
  ov.innerHTML =
    '<div class="lb-panel" role="dialog" aria-label="排行榜">' +
      '<div class="lb-head"><span class="lb-title">🌍 全球积分榜</span>' +
      '<button type="button" class="lb-close" aria-label="关闭">✕</button></div>' +
      '<div class="lb-status" id="lbStatus">加载中…</div>' +
      '<div class="lb-tablewrap"><table class="lb-table">' +
        '<thead><tr><th>名次</th><th>玩家</th><th>积分</th><th>转化人数</th><th>剩余资源</th><th>回合</th><th>结局类型</th><th>日期</th></tr></thead>' +
        '<tbody id="lbBody"></tbody></table></div>' +
      '<div class="lb-foot" id="lbFoot"></div>' +
    '</div>';
  ov.addEventListener('click', e => { if(e.target === ov) closePanel(); });
  document.body.appendChild(ov);
  ov.querySelector('.lb-close').addEventListener('click', closePanel);
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && ov.classList.contains('open')) closePanel();
  });
}
function openPanel(){ ensurePanel(); document.getElementById('lbOverlay').classList.add('open'); loadBoard(); }
function closePanel(){ const ov = document.getElementById('lbOverlay'); if(ov) ov.classList.remove('open'); }

function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ending badges — same mapping as the ending-page board; i18n layer translates the labels */
const ENDING_LABEL = {'win-excellent':'🏆 非常成功','win-deep':'🚀 超额渗透','win-pass':'✅ 阶段达标',
  'partial-deep':'🌗 部分转化','fail-rebound':'⛔ 未能达标'};

async function loadBoard(){
  const status = document.getElementById('lbStatus');
  const body = document.getElementById('lbBody');
  const foot = document.getElementById('lbFoot');
  status.textContent = '加载中…';
  body.innerHTML = ''; foot.textContent = '';
  try{
    const r = await req('GET', '/api/leaderboard?limit=50&courseId=' + encodeURIComponent(COURSE_ID));
    if(!r.ok) throw new Error('http ' + r.status);
    const data = await r.json();
    const rows = (data.entries || []).map(e =>
      '<tr' + (e.name === lastSubmittedName && e.score === lastSubmittedScore ? ' class="lb-me"' : '') + '>' +
      '<td>' + e.rank + '</td><td>' + esc(e.name) + (e.demo ? ' <span style="opacity:.65;font-size:11px">（演示）</span>' : '') + '</td><td><b>' + e.score + '</b></td>' +
      '<td>' + (e.converted != null ? e.converted + '/12' : '—') + '</td>' +
      '<td>' + (e.resourcesLeft != null ? e.resourcesLeft : '—') + '</td>' +
      '<td>' + (e.rounds ?? '—') + '</td>' +
      '<td>' + (ENDING_LABEL[e.ending] || '—') + '</td>' +
      '<td>' + String(e.createdAt || '').slice(0, 10) + '</td></tr>').join('');
    body.innerHTML = rows || '<tr><td colspan="8" class="lb-empty">还没有成绩，来做第一个上榜的人</td></tr>';
    status.textContent = '共 ' + (data.total || 0) + ' 条成绩';
  }catch(err){
    status.textContent = '排行榜服务暂不可用（后端未发布或网络异常）';
  }
  try{
    const r2 = await req('GET', '/api/players/' + encodeURIComponent(playerId()) + '/best?courseId=' + encodeURIComponent(COURSE_ID));
    if(r2.ok){
      const b = await r2.json();
      if(b && b.best != null) foot.textContent = '你的最好成绩：' + b.best + ' 分（第 ' + b.bestRank + ' 名 · 共 ' + b.games + ' 局）';
    }
  }catch(err){}
}

/* ── submit on game end (once per run) ── */
let submitted = false;
let lastSubmittedName = null, lastSubmittedScore = null;

/* demo-mode flag: set when the classroom cheat code (cheatFloor) is used this run;
   demo runs are still submitted but always ranked below normal runs */
let demoUsed = false;
try{
  if(typeof window.cheatFloor === 'function'){
    const _origCheat = window.cheatFloor;
    window.cheatFloor = function(){ demoUsed = true; return _origCheat.apply(this, arguments); };
  }
}catch(e){}

function gameSnapshot(){
  try{
    const st = getState();
    if(!st || !st.ended) return null;
    const sc = getScore();
    return {
      playerId: playerId(),
      courseId: COURSE_ID,
      name: (st.learnerName || '匿名玩家').slice(0, 24),
      score: sc && typeof sc.total === 'number' ? sc.total : 0,
      rounds: sc && sc.rounds ? sc.rounds : Math.max(1, (st.round || 1) - 1),
      resourcesLeft: Math.max(0, st.resources || 0),
      converted: sc && typeof sc.conv === 'number' ? sc.conv : undefined,
      ending: (st.endingType || '').slice(0, 120),
      lang: (window.I18N && I18N.lang) || 'zh',
      demo: demoUsed === true
    };
  }catch(e){ return null; }
}

async function submitScore(){
  if(submitted) return;
  const snap = gameSnapshot();
  if(!snap) return;
  submitted = true;
  try{
    const r = await req('POST', '/api/scores', snap);
    if(r.ok){
      const d = await r.json();
      lastSubmittedName = snap.name; lastSubmittedScore = snap.score;
      toast('🏆 成绩已上榜：第 ' + d.rank + ' 名 / 共 ' + d.total + ' 人');
    }else{
      toast('成绩提交失败（' + r.status + '）');
    }
  }catch(e){
    toast('排行榜服务暂不可用，成绩未提交');
  }
}

/* watch for the ending screen becoming visible (showScreen toggles .active) */
function watchEnding(){
  const target = document.getElementById('screen-ending');
  if(!target){ setTimeout(watchEnding, 1500); return; }
  const mo = new MutationObserver(() => {
    if(target.classList.contains('active')){
      if(!submitted) setTimeout(submitScore, 800);   // let the ending render settle
    }else{
      submitted = false;   // any restart path deactivates the ending screen
      demoUsed = false;    // new run starts clean
    }
  });
  mo.observe(target, {attributes:true, attributeFilter:['class','style']});
}

/* ── toast ── */
let toastTimer = null;
function toast(msg){
  let t = document.getElementById('lbToast');
  if(!t){
    t = document.createElement('div');
    t.id = 'lbToast';
    t.addEventListener('click', () => { t.classList.remove('show'); openPanel(); });
    document.body.appendChild(t);
  }
  t.textContent = msg + '（点击查看）';
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 6000);
}

/* ── boot ── */
function boot(){ ensureButton(); ensurePanel(); watchEnding(); }
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
