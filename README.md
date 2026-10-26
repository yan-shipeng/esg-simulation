# esg-simulation · ESG Transition Challenge（英文版入口）

线上地址：<https://yan-shipeng.github.io/esg-simulation/>

## 这个仓库做什么

它是 `go-overseas` 的**完整副本**：同样的薄壳、同样的加载动画、同样的排行榜跳转页，
只把内容换成了 ESG 版。

```
https://yan-shipeng.github.io/esg-simulation/        ← 本仓库（薄壳）
  └─ iframe → https://78c543eb7a1547ed8d854be143466ecc.sg2.agentos-app.run/esg/en
```

## 与原版的关系

| | go-overseas | esg-simulation（本仓库） |
|---|---|---|
| 主题 | Global Integration Challenge | ESG Transition Challenge |
| 玩家角色 | Overseas Integration Lead | Group Chief Sustainability Officer |
| 路径 | `/en` | `/esg/en` |
| 排行榜 | `game.db` | `esg.db` |

游戏本体（12 个 stakeholder、13 个动作、60 单位资源、结算案例）是同一套引擎，
ESG 版把叙事、隐藏议程和结算案例做了改写，机制与分值不变。

两个站点**共用同一台服务**（同一个 WorkBuddy Sites 应用），只是路径前缀不同：

```
https://<deployment>/en        ← 原版（go-overseas 指向这里）
https://<deployment>/esg/en    ← ESG 版（本仓库指向这里）
```

两边的成绩分别存在 `game.db` 和 `esg.db`，互不干扰。

> 之所以合并成一台服务：平台同一时间只保留一个在跑的部署，
> 两个独立应用会互相把对方挤下线。

## 部署

纯静态，无需构建：把内容推到 `gh-pages` 分支，GitHub Pages 自动发布。

> ⚠️ WorkBuddy Sites 每次重新发布会生成**新的域名**，届时需要同步更新
> `index.html` 和 `leaderboard/index.html` 里的地址（`go-overseas` 那边也要改）。

## 说明

- 页面本身不做任何逻辑，只有加载动画 + 一层 iframe，外加 12 秒兜底
  （避免 iframe 已加载但 `onload` 未触发时加载层一直盖住画面）。
- 排行榜由服务端提供，因此这里只做跳转/嵌入。
