# esg-simulation · ESG 转型模拟（ESG Compliance Transformation Simulation）

线上地址：<https://yan-shipeng.github.io/esg-simulation/>

## 这是什么

基于最新版「战略落地模拟」引擎（v115，2026-11-23）改写的 **ESG 转型模拟**：

- **剧情**：中国制造业集团在欧洲的工厂迎来 CSRD 披露与碳关税（CBAM）大考，你是总部派驻的 ESG 转型负责人，要在 60 个资源内让当地 12 位关键人物真正接受 ESG 合规体系。
- **机制**：与中文版战略模拟完全同构（13 个动作、社会网络蔓延、隐藏目标、可信度/压力、四段推进），只改写了叙事、人物诉求、行动名称与结局案例。
- **中英双语**：游戏内一键切换（右上角 EN/中文）。
- **排行榜**：courseId = `esg`，只收录从这个页面提交的成绩，与 strategy-cn / strategy 两个入口的榜单**完全隔离**（演示局永远排在榜尾）。
- 单文件自包含，无外部依赖，可离线双击运行。

## 固定约定（不要改）

> **这个链接永远是 ESG 课的榜单。** `https://yan-shipeng.github.io/esg-simulation/`
> 只读写 courseId=`esg` 的排行榜数据，不要指向其他课程，也不要把其他课程的成绩混进来。

## 部署

纯静态：把 `index.html` 推到 `gh-pages` 分支根目录，GitHub Pages 自动发布。
源码在 `main` 分支 `source/`（改文案后 `python build.py` 重新构建，详见该目录 README）。
