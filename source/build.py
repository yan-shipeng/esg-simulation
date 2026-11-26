import json, glob, re, sys

# 1) load + merge dicts
merged = {}
for f in sorted(f for f in glob.glob('dict-*.json') if f != 'dict-merged.json'):
    d = json.load(open(f, encoding='utf-8'))
    for k, v in d.items():
        merged[k] = v
print('dict entries:', len(merged))

# 2) unescape JS-style escapes captured from source (\n as 2 chars etc.)
def unesc(s):
    return (s.replace('\\\\', '')
             .replace('\\n', '\n').replace('\\t', '\t')
             .replace('\\"', '"').replace("\\'", "'")
             .replace('', '\\'))

final = {}
for k, v in merged.items():
    final[unesc(k)] = unesc(v)

# 3) split multi-line keys into per-line entries (teach/realWorld get split('\n') at render)
extra = {}
for k, v in list(final.items()):
    if '\n' in k:
        kl = k.split('\n'); vl = v.split('\n')
        if len(kl) == len(vl):
            for a, b in zip(kl, vl):
                a, b = a.strip(), b.strip()
                if a and a not in final:
                    extra[a] = b
final.update(extra)
print('with per-line extras:', len(final))

# 4b) punctuation as exact single-char nodes (split by inline tags)
for zh_p, en_p in [('，', ', '), ('。', '.'), ('：', ': '), ('、', ', '), ('「', chr(0x201c)), ('」', chr(0x201d)),
                   ('；', '; '), ('！', '!'), ('？', '?'), ('（', '('), ('）', ')')]:
    final.setdefault(zh_p, en_p)

# 4c) boundary spacing: when a key sits right next to a tag in the source,
# the EN value needs a space the CJK text never needed
src_html = open('game.html', encoding='utf-8').read()
import re as _re
# keys whose next sibling node starts with EN punctuation (e.g. '：'->': ') —
# padding them would render 'Wrap up : settle' instead of 'Wrap up: settle'
NO_BOUNDARY_PAD = {'✅ 收工', '🔧 继续'}
sp = 0
for k, v in list(final.items()):
    if '${' in k or '\n' in k or len(k) < 2 or k in NO_BOUNDARY_PAD:
        continue
    nv = v
    if (k + '<') in src_html and _re.search(r'[A-Za-z0-9%)]$', nv):
        nv = nv + ' '
    if ('>' + k) in src_html and _re.match(r'[A-Za-z0-9]', nv):
        nv = ' ' + nv
    if nv != v:
        final[k] = nv
        sp += 1
print('boundary-spaced:', sp)

json.dump(final, open('dict-merged.json', 'w', encoding='utf-8'), ensure_ascii=False)

# 4) coverage check against extracted list
todo = json.load(open('to_translate_clean.json', encoding='utf-8'))
missing = []
for s in todo:
    su = unesc(s)
    if '${' in su:
        continue  # handled by patterns
    if su not in final:
        missing.append(su)
print('static strings missing translation:', len(missing))
with open('missing.txt', 'w', encoding='utf-8') as f:
    for m in missing:
        f.write(m.replace('\n', '\\n') + '\n')

# 5) emit final HTML
src = open('game.html', encoding='utf-8').read()
engine = open('i18n-engine.js', encoding='utf-8').read()
leaderboard = open('leaderboard.js', encoding='utf-8').read()
fx = open('fx.js', encoding='utf-8').read()

# leaderboard backend config:
#   backend_url.txt  = stable published URL (no token) — preferred once published
#   preview_url.txt  = temporary "BASE?_kpt=TOKEN" preview URL — fallback
lb_base, lb_qs = '', ''
try:
    bu = open('backend_url.txt', encoding='utf-8').read().strip()
    if bu:
        lb_base = bu.split('?', 1)[0]
except FileNotFoundError:
    pass
