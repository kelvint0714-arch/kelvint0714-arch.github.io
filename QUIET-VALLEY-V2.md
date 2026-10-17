# A Quiet Valley · Spatial refinement

这是一份增量更新，不是空白网站模板。目标仓库是：

`kelvint0714-arch/kelvint0714-arch.github.io`

不要上传到个人资料装饰仓库 `kelvint0714-arch/kelvint0714-arch`。

## 使用方式

解压更新包，在上述网站仓库的根目录上传 `index.html`、`src/` 和本说明文件。保留 ZIP 中的文件夹结构。这里只替换 `index.html` 并新增独立目录，不删除原有源文件。

提交到 `main` 后，原来的 Deploy 工作流会安装依赖、同步 GitHub 数据、运行 `npm run build`，然后发布 GitHub Pages。请以 Deploy 的最终成功状态为准，不要只看上传提交成功。仓库现有工作流还会每天北京时间 04:00 同步并重新部署；本更新不修改其权限、时间、配置或依赖。

本地工程中应用时，把上述文件合并到原仓库，再运行：

```bash
npm ci
npm run build
npm run dev
```

此包不能单独作为完整源码工程使用，必须应用到原仓库。另附的 `quiet-valley-v2-preview.html` 是可单独打开的交互预览，不是源码更新包，也不需要上传到仓库。

## 做了什么

新版用一个连续的纪念碑场景组织五个板块，而不是在每次换页时整座建筑消失、再生成另一个世界。主塔、拱廊、阶梯、池水和旋转桥有清楚的空间关系；小比例旅人提供尺度。

- 点击桥上的旋钮或 “Turn the bridge” 后，桥先旋转对齐，旅人才开始通过。
- 点击 “Return & turn back” 后，旅人先回到安全的平台，桥才复位。
- 行走使用距离驱动的双脚步态和转角停顿。桥在人物身下时不旋转。
- 所有内容入口随时可用，机关不是阅读门槛。默认只做短暂入场，不阻塞页面。
- About、Research、Projects、Activity、Contact 使用连续场景和少量材质变化，不再分别加载五座完整世界。原有五世界版本仍保留在 `?legacy`。
- 白昼／暮色、自动跟随系统、暂停、观测、减少动态效果、数字键导航、Escape 返回、手机五入口导航均保留或重新实现。

## 数据与旧版

`src/quiet/content.ts` 直接读取原来的 `src/config.ts` 和 `src/data/github.json`。论文、个人信息、项目覆盖名、邮箱及同步数据不在此更新包中，因此不会被预览用的快照覆盖。

Research 保留空列表时的 `Unlocked`，支持 `#research/<slug>` 论文页。Projects 先显示构建快照，再读取 GitHub 的公开、非 fork 仓库；失败时保留快照而不是显示虚构数据。Activity 保留快照中的日期和数值。

预览 HTML 使用从原站已发布文件提取的 2026-10-17 快照；上线后则继续使用你仓库的最新数据。字体在离线预览中使用本地回退字体，线上仍沿用原来的网络字体设置。

临时访问原版：

`https://kelvint0714-arch.github.io/?legacy`

原版章节例如 `?legacy#research`。永久退回原版，只需把 `index.html` 末尾入口改回：

```html
<script type="module" src="/src/main.ts"></script>
```

新增文件可以保留，不会影响旧入口。不要删除旧 `src/main.ts`、`src/world.ts`、`src/rooms.ts` 等文件。

## 渲染与维护

新版模型来自真实三维坐标，经过正交投影、背面剔除和逐像素深度测试绘制到 Canvas 2D。不是一张背景图，也不是 CSS 伪旋转。静态建筑的色彩和深度缓冲被缓存，仅桥和旅人在交互中重绘。

这与原来的 WebGL2 引擎不同：新默认界面不要求 WebGL2，但大规模几何不适合继续无限增加到这个软件渲染器中。原 WebGL2 实现未删除，旧版入口仍调用原引擎。

文件分工：

| 文件 | 职责 |
| --- | --- |
| `src/quiet-entry.ts` | 新／旧入口选择 |
| `src/quiet/world.ts` | 建筑几何、桥、旅人、固定路径 |
| `src/quiet/geometry.ts` | 盒体、拱门、柱、阶梯等几何构件 |
| `src/quiet/math.ts` | 投影、向量与插值 |
| `src/quiet/raster.ts` | 深度缓冲、静态缓存、下部雾化 |
| `src/quiet/scene.ts` | 桥的状态机、步态、主题、渲染时序 |
| `src/quiet/palettes.ts` | 白昼／暮色、章节名称与材质 |
| `src/quiet/content.ts` | 原数据配置的内容展示与公开仓库刷新 |
| `src/quiet/main.ts` | 页面入口、路由、键盘、无障碍控件 |
| `src/quiet/style.css` | 桌面、手机、浅深色版式 |
| `src/quiet/env.d.ts` | 样式模块类型声明 |

`?inspect` 启用只读 `window.quietValleyInspection()`，可查看桥状态、角度与旅人位置。普通页面不暴露该检查入口。

## 验证范围

已执行新增模块的严格 TypeScript 检查、离线打包和 Chromium 中的真实页面渲染及交互检查，包含桥旋转净空、人物路线支撑、先过桥后复位、暂停仍可导航、深链、浅深色、减少动态效果、多个屏幕宽度、公开仓库成功／失败分支、HTML 转义和贡献快照一致性。

检查中的模拟论文和模拟 API 响应仅用于测试，没有写入源码更新包，也没有写入交互预览的用户数据。

当前环境未完成原工程的 `npm ci && npm run build`：构建依赖无法联网安装。上线时仍需由原 GitHub Actions 工作流完成最终构建与发布验证。未对真实 Safari、iOS/Android 设备做实机测试，也不宣称已覆盖所有设备。

基于读取的原站提交：`eedf11e7e0aaf0c841bf8c4c0dd7aa015c1aa336`。更新包不修改仓库的凭据、权限或自动工作流。
