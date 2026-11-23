# source · ESG 合规转型模拟 源码

游戏本体：`game.html`（中文源码的单文件游戏）。英文界面由运行时翻译引擎在浏览器里实时生成，
**不要直接改构建产物**（仓库根目录的 `index.html`），改这里然后重新构建。

## 与 strategy-CN 原版的关系

本游戏 = strategy-CN v115（2026-11-23 最新版）的 ESG 改写：

- 机制、数值、界面结构与原版完全一致（13 动作 / 12+1 人物 / 60 资源 / 8 周）
- 改写内容：标题、开场剧情、人物描述与隐藏目标、3 个动作名称（信息打探→ESG 访谈、
  小规模试点→绿色试点、裁撤人员→问责调整）、结局案例（换成 ESG 真实案例）、主题色（深青→ESG 绿）
- 排行榜 courseId = `esg`（在 `build.py` 注入），与 strategy-cn / strategy 完全隔离

## 文件

| 文件 | 作用 |
|---|---|
| `game.html` | 游戏本体（中文源码），改玩法/文案都动它 |
| `dict-1..15.json`、`dict-z.json` | 中→英词典；dict-z 最后加载、同名覆盖前面的，新译法放 dict-z |
| `i18n-engine.js` | 双语运行时翻译引擎（机制出问题时才动） |
| `leaderboard.js` | 排行榜前端模块 |
| `build.py` | 构建脚本：合并词典 → 注入引擎/排行榜配置 → 产出 `game_i18n.html` |
| `runtime_check.js` | 翻译回归测试（node runtime_check.js） |
| `coverage_check.js` | 全量覆盖检查（node coverage_check.js，报告「翻译后仍含中文」的字符串） |
| `backend_url.txt` | 排行榜后端地址 |
| `to_translate_clean.json` / `missing.txt` | 构建用的覆盖清单 / 缺失报告（构建时自动更新 missing.txt） |

## 构建

```bash
cd source
python build.py           # 产出 game_i18n.html
node runtime_check.js     # 回归基线 FAILS: 8/60（8 条是故意保留的中文占位人名）
node coverage_check.js    # 覆盖检查：翻译后仍含中文的条目应逐条处理或确认是噪音
```

构建正常输出参考：`dict entries: 1650` 上下、`static strings missing translation: 31`。

然后把 `game_i18n.html` 复制为仓库根目录 `index.html`，推送到 `gh-pages` 分支发布。

## 历史

旧版 Vite + React 原型（NORTHSTAR 3D 园区版）已下线，代码保留在 git 历史
（2026-11-19 提交 `4f6d3bd1`）与 main 分支 `proto/` 目录。
