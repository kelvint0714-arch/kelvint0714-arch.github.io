# A Quiet Valley

[English](#english) · [中文](#中文)

**https://kelvint0714-arch.github.io**

---

## English

Kelvin Tang's personal homepage: one impossible building floating in the mist, in the spirit of *Monument Valley*.

### What's on the page

- **An isometric monument, rendered live.** A small WebGL2 renderer, no libraries. It uses an orthographic isometric camera, and every face takes one of its stone's three tones: top, left-lit or right-shadowed. Walls brighten towards the top, slabs show faint seams, and the legs melt into the mist below. The monument is made in code ([`src/world.ts`](src/world.ts)): a loop of walls climbs round a tall pillar, from a low block in front up two long stairs to the side landings and along the back walks to the pillar's crown. The crown is exactly where the loop's far corner is seen, so the walks arrive at it though the pillar stands in the middle. An eight-point star crowns the pillar, and over it a large impossible triangle turns slowly about the line of sight, so it stays impossible as it turns. A column of light rises into it from the rune at the star's heart; pointing at Research brightens the light and quickens the turn. Twin domed towers and a gate tower stand on the landings, and a pavilion floats in the court. The detail is fine throughout: cornices, string courses, windows with sills and inlaid surrounds, finials, lanterns, banners.
- **Day and dusk.** The light follows the system: a warm sandy day in light mode, a teal dusk with cyan glows in dark mode. The header switch cycles Auto, Day and Dusk, and the browser remembers the choice.
- **Five doors, five worlds.** Each section is a place on the great building, marked by a small label on a fine line. Going in, the camera leans towards that door while the great building sinks into the mist. The sky then turns to another world's, that world's building assembles out of the mist, and the white traveller steps out of its door. Each world has its own colours, by day and by dusk, after *Monument Valley*'s levels:
  - About: the door of the twin towers leads to **the Lotus Palace**, a three-storey palace on open arcades. It has pink and periwinkle walls, two tall pagoda towers, a raised pool with a turning lotus, a high walk on slender legs, and two rooms cut open in its walls (a little stair, a bookshelf, a friend reading).
  - Research: the star on the pillar leads to **the Night Window**, a towering white frame of onion arches under a crown of onion peaks. Through it is a starry night with a crescent moon, and a two-tiered navy observatory with a lit lantern room and a turning rune.
  - Projects: the gate tower's door leads to **the Amber Sky**: an orange sky over a sea of cloud. Three tall banded pillars rise there, one climbing into an impossible triangle, with arched legs, a gate high on the far pillar, and a crow pacing a floating ledge.
  - Activity: the crank leads to **the Endless Stair**, a dark monument on rocks in a green pond. Jade stair flights zig-zag up its faces and cross at its back corner, golden lamps glow, and a pale tower rises behind. On its roof a stair winds round a tower that the traveller climbs for ever; behind the tower, where no one can see, it starts again.
  - Contact: the pavilion leads to **the Violet Tree**, a long violet aqueduct on arches with a lower walk and stairs. A door pours a beam of light up a curved ramp, golden rings turn over it, and a tree of pink cubes breathes on a slender column out in front.

  The panel rises beside the building. Moving between sections, one world sinks and the next one rises; coming back, the great building assembles again. No piece ever passes through another: each one's way in is checked against what already stands, and it comes from above or from the side when the way up is blocked.
- **An opening, about eleven seconds, after Monument Valley's.** A chapter card (*Ⅰ · A Quiet Valley*) comes in letter by letter over an empty sky, where the clouds drift. Then the world turns a quarter round into its isometric angle as the camera draws back and the clouds part. The impossible triangle's three beams fly in while the world is still turning, loose and not meeting, and close into the triangle only as the turn settles. Then the monument unfolds beneath it: the pillar and the walls rise out of the mist, the star settles on the pillar, the two stairs fold out of the front block, and the triangle begins to turn. The five places light up one by one, the traveller steps out of her door, the monument glides aside and the page comes in. Any key or tap skips it; it plays once per tab, and `?intro` replays it.
- **Research** is an index of papers. Each paper has its own page at `#research/<slug>`; with none yet, the index reads *Unlocked*.
- **Projects** follow GitHub visibility. Only public repositories are listed: one made private drops out, one made public appears. The build carries a snapshot, and opening the section asks GitHub for the current list (cached for ten minutes).
- **Activity** shows a year of commits as a heat map, synced at build.
- **Considerate.** It follows the system's reduced-motion setting and has its own pause button. *Observe* hides the page so you can look at the building. Keys: <kbd>1</kbd>–<kbd>5</kbd> open sections, <kbd>←</kbd> <kbd>→</kbd> switch between them, <kbd>Esc</kbd> steps back. On a phone the building sits on top with the sections listed below. Without WebGL2 the page falls back to the same text and list.
- **Two faces.** Jost (light, widely spaced) for everything small, and Cormorant Garamond for names and titles.

### Editing

- [`src/config.ts`](src/config.ts): your profile, **your papers** (`papers`, newest first; the file has an example entry), and display names for repositories.
- [`src/sections.ts`](src/sections.ts): the five sections' content.
- [`src/world.ts`](src/world.ts): the monument, block by block, the triangle over it, and where each section's door is (`stations`).
- [`src/rooms.ts`](src/rooms.ts): the five worlds behind the doors; their colours are in [`src/palettes.ts`](src/palettes.ts).
- [`src/palettes.ts`](src/palettes.ts): the colours of day and dusk, for the great building and each world.

### Local development

```bash
npm install
npm run sync   # pull GitHub data into src/data/github.json (optional)
npm run dev
```

Useful in development:

- `?intro`: play the intro again.
- `?still`: open straight onto the settled page.
- `?theme=light` or `?theme=dark`: look at day or dusk without changing the system setting.

### Deployment

Pushing to `main` builds the site with GitHub Actions and deploys it to GitHub Pages. It also redeploys every day at 04:00 Beijing time to refresh the GitHub data.

The previous design, a black hole called *Event Horizon*, is kept at the tag `v4-event-horizon`.

---

## 中文

Kelvin Tang 的个人主页：一座悬浮在雾中的不可能建筑，致敬《纪念碑谷》。

### 页面上有什么

- **实时渲染的等距纪念碑。** 一个小巧的 WebGL2 渲染器，不依赖任何库。它使用正交等距相机，每个面取石材的三种色调之一：顶面、受光的左面、背光的右面。墙面越往上越亮，石板有淡淡的接缝，底部的柱脚融进下方的雾里。纪念碑用代码搭成（[`src/world.ts`](src/world.ts)）：一圈环墙绕着中央的高柱攀升，从前方低处的石块沿两道长阶梯上到两侧平台，再沿后方步道走到高柱顶上。柱顶正好是环墙远角被看到的位置，所以步道“走到”了柱顶，尽管柱子立在环的正中。柱顶是一颗八角星，星的上方悬着一个大的不可能三角，绕视线方向缓缓旋转，转动时始终保持“不可能”。一道光从星心的符文升入三角；鼠标指向 Research 时光会变亮、三角转得更快。两侧平台上立着洋葱顶双塔和门楼，庭院中漂着一座亭子。细节更精致：檐口、腰线、带窗台和嵌线框的窗、尖顶饰、灯笼、旗幡。
- **白昼与暮色。** 光线跟随系统：浅色模式是温暖的沙色白昼，深色模式是青灰暮色配青色微光。右上角的开关可在 自动 / 白昼 / 暮色 之间切换，浏览器会记住你的选择。
- **五扇门，五个世界。** 每个板块都是大建筑上的一个地点，用一根细线和小标签标出。走进去时，镜头倾向那扇门，大建筑沉入雾中；随后天空换成另一个世界的颜色，那里的建筑从雾里拼合出来，白衣旅人从它的门里走出。每个世界都有自己的配色（白昼与暮色各一套），致敬《纪念碑谷》的关卡：
  - About：双塔的门，通往**莲花宫**：建在开敞拱廊上的三层宫殿，粉色与长春花蓝的墙，两座高高的宝塔，抬高的水池里一朵慢慢旋转的莲花，细柱撑起的高廊，墙上剖开两间小屋（小楼梯、书架、正在读书的朋友）。
  - Research：柱顶的星，通往**星夜之窗**：高耸的白色洋葱拱窗框，顶上一排洋葱形尖峰；窗里是挂着新月的星夜，夜中立着两层的深蓝天文台，灯室亮着，顶上的符文在转。
  - Projects：门楼的门，通往**琥珀天空**：橙色天空下是云海，三根带色带的高柱，其中一根爬进一个不可能三角；有拱腿、远处柱顶的门，还有一只在浮台上来回踱步的乌鸦。
  - Activity：摇柄，通往**无尽阶梯**：绿色水塘中岩石上的暗色纪念碑，翠色阶梯在两个立面上折返，在背后的角上交叉，金灯发光，后方立着一座淡色高塔。顶上一道阶梯绕塔盘旋，旅人永远在向上走；在塔后无人看见的地方，阶梯又从头开始。
  - Contact：亭子，通往**紫罗兰之树**：长长的紫色拱桥水道，带下层步道和阶梯；一扇门把光束洒上弧形坡道，金色圆环在上方旋转，前方细柱上一棵粉色方块组成的树在轻轻呼吸。

  面板在建筑旁升起。在板块之间切换时，一个世界沉下、下一个升起；返回时，大建筑重新拼合。拼合时不会有任何构件穿过另一个：每块的来路都会先和已经立好的部分做碰撞检查，向上的路被挡住时，就改从上方或侧面进来。
- **约 11 秒的开场，仿照《纪念碑谷》。** 空旷的天空里云在飘，章节卡（*Ⅰ · A Quiet Valley*）一个字母一个字母地浮现。随后整个世界旋转四分之一圈，转到等距视角，镜头缓缓拉远，云层散开。不可能三角的三根梁在世界还在转动时各自飞来，彼此并不相接；转动停稳的一刻才合成不可能三角。然后纪念碑在它下方展开：高柱和环墙从雾中升起，八角星落在柱顶，两道阶梯从前方石块中折出，三角开始旋转。五处地点依次亮起，旅人从门里走出，纪念碑滑到一旁，页面淡入。按任意键或轻触即可跳过；每个标签页只播一次，网址加 `?intro` 可重播。
- **Research** 是论文索引。每篇论文有自己的页面（`#research/<slug>`）；还没有论文时，列表只显示 *Unlocked*。
- **Projects** 与 GitHub 仓库的可见性同步。只列出公开仓库：设为私有就消失，设为公开就出现。构建时带一份快照，打开板块时再向 GitHub 取一次当前列表（缓存 10 分钟）。
- **Activity** 以热力图显示一年的提交记录，构建时同步。
- **体贴的细节。** 跟随系统的“减少动态效果”设置，另有暂停按钮；“Observe”隐藏页面内容，只看建筑。按键：<kbd>1</kbd>–<kbd>5</kbd> 进入板块，<kbd>←</kbd> <kbd>→</kbd> 切换，<kbd>Esc</kbd> 返回。手机上建筑在上、板块列表在下。不支持 WebGL2 时，显示同样的文字和列表。
- **两种字体。** Jost（细体、宽字距）用于小字，Cormorant Garamond 用于名字与标题。

### 修改内容

- [`src/config.ts`](src/config.ts)：个人信息、**你的论文**（`papers`，最新在前，文件里有示例条目），以及各仓库的显示名。
- [`src/sections.ts`](src/sections.ts)：五个板块的内容。
- [`src/world.ts`](src/world.ts)：纪念碑的每一块、上方的三角，以及每个板块的门所在的位置（`stations`）。
- [`src/rooms.ts`](src/rooms.ts)：五扇门后的五个世界；它们的配色在 [`src/palettes.ts`](src/palettes.ts)。
- [`src/palettes.ts`](src/palettes.ts)：大建筑和每个世界在白昼与暮色下的配色。

### 本地开发

```bash
npm install
npm run sync   # 拉取 GitHub 数据到 src/data/github.json（可选）
npm run dev
```

开发时常用：

- `?intro`：重播开场。
- `?still`：直接打开停稳后的页面。
- `?theme=light` 或 `?theme=dark`：不改系统设置，直接看白昼或暮色。

### 部署

推送到 `main` 后由 GitHub Actions 构建并发布到 GitHub Pages；每天北京时间 04:00 还会自动重新部署一次，刷新 GitHub 数据。

之前的黑洞设计（*Event Horizon*）保存在标签 `v4-event-horizon`。
