# esg-simulation

NORTHSTAR ESG 转型模拟器（3D 园区 / 8 回合 / 中英切换）。

- 线上：https://yan-shipeng.github.io/esg-simulation/ （`gh-pages` 分支，构建产物放在根目录）
- 源码：本分支 `source/`，Vite + React + TS
- 本地开发：`cd source && npm install && npm run dev`
- 重新构建：`cd source && npm run build`，把 `source/dist/*` 覆盖到 `gh-pages` 分支根目录

早期版本曾用「壳页 iframe 指向临时沙箱」的方式部署，沙箱回收后整站白屏；现在改为自包含静态文件，不再依赖任何外部托管。