if not lb_base:
    try:
        pu = open('preview_url.txt', encoding='utf-8').read().strip()
        if pu:
            if '?' in pu:
                lb_base, q = pu.split('?', 1)
                lb_qs = '?' + q
            else:
                lb_base = pu
    except FileNotFoundError:
        pass
print('leaderboard backend:', lb_base or '(none — module stays inert)', '| token:', bool(lb_qs))

css = '''
    /* English mode: Georgia-first screen-optimized serif stack (v112 — Book Antiqua/Palatino
       are print faces and read thin on screen; Georgia ships with Windows/macOS);
       Chinese mode keeps Noto Sans SC */
    html[lang="en"] body{font-family:Georgia,'Book Antiqua','Palatino Linotype',Palatino,serif;
      letter-spacing:.01em;line-height:1.5;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
    html[lang="en"] .lb-panel,html[lang="en"] #lbBtn,html[lang="en"] #lbToast{
      font-family:Georgia,'Book Antiqua','Palatino Linotype',Palatino,serif}
    /* English mode: undo CJK compressions — the negative letter-spacing rules were tuned
       for dense Chinese glyphs and squeeze Latin text together */
    html[lang="en"] *{letter-spacing:normal}
    /* English mode: Latin words must wrap whole — break-all shatters words mid-word */
    html[lang="en"] body{word-break:normal}
    html[lang="en"] .tp-targets{word-break:normal;overflow-wrap:break-word}
    /* English mode layout hardening — Latin text runs longer and wraps by words,
       so CJK-era nowrap/ellipsis rules truncate or cram it */
    @media (max-width:820px){
      html[lang="en"] .title{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.2}
      html[lang="en"] #tabsBar .btn{white-space:normal;font-size:10px;line-height:1.15}
    }
    html[lang="en"] #endingBody table th,html[lang="en"] #endingBody table td{white-space:normal}
    /* v114：Georgia reads smaller than Noto Sans — bump base sizes directly.
       (v113 used body{zoom:1.05}; Chromium repaints the whole zoomed layer on every
       hover transition frame → severe hover jank on the decision screen. Reverted.) */
    html[lang="en"] body{font-size:17px}
    html[lang="en"] .small{font-size:14px}
    html[lang="en"] .btn{font-size:15px}
    html[lang="en"] .target{font-size:14px}
    html[lang="en"] .impact-table th{white-space:normal}
    html[lang="en"] .lb-table th{white-space:normal}
    html[lang="en"] .modal-links button{white-space:normal}
    /* English mode: translate CSS pseudo-element labels in the result table (DOM engine can't reach CSS content) */
    html[lang="en"] .impact-table td:nth-child(3)::before{content:'Buy-in '}
    html[lang="en"] .impact-table td:nth-child(5)::before{content:'Why: '}
    /* i18n toggle button — v119: sits in the top bar next to the other actions, not floating */
    #langToggleBtn{position:static;padding:6px 12px;border-radius:9px;
      border:1px solid rgba(255,255,255,.18);background:rgba(13,30,42,.92);color:#d8eef4;
      font:600 12px 'Noto Sans SC',sans-serif;cursor:pointer;transition:all .18s ease;white-space:nowrap}
    #langToggleBtn:hover{border-color:#0d8b96;background:rgba(13,139,150,.3);color:#fff}
    /* leaderboard button — v119: same top-bar treatment */
    #lbBtn{position:static;padding:6px 12px;border-radius:9px;
      border:1px solid rgba(255,255,255,.18);background:rgba(13,30,42,.92);color:#d8eef4;
      font:600 12px 'Noto Sans SC',sans-serif;cursor:pointer;transition:all .18s ease;white-space:nowrap}
    #lbBtn:hover{border-color:#0d8b96;background:rgba(13,139,150,.3);color:#fff}
    /* leaderboard modal */
    #lbOverlay{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;
      background:rgba(4,10,16,.66);backdrop-filter:blur(4px)}
    #lbOverlay.open{display:flex}
    .lb-panel{width:min(680px,92vw);max-height:82vh;overflow:auto;background:#0e2230;
      border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:18px 20px;color:#d8eef4;
      font:14px 'Noto Sans SC',sans-serif;box-shadow:0 18px 60px rgba(0,0,0,.5)}
    .lb-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
    .lb-title{font-size:17px;font-weight:700}
    .lb-close{background:none;border:none;color:#9db8c4;font-size:18px;cursor:pointer;padding:2px 6px}
    .lb-close:hover{color:#fff}
    .lb-status{color:#8fb2c2;font-size:12.5px;margin:4px 0 8px}
    .lb-table{width:100%;border-collapse:collapse;font-size:13.5px}
    .lb-table th{text-align:left;padding:7px 9px;color:#8fb2c2;border-bottom:1px solid rgba(255,255,255,.12);
      white-space:nowrap;font-weight:600}
    .lb-table td{padding:7px 9px;border-bottom:1px solid rgba(255,255,255,.06)}
    .lb-table tr.lb-me td{background:rgba(90,184,74,.15)}
    .lb-empty{color:#8fb2c2;text-align:center;padding:16px}
    .lb-foot{margin-top:10px;color:#9fc6d8;font-size:13px}
    /* toast */
    #lbToast{position:fixed;bottom:26px;left:50%;transform:translateX(-50%) translateY(20px);z-index:100001;
      background:rgba(13,30,42,.95);border:1px solid rgba(13,139,150,.5);color:#d8eef4;padding:10px 18px;
      border-radius:10px;font:600 13.5px 'Noto Sans SC',sans-serif;opacity:0;pointer-events:none;
      transition:all .25s ease;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.4);max-width:88vw;text-align:center}
    #lbToast.show{opacity:1;pointer-events:auto;transform:translateX(-50%) translateY(0)}
'''

