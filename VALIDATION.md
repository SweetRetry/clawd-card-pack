# 小工具校验摘要

产物 `tool.zip` 已按 `minitool-zip-builder` skill 校验、修复并打包。

## 产物

- 路径 `/Users/zhangzimin/Documents/sweetRetry/projects/clawd-card-pack/tool.zip`
- 体积 153,691 字节（150 KiB），远低于 2 MiB 建议值与 10 MiB 上限
- 内容 `index.html`（根目录）、`assets/app.js`
- 打包命令 `cd dist && zip -r -X ../tool.zip . -x '*.DS_Store'`，压缩的是目录内容，未多套一层

## 修复的问题

`dist/` 原产物有 8 处违规，其中 3 处会让容器直接加载失败。

| 问题 | 影响 | 修复 |
| --- | --- | --- |
| `<script type="module" crossorigin src="/assets/index-*.js">` | 容器离线加载解不了 module 相对 import，页面渲染出来但 JS 不执行 | `vite.config.js` 输出 iife + `scripts/postbuild.mjs` 改写为经典脚本 |
| 经典脚本 Vite 默认放在 `<head>` | 脚本在 `<body>` 前执行，`document.body` 为 null，bundle 抛异常整包失效 | postbuild 把脚本移到 `</body>` 前 |
| 构建目标为 Vite 默认（ES2020+） | Chrome 61 解析失败 | `build.target: ['es2017','chrome61']` |
| Vite 注入的 modulepreload polyfill 含 `fetch()` | 命中禁用 API | `modulePreload: false` |
| 「保存图片」用 `<a download>` + blob 下载 | 文件下载是禁用行为 | 容器内走 `xhs.miniTool.saveImageToPhotosAlbum`，网页内保留下载 |
| 存储直接裸用 `localStorage` | 未优先使用容器 Storage（9.46+） | 优先 `setStorage/getStorage`，按 `buildVersion` 判断版本并回退 |
| CSS 用 `inset` / `aspect-ratio` / flex `gap` | Chrome 61 不认，无基线回退 | 物理属性 + 比例盒 + flex-gap 行为检测 |
| viewport 缺 `viewport-fit=cover` | 真机安全区布局不正确 | 补齐 |

## 静态检查结果

- zip 根目录直接是 `index.html`，未多套目录
- 仅含 `.html` / `.js`，无 `node_modules` / `*.map` / `.DS_Store` / 构建配置
- 无任何 `http(s)://` 外部引用，资源全为相对路径
- 无内联 `<script>`、无行内事件、无 `javascript:` URI
- 无 `<base href>` / `<iframe>` / `<object>` / 自建 CSP meta
- 经典脚本，无 `type="module"`，bundle 内无 `import` / `export`
- 禁用能力扫描：`fetch` / `XMLHttpRequest` / `WebSocket` / 定位 / 剪贴板 / 传感器 / Worker / WebRTC / `eval` / WASM / `requestFullscreen` 均为 0 命中
- `esbuild --target=chrome61` 解析通过
- 审计脚本 `audit_artifact.mjs` 与 `audit_artifact.py` 对 `dist/` 和 `tool.zip` 均 PASS

## 网页可用性

同一产物既能在小工具容器里跑，也能作为普通网页跑，两条路径都在运行时选择。

- 保存图片：有 `window.xhs.miniTool` 走相册，没有则走浏览器下载
- 存储：有容器 Storage（9.46+）走容器，否则 `localStorage`
- 已用 ego lite 实测网页路径：经典脚本加载、撕包 → 抽卡 → 图鉴全部走通，保存导出 `clawd-libra.png`，图鉴计数与持久化正确

## 未验证项

以下是 skill 要求交付时提醒的验证，均未执行，标记为待用户验证。

- 创服平台模拟器完整功能验证
- Android 真机扫码验证
- iOS 真机扫码验证
- Chrome 61 / Android 8.1 实际内核的 CSS 布局验证（标记：CSS 兼容性未实测）
- 真机性能（帧率、首屏时间、显存）未实测；WebGL 预算与降级路径为静态设计，未根据运行数据判定

浏览器直运行的结果不作为小工具功能与兼容性的验收依据。
