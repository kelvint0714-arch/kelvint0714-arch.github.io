# Event Horizon

[English](#english) · [中文](#中文)

**https://kelvint0714-arch.github.io**

---

## English

Kelvin Tang's personal homepage, set at the edge of a black hole.

### What's on the page

- **A rendered black hole, not a picture.** A WebGL2 fragment shader integrates Schwarzschild null geodesics pixel by pixel through a warped accretion disk: the bright band across the shadow, the long layered wings, and the far side of the disk lensed over and under the hole into a ring. The disk is matched pixel for pixel to a reference image. Every pixel of the reference is traced to where its ray meets the disk, and its colour is baked into the disk textures (`public/disk-*.webp`, made by [`scripts/bake-disk.py`](scripts/bake-disk.py)). Past the reference's frame, a procedural sky takes over. It is shown in the reference's own silver-white; add `?palette=red` to see it in red.
- **Everything moves.** Light rides the disk's orbits at Kepler's pace (inner orbits faster), arcs stream round the hole along the reference's own light lanes, the jets fire pulses outwards, the wings turn with the disk, and the sprayed starlight streams away. Each layer keeps returning to the reference, and motion fades out where surfaces meet, so nothing tears. Drawn far larger than the reference, the picture is smoothed along its lanes and sharpened across them, with fine filaments grown along them.
- **An intro, about 17 seconds.** A cyber nav HUD comes online. Coordinates for the Solar System are typed into the nav computer, and a scan sweeps the screen past Alpha Centauri, Barnard's Star, Sirius and TRAPPIST-1 before locking on Sol. The drive spools, counts down, and punches into hyperspace. Mid-jump the drive fails: the HUD turns red and garbled, the frame tears, and the ship slams out of hyperspace into an unknown sector, next to the black hole. Skip it with any key; it plays once per tab, and `?intro` replays it.
- **Five sections, five planets.** They float between the camera and the hole at different depths, with real perspective and parallax as the camera sways. Choosing one is a jump: lock, spool, a burst of speed, and arrival in a white-hot flash. The planet then grows into a world of its own beside the panel:
  - About: an ocean world
  - Research: an ice world
  - Projects: a ringed gas giant
  - Activity: a volcanic world
  - Contact: a crystal world
- **Research** is an index of papers. Each paper has its own page at `#research/<slug>`; with none yet, the index reads *Unlocked*.
- **Projects** follow GitHub visibility. Only public repositories are listed: one made private drops out, one made public appears. The build carries a snapshot, and opening the section asks GitHub for the current list (cached for ten minutes).
- **Activity** shows a year of commits as a heat map, synced at build.
- **Considerate.** It follows the system's reduced-motion setting and has its own pause button. An *Observe* mode hides the page so you can look at the hole. Keys: <kbd>1</kbd>–<kbd>5</kbd> open sections, <kbd>←</kbd> <kbd>→</kbd> switch between them, <kbd>Esc</kbd> steps back. Resolution adapts to keep the frame rate up, and without WebGL2 a still image stands in. No three.js, just WebGL2.
- **Type as a collage**, each face with its own job:
  - Syncopate: the name
  - Instrument Serif italic: titles and asides
  - Big Shoulders Display: numbers and big words
  - Silkscreen: status tags
  - IBM Plex Mono: readouts
  - Space Grotesk: body text

### Editing

- [`src/config.ts`](src/config.ts): your profile, **your papers** (`papers`, newest first; the file has an example entry), and display names for repositories.
- [`src/sections.ts`](src/sections.ts): the five sections, and where each planet sits (`body: fromImage(x, y)` in reference-image pixels, `depth` in Rs from the camera).
- [`src/blackhole.ts`](src/blackhole.ts): the black hole's shape (`LOOK`) and the shader.

### Local development

```bash
npm install
npm run sync   # pull GitHub data into src/data/github.json (optional)
npm run dev
```

Useful in development:

- `?intro`: play the intro again.
- `?still`: open straight onto the settled page.
- `?inspect=1`: step through frames.
- `/compare.html`: render one frame in the reference image's framing (720×1280) for comparison.

### Deployment

Pushing to `main` builds the site with GitHub Actions and deploys it to GitHub Pages. It also redeploys every day at 04:00 Beijing time to refresh the GitHub data.

---

## 中文

Kelvin Tang 的个人主页，场景设在一个黑洞的边缘。

### 页面上有什么

- **实时渲染的黑洞，而不是一张图片。** WebGL2 片元着色器逐像素积分史瓦西零测地线，光线穿过一个扭曲的吸积盘：斜穿阴影的亮带、长长的层叠两翼，盘的背面经引力透镜弯到黑洞上下方，合成一道圆环。盘面与一张参考图逐像素对齐：参考图的每个像素都沿光线追踪到它落在盘上的位置，颜色烘焙进盘面纹理（`public/disk-*.webp`，由 [`scripts/bake-disk.py`](scripts/bake-disk.py) 生成）。参考图边框之外由程序生成的星空接续。画面保持参考图本来的银白色；网址加 `?palette=red` 可以看红色版本。
- **整个画面都在动。** 光沿盘的轨道按开普勒速度流动（内圈快），黑洞周围的光弧沿参考图自身的光道绕行，两极喷流向外射出光脉冲，两翼随盘转动，溅射的星辉向外涌出。每层动效都会周期性地回到参考图本身，不同表面相接处动效渐弱，避免撕裂。放大到远超参考图分辨率时，画面沿光道平滑、垂直于光道锐化，并沿光道生成细丝纹理。
- **约 17 秒的开场。** 赛博风格的导航 HUD 上线，在导航电脑里输入太阳系的坐标；搜索圈横扫屏幕，依次掠过半人马座 α、巴纳德星、天狼星、TRAPPIST-1，最后锁定太阳系。引擎充能、倒计时，猛然冲进超空间。途中引擎故障：HUD 转红、读数乱码、画面撕裂，随后急刹脱离跃迁，落进一片未知星域，就在黑洞旁边。按任意键可跳过；每个标签页只播一次，网址加 `?intro` 可重播。
- **五个板块，五颗星球。** 它们悬浮在相机与黑洞之间的不同深度，有真实的透视，镜头晃动时有视差。点开一个板块就是一次跃迁：锁定、充能、急加速、在白热闪光中抵达。随后那颗星球在面板旁放大成一个独立的世界：
  - About：海洋行星
  - Research：冰封世界
  - Projects：带光环的气态巨行星
  - Activity：火山世界
  - Contact：水晶行星
- **Research** 是论文索引。每篇论文有自己的页面（`#research/<slug>`）；还没有论文时，列表只显示 *Unlocked*。
- **Projects** 与 GitHub 仓库的可见性同步。只列出公开仓库：设为私有就消失，设为公开就出现。构建时带一份快照，打开板块时再向 GitHub 取一次当前列表（缓存 10 分钟）。
- **Activity** 以热力图显示一年的提交记录，构建时同步。
- **体贴的细节。** 跟随系统的“减少动态效果”设置，另有暂停按钮；“观测模式”隐藏页面内容，只看黑洞。按键：<kbd>1</kbd>–<kbd>5</kbd> 进入板块，<kbd>←</kbd> <kbd>→</kbd> 切换，<kbd>Esc</kbd> 返回。帧率不足时自动降低分辨率；不支持 WebGL2 时显示一张静态图。不依赖 three.js，只用原生 WebGL2。
- **混搭的字体**，各有分工：
  - Syncopate：名字
  - Instrument Serif 斜体：标题与旁注
  - Big Shoulders Display：数字与大字
  - Silkscreen：状态标签
  - IBM Plex Mono：读数
  - Space Grotesk：正文

### 修改内容

- [`src/config.ts`](src/config.ts)：个人信息、**你的论文**（`papers`，最新在前，文件里有示例条目），以及各仓库的显示名。
- [`src/sections.ts`](src/sections.ts)：五个板块，以及每颗星球的位置（`body: fromImage(x, y)`，参考图像素坐标；`depth`，到相机的距离，单位 Rs）。
- [`src/blackhole.ts`](src/blackhole.ts)：黑洞的外形参数（`LOOK`）与着色器。

### 本地开发

```bash
npm install
npm run sync   # 拉取 GitHub 数据到 src/data/github.json（可选）
npm run dev
```

开发时常用：

- `?intro`：重播开场。
- `?still`：直接打开停稳后的页面。
- `?inspect=1`：逐帧检查。
- `/compare.html`：按参考图的取景（720×1280）渲染单帧，用于对照。

### 部署

推送到 `main` 后由 GitHub Actions 构建并发布到 GitHub Pages；每天北京时间 04:00 还会自动重新部署一次，刷新 GitHub 数据。