data_js = 'window.__I18N_DICT__ = ' + json.dumps(final, ensure_ascii=False) + ';\n'
data_js += 'Object.assign(window.__ZH_EN_SRC__||{}, window.__I18N_DICT__);\n'
# engine references __ZH_EN_SRC__ created inside its own scope; simplest: load dict first, engine reads it
inject = '<style>' + css + '</style>\n'
inject += '<script>\n/* i18n dictionary */\n'
inject += 'window.__I18N_EXACT_ONLY__ = ' + json.dumps([
  '姓名','角色','版本','导出时间','回合数','完全配合人数','达标线','之后的选择','本局总积分','还没决定',
  '非常成功','超额渗透','阶段达标','部分转化','未能达标'
]) + ';\n'
inject += data_js + '</script>\n'
# patch engine: make it use the preloaded dict
engine = engine.replace(
    "const ZH_EN = Object.create(null);           // exact: full Chinese string -> English",
    "const ZH_EN = window.__I18N_DICT__ || Object.create(null); // exact: full Chinese string -> English")
inject += '<script id="i18nEngine">\n' + engine + '\n</script>\n'
# leaderboard: config first, then the module
inject += '<script>\n/* leaderboard backend config */\n'
inject += 'window.__LEADERBOARD_API_BASE__ = ' + json.dumps(lb_base) + ';\n'
inject += 'window.__LEADERBOARD_API_QS__ = ' + json.dumps(lb_qs) + ';\n'
inject += 'window.__LEADERBOARD_COURSE_ID__ = "esg";\n'
inject += '</script>\n'
inject += '<script>\n' + leaderboard + '\n</script>\n'
inject += '<script>\n/* FX · Living Network visual system */\n' + fx + '\n</script>\n'

font_link = ''
out = src.replace('</head>', font_link + '\n</head>')
out = out.replace('</body>', inject + '</body>')
open('game_i18n.html', 'w', encoding='utf-8').write(out)
print('game_i18n.html bytes:', len(out.encode('utf-8')))
