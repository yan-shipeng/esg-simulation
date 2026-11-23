# ESG 合规转型模拟 · ESG Compliance Transformation Simulation

线上地址：<https://yan-shipeng.github.io/esg-simulation/>（`gh-pages` 分支，自包含单文件）

## 这是什么

基于「战略落地模拟」最新引擎（v115，2026-11-23）改写的 ESG 合规转型课堂模拟：

- **剧情**：集团欧洲工厂迎来 CSRD 披露与碳关税（CBAM）大考，你是总部派驻的 ESG 转型负责人，
  要在 60 个资源内让当地 12 位关键人物真正接受 ESG 合规体系。
- **机制**：13 个动作、社会网络蔓延、隐藏目标、可信度/压力四段推进，与中文版战略模拟完全同构。
- **中英双语**：游戏内右上角一键切换。
- **排行榜**：courseId = `esg`，只收录本页面提交的成绩，与其他课程榜单隔离；演示局（作弊码）永远排榜尾。
- 单文件自包含，无外部依赖。

## 仓库结构

```
index.html        ← 构建产物（= source/game_i18n.html），推到 gh-pages 发布
leaderboard/      ← 积分榜说明页（榜单已内置在游戏内）
proto/            ← 旧版壳页（历史遗留）
source/           ← 全部源码（改文案后重新构建，见 source/README.md）
```

## 改文案 / 修译法 / 重新构建

```bash
cd source
python build.py && node runtime_check.js
# 把 game_i18n.html 复制为根目录 index.html，推送到 gh-pages
```

详见 `source/README.md`。

## 历史

- 2026-11-23：基于 strategy-CN v115 全面重建（此前为 Vite+React 原型与旧引擎 ESG 改版，
  历史代码见 git 历史）。
