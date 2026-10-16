# A Quiet Valley

[English](#english) · [中文](#中文)

**https://kelvint0714-arch.github.io**

---

## English

Kelvin Tang's personal homepage: one impossible building floating in the mist, in the spirit of *Monument Valley*.

### What's on the page

- **An isometric building, rendered live.** A small WebGL2 renderer, no libraries. It uses an orthographic isometric camera, and every face takes one of its stone's three tones: top, left-lit or right-shadowed. Walls brighten towards the top, slabs show faint seams, and the legs melt into the mist below. The building itself is made in code ([`src/world.ts`](src/world.ts)): twin towers with onion domes, a tall tower crowned by a rune, a great arch and a walkway loop, a long stair, a floating pavilion and an impossible triangle in the sky.
- **Day and dusk.** The light follows the system: a warm sandy day in light mode, a teal dusk with cyan glows in dark mode. The header switch cycles Auto, Day and Dusk, and the browser remembers the choice.
- **Five doors, five buildings.** Each section is a place on the great building, marked by a small label on a fine line. Going in, the camera leans towards that door while the great building sinks into the mist. The section's own building then assembles out of it, and the white traveller steps out of its door:
  - About: the door at the foot of the twin towers leads to **the House**, two storeys with warm windows and a tree.
  - Research: the rune on the tall tower leads to **the Observatory**, whose dome and telescope turn over a rune.
  - Projects: the door at the head of the stair leads to **the Stair Tower**, switchback stairs up to a high door.
  - Activity: the crank beside the stair leads to **the Clockwork**: wheels turn, and a column of blocks turns one by one.
  - Contact: the pavilion below leads to **the Bell Tower**, a lantern room and a bell that rings as you arrive.

  The panel rises beside the building. Moving between sections, one building sinks and the next one rises; coming back, the great building assembles again.
- **A quiet intro, about five seconds.** The building assembles itself out of the mist piece by piece. The tower rises first, the stair wing slides in, the ears push up out of the roof and the bridge swings across into place. Then the traveller walks out of her door and the page fades in. Any key or tap skips it; it plays once per tab, and `?intro` replays it.
- **Research** is an index of papers. Each paper has its own page at `#research/<slug>`; with none yet, the index reads *Unlocked*.
- **Projects** follow GitHub visibility. Only public repositories are listed: one made private drops out, one made public appears. The build carries a snapshot, and opening the section asks GitHub for the current list (cached for ten minutes).
- **Activity** shows a year of commits as a heat map, synced at build.
- **Considerate.** It follows the system's reduced-motion setting and has its own pause button. *Observe* hides the page so you can look at the building. Keys: <kbd>1</kbd>–<kbd>5</kbd> open sections, <kbd>←</kbd> <kbd>→</kbd> switch between them, <kbd>Esc</kbd> steps back. On a phone the building sits on top with the sections listed below. Without WebGL2 the page falls back to the same text and list.
- **Two faces.** Jost (light, widely spaced) for everything small, and Cormorant Garamond for names and titles.

### Editing

- [`src/config.ts`](src/config.ts): your profile, **your papers** (`papers`, newest first; the file has an example entry), and display names for repositories.
- [`src/sections.ts`](src/sections.ts): the five sections' content.
- [`src/world.ts`](src/world.ts): the great building, block by block, and where each section's door is (`stations`).
- [`src/rooms.ts`](src/rooms.ts): the five buildings behind the doors.
- [`src/palettes.ts`](src/palettes.ts): the colours of day and dusk.

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

- **实时渲染的等距建筑。** 一个小巧的 WebGL2 渲染器，不依赖任何库。它使用正交等距相机，每个面取石材的三种色调之一：顶面、受光的左面、背光的右面。墙面越往上越亮，石板有淡淡的接缝，底部的柱脚融进下方的雾里。建筑本身用代码搭成（[`src/world.ts`](src/world.ts)）：带洋葱顶的双塔、顶上有符文的高塔、巨大的拱门与环形步道、长长的阶梯、漂浮的亭子，还有天上一个不可能三角。
- **白昼与暮色。** 光线跟随系统：浅色模式是温暖的沙色白昼，深色模式是青灰暮色配青色微光。右上角的开关可在 自动 / 白昼 / 暮色 之间切换，浏览器会记住你的选择。
- **五扇门，五座建筑。** 每个板块都是大建筑上的一个地点，用一根细线和小标签标出。走进去时，镜头倾向那扇门，大建筑沉入雾中；随后这个板块自己的建筑从雾里拼合出来，白衣旅人从它的门里走出：
  - About：双塔脚下的门，通往**小屋**：两层的房子，窗里亮着暖光，门前有一棵树。
  - Research：高塔顶上的符文，通往**天文台**：圆顶和望远镜在符文上方转动。
  - Projects：阶梯尽头的门，通往**阶梯塔**：折返的阶梯一路通向高处的门。
  - Activity：阶梯旁的摇柄，通往**机械钟**：轮子转动，一列石块逐个旋转。
  - Contact：下方的亭子，通往**钟楼**：顶上是灯室，你到达时钟会敲响。

  面板在建筑旁升起。在板块之间切换时，一座建筑沉下、下一座升起；返回时，大建筑重新拼合。
- **约 5 秒的安静开场。** 建筑从雾中一块一块地拼合起来：高塔先升起，阶梯翼滑入，塔顶双耳从屋顶顶出，桥旋转着咔哒一声接上。随后旅人从门里走出来，页面淡入。按任意键或轻触即可跳过；每个标签页只播一次，网址加 `?intro` 可重播。
- **Research** 是论文索引。每篇论文有自己的页面（`#research/<slug>`）；还没有论文时，列表只显示 *Unlocked*。
- **Projects** 与 GitHub 仓库的可见性同步。只列出公开仓库：设为私有就消失，设为公开就出现。构建时带一份快照，打开板块时再向 GitHub 取一次当前列表（缓存 10 分钟）。
- **Activity** 以热力图显示一年的提交记录，构建时同步。
- **体贴的细节。** 跟随系统的“减少动态效果”设置，另有暂停按钮；“Observe”隐藏页面内容，只看建筑。按键：<kbd>1</kbd>–<kbd>5</kbd> 进入板块，<kbd>←</kbd> <kbd>→</kbd> 切换，<kbd>Esc</kbd> 返回。手机上建筑在上、板块列表在下。不支持 WebGL2 时，显示同样的文字和列表。
- **两种字体。** Jost（细体、宽字距）用于小字，Cormorant Garamond 用于名字与标题。

### 修改内容

- [`src/config.ts`](src/config.ts)：个人信息、**你的论文**（`papers`，最新在前，文件里有示例条目），以及各仓库的显示名。
- [`src/sections.ts`](src/sections.ts)：五个板块的内容。
- [`src/world.ts`](src/world.ts)：大建筑的每一块，以及每个板块的门所在的位置（`stations`）。
- [`src/rooms.ts`](src/rooms.ts)：五扇门后的五座建筑。
- [`src/palettes.ts`](src/palettes.ts)：白昼与暮色的配色。

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
