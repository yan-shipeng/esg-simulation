# esg-simulation · ESG Transition Challenge（英文版入口）

线上地址：<https://yan-shipeng.github.io/esg-simulation/>

## 这个仓库做什么

它是 `go-overseas` 的**完整副本**，结构与薄壳逻辑一模一样，只把内容换成了 ESG 版：

```
https://yan-shipeng.github.io/esg-simulation/        ← 本仓库（薄壳）
  └─ iframe → https://5f0c8413195b44c8904b1162848d27ed.sg2.agentos-app.run/en   ← ESG 版（WorkBuddy Sites）
```

`go-overseas` 原样保留、互不影响，两边各有各的部署与排行榜数据。

## 与原版的关系

| | go-overseas | esg-simulation（本仓库） |
|---|---|---|
| 主题 | Global Integration Challenge | ESG Transition Challenge |
| 玩家角色 | Overseas Integration Lead | Group Chief Sustainability Officer |
| 指向 | 原版英文部署 | ESG 版部署 |
| 数据 | 各自独立 | 各自独立 |

游戏本体（12 个 stakeholder、13 个动作、60 单位资源、结算案例）是同一套引擎，
ESG 版把叙事、隐藏议程和结算案例做了改写，机制与分值不变。

## 部署

纯静态，无需构建：把内容推到 `gh-pages` 分支，GitHub Pages 自动发布。

> ⚠️ WorkBuddy Sites 每次重新发布会生成**新的域名**，届时需要同步更新
> `index.html` 和 `leaderboard/index.html` 里的地址。

## 说明

- 页面本身不做任何逻辑，只有加载动画 + 一层 iframe，外加 12 秒兜底
  （避免 iframe 已加载但 `onload` 未触发时加载层一直盖住画面）。
- 排行榜由 WorkBuddy Sites 上的服务端提供，因此这里只做跳转/嵌入。
