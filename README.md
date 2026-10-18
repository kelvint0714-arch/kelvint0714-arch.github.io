# A Quiet Valley

[English](#english) · [中文](#中文)

**https://kelvint0714-arch.github.io**

---

## English

Kelvin Tang's personal homepage: one impossible building floating in the mist, in the spirit of *Monument Valley*.

### What's on the page

- **An isometric monument, rendered live.** A small WebGL2 renderer, no libraries. It uses an orthographic isometric camera, and every face takes one of its stone's three tones: top, left-lit or right-shadowed. Walls brighten towards the top, slabs show faint seams, and the legs melt into the mist below. The monument is made in code ([`src/world.ts`](src/world.ts)): a loop of walls climbs round a tall pillar, from a low block in front up two long stairs to the side landings and along the back walks to the pillar's crown. The crown is exactly where the loop's far corner is seen, so the walks arrive at it though the pillar stands in the middle. An eight-point star crowns the pillar, and over it a large impossible triangle turns slowly about the line of sight, so it stays impossible as it turns. A column of light rises into it from the rune at the star's heart; pointing at Research brightens the light and quickens the turn. Twin domed towers and a gate tower stand on the landings, and a pavilion floats in the court. The left back walk is broken by a gap where a drawbridge hangs down on its hinge. The detail is architectural rather than painted on: every outer wall stands on one base (a plinth, a blind arcade of pointed niches set back into the wall, a string course), the towers have pilasters, paired windows in niches, pointed portals, pointed merlons, pinnacles and terracotta domes on drums, and the pavilion is domed on round columns.
- **One mechanism, working by itself, and one impossible path.** Nobody turns it: a little while after the traveller comes to rest by the twin towers, the drawbridge turns up into the walk by itself, and the impossible triangle turns a third of a turn with it. She crosses the gap, climbs to the back walk and follows it to the far corner, which is seen exactly where the star crowns the pillar: on the screen the walk goes on onto the star with no step, and she arrives there. She stays a while, walks home, and the bridge goes down after her; some time later it all happens again. If she is somewhere else (out of another door, or on the star), the bridge still turns up, and she comes home across it or it goes down again by itself. A quiet line under the building says what it is doing. Pausing motion (or the system's reduced-motion setting) stops it where its present movement would end; leaving for a section resets it.
- **Day and dusk.** The light follows the system: by day a pale mint sky with cream, coral and lilac stone, teal domes and iron-red accents; at dusk a deep blue night with warm lamps. All text keeps a contrast of at least 4.5:1. The header switch cycles Auto, Day and Dusk, and the browser remembers the choice.
- **Five doors, five worlds.** Each section is a place on the great building. The chapters are listed beside the name; pointing at one (or at its glowing place on the building) shows its label on a fine line, and the building stays clear otherwise. Going in, the camera leans towards that door while the great building sinks into the mist. The sky then turns to another world's, that world's building assembles out of the mist, and the white traveller steps out of its door. Each world has its own colours, by day and by dusk, after *Monument Valley*'s levels:
  - About: the door of the twin towers leads to **the Lotus Palace**, a three-storey palace on open arcades. It has pink and periwinkle walls, two round towers under tall teal cones, a raised pool with a turning lotus, a high walk on slender legs, and two rooms cut open in its walls (a little stair, a bookshelf, a friend reading). Off to the left, a colonnaded gallery on an arched bridge leads to a domed rotunda; a lighthouse tower and a lotus-pond island with two domed pavilions float further off.
  - Research: the star on the pillar leads to **the Moonlit Ruins**, an old cloister broken open. Its two arcaded walls have collapsed in steps, and high on one a window is still full of starry night with a crescent moon. Inside are the stump of a round tower, a colonnade (two columns still carry their beam, two are broken, one lies fallen in its drums), a stair up the wall to where it broke away, and a rune turning in the floor. What was falling has stopped in the air: stones over the broken tops, a drum over its column, the stair going on step by step into the sky. Further off are the rest of the city: a broken bridge, a rotunda broken open with its dome fallen beside it, an aqueduct snapped in two, a round tower on a rock.
  - Projects: the gate tower's door leads to **the Amber Sky**: an orange sky over a sea of cloud. Three tall pillars rise there, one climbing into an impossible triangle and one round and ringed, with arched legs, a gate high on the far pillar, and a crow pacing a floating ledge. The walk goes on over an arched bridge to a domed round gate tower, and slender cone-capped columns, an observatory and round stepping stones float further off.
  - Activity: the crank leads to **the Penrose Stair**: a ring of four flights that all climb, so going round you climb for ever. It does not close: its last landing stands exactly along the line of sight from where its first flight starts, so on the screen the two are one, and the traveller's step back down along that line cannot be seen. Round it stand stairs in other gravities: up a teal block's top, along its side and straight up its face, on a tall wall's face, hanging under a ceiling in the sky, with two friends walking them. Further off are a tower with a stair winding round it, a gate of two domed towers, and a great ring with a stair through it.
  - Contact: the pavilion leads to **the Violet Tree**, a long violet aqueduct on arches with a lower walk and stairs. A door pours a beam of light up a wave of a ramp, golden rings turn over it, and a tree of pink cubes breathes on a slender round column out in front. The aqueduct goes on to the left to a domed round tower, past another tree and a lilac rotunda.

  Every world reaches across the whole page: its building is framed beside the panel, and the rest of it stands off in the haze behind the frosted panel (behind the words, on the overview, a far city of towers, a rotunda and a shrine). The panel rises beside the building. Moving between sections, the traveller goes in through her door (or down with her building), that world's lights go out and it sinks whole into the mist, and the next one rises; she comes out of its door once it stands complete. She walks on two feet, step by step with the ground she covers. Nothing fades in like a picture laid over the page: every piece is solid from its first moment. Standing in the mist it rises out of the mist; standing on another piece it rises up through that piece's top, and nothing of it below that floor is drawn, so it never shows passing through anything; floating, or with something in the way, it grows out of itself, which never takes it past where it will stand. Lights come on only once their building stands, opening out from their source; the beam of light pours out of its door and reaches up the ramp. The traveller keeps her feet on whatever is under her (each stair step, the curve of a ramp), and `npm run check:walks` sweeps her body along every walk.
- **A short entrance, and an opening on request.** The page itself opens in a few seconds: the monument rises out of the mist and the traveller steps out. The full opening (about seventeen seconds, after Monument Valley's) plays from *Replay the opening* at the foot of the page or with `?intro`. A chapter card (*Ⅰ · A Quiet Valley*) comes in letter by letter over an empty sky, where the clouds drift. Then the world turns a quarter round into its isometric angle as the camera draws back and the clouds part, and the impossible triangle is drawn in the air edge by edge, as one stroke: along, up, towards the eye; its corner closes it as the turn settles. Then the monument rises round it, solid, out of the mist: the pillar and the walls, the towers, the star coming up out of the pillar's crown, the two stairs folding out of the front block. The five places light up one by one, the traveller steps out of her door, the monument glides aside and the page comes in. Any key or tap skips it.
- **Research** is an index of papers. Each paper has its own page at `#research/<slug>`; with none yet, the index reads *Unlocked*.
- **Projects** follow GitHub visibility. Only public repositories are listed: one made private drops out, one made public appears. The build carries a snapshot, and opening the section asks GitHub for the current list (cached for ten minutes).
- **Activity** shows a year of commits as a heat map, synced at build.
- **Considerate.** It follows the system's reduced-motion setting and has its own pause button. *Observe* hides the page so you can look at the building. Keys: <kbd>1</kbd>–<kbd>5</kbd> open sections, <kbd>←</kbd> <kbd>→</kbd> switch between them, <kbd>Esc</kbd> steps back. On a phone the building sits on top with the sections listed below, and scrolls away with the page (it stops drawing while out of sight). Without WebGL2 the page falls back to the same text and list.
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
- `?v2`: the *Quiet Valley V2* upload (a Canvas 2D prototype, in [`src/quiet/`](src/quiet/), notes in [`QUIET-VALLEY-V2.md`](QUIET-VALLEY-V2.md)), kept whole. [`index.html`](index.html) loads [`src/quiet-entry.ts`](src/quiet-entry.ts), which picks it or the WebGL valley.
- `npm run check:walks`: sweeps the traveller along every walk, the bridge crossing included.

### Deployment

Pushing to `main` builds the site with GitHub Actions and deploys it to GitHub Pages. It also redeploys every day at 04:00 Beijing time to refresh the GitHub data.

The previous design, a black hole called *Event Horizon*, is kept at the tag `v4-event-horizon`.

---

## 中文

Kelvin Tang 的个人主页：一座悬浮在雾中的不可能建筑，致敬《纪念碑谷》。

### 页面上有什么

- **实时渲染的等距纪念碑。** 一个小巧的 WebGL2 渲染器，不依赖任何库。它使用正交等距相机，每个面取石材的三种色调之一：顶面、受光的左面、背光的右面。墙面越往上越亮，石板有淡淡的接缝，底部的柱脚融进下方的雾里。纪念碑用代码搭成（[`src/world.ts`](src/world.ts)）：一圈环墙绕着中央的高柱攀升，从前方低处的石块沿两道长阶梯上到两侧平台，再沿后方步道走到高柱顶上。柱顶正好是环墙远角被看到的位置，所以步道“走到”了柱顶，尽管柱子立在环的正中。柱顶是一颗八角星，星的上方悬着一个大的不可能三角，绕视线方向缓缓旋转，转动时始终保持“不可能”。一道光从星心的符文升入三角；鼠标指向 Research 时光会变亮、三角转得更快。两侧平台上立着洋葱顶双塔和门楼，庭院中漂着一座亭子。左侧的后方步道断开一个缺口，一座吊桥绕着铰链垂挂在那里。细节是真正的建筑结构而不是贴图：所有外墙立在同一个基座上（勒脚、一排凹进墙里的尖拱盲拱廊、腰线），塔楼有壁柱、壁龛里的双窗、尖拱门廊、尖形雉堞、小尖塔和立在鼓座上的赤陶色穹顶，亭子则是圆柱撑起的穹顶。
- **一个自己运转的机关，一条不可能的路。** 不需要任何人操作：旅人在双塔旁站定片刻后，吊桥自己转起来接上步道，不可能三角随之转过三分之一圈。她走过缺口，登上后方步道，一直走到远角；那个远角在屏幕上恰好就是高柱顶上的八角星，所以步道在画面上毫无断点地接上了星，她也就站到了星上。她在星上停留一会儿再走回来，吊桥随后放下；过一阵，这一切又会重来一遍。如果她在别处（从别的门里走出来，或站在星上），吊桥照样自己抬起：她在星上就沿桥走回来，否则桥停一会儿再自己放下。建筑下方有一行小字说明机关正在做什么。暂停动画（或系统开启“减少动态效果”）时，机关直接停在当前动作结束的状态；中途进入板块会让它复位。
- **白昼与暮色。** 光线跟随系统：白昼是淡薄荷色的天空，奶油、珊瑚和淡紫色的石头，青绿色穹顶和铁红色点缀；暮色是深蓝的夜晚配暖色灯火。所有文字的对比度都不低于 4.5:1。右上角的开关可在 自动 / 白昼 / 暮色 之间切换，浏览器会记住你的选择。
- **五扇门，五个世界。** 每个板块都是大建筑上的一个地点。名字旁边列着各章；指向某一章（或建筑上它发光的位置）时，才用一根细线和小标签标出它，平时建筑上不挂任何标签。走进去时，镜头倾向那扇门，大建筑沉入雾中；随后天空换成另一个世界的颜色，那里的建筑从雾里拼合出来，白衣旅人从它的门里走出。每个世界都有自己的配色（白昼与暮色各一套），致敬《纪念碑谷》的关卡：
  - About：双塔的门，通往**莲花宫**：建在开敞拱廊上的三层宫殿，粉色与长春花蓝的墙，两座戴着青绿尖顶的圆塔，抬高的水池里一朵慢慢旋转的莲花，细柱撑起的高廊，墙上剖开两间小屋（小楼梯、书架、正在读书的朋友）。左边远处，一道拱桥上的柱廊通向一座穹顶圆亭；更远处漂着一座灯塔和一座有两座小穹顶亭子的莲池小岛。
  - Research：柱顶的星，通往**月下废墟**：一座残破的回廊。两面拱廊墙阶梯状地塌下，其中一面高处还留着一扇装满星夜和新月的窗。里面有圆塔的残基、一排柱廊（两根仍托着横梁，两根折断，一根倒在地上散成几节）、一道沿墙而上、通到断口的阶梯，以及地面上旋转的符文。正在坠落的东西停在了半空：断墙顶上的石块、断柱上方的一节柱身、阶梯一级一级地继续伸向天空。更远处是这座城的其余部分：一道断桥、一座穹顶塌落在旁的残破圆亭、断成两截的水道、岩石上的圆塔。
  - Projects：门楼的门，通往**琥珀天空**：橙色天空下是云海，三根高柱，一根爬进一个不可能三角，一根是带环的圆柱；有拱腿、远处柱顶的门，还有一只在浮台上来回踱步的乌鸦。步道沿一座拱桥延伸到一座穹顶圆门塔，更远处漂着戴尖顶的细圆柱、一座天文台和一串圆形踏石。
  - Activity：摇柄，通往**彭罗斯阶梯**：四段阶梯围成一圈，每一段都在向上，绕一圈就永远在向上走。它其实并不闭合：最后一个平台恰好位于第一段阶梯起点沿视线方向的位置，所以在屏幕上两者重合，旅人沿视线退回起点的那一步谁也看不见。周围是不同重力方向的阶梯：在青色巨石的顶上、侧面、正面直上，在高墙的墙面上，倒挂在空中的天花板下，还有两位朋友各自走在上面。更远处有一座阶梯盘旋而上的圆塔、一座由两座穹顶塔组成的门，以及一个穿着阶梯的巨大圆环。
  - Contact：亭子，通往**紫罗兰之树**：长长的紫色拱桥水道，带下层步道和阶梯；一扇门把光束洒上波浪形的坡道，金色圆环在上方旋转，前方细圆柱上一棵粉色方块组成的树在轻轻呼吸。水道向左延伸到一座穹顶圆塔，途经另一棵树和一座淡紫色圆亭。

  每个世界都铺满整个页面：建筑本身被框在面板旁边，其余部分立在磨砂面板后面的薄雾里（首页的文字后面则是一座远方的城：塔、圆亭和神龛）。面板在建筑旁升起。在板块之间切换时，旅人从她的门走进去（或随建筑一起沉下），这个世界先熄灯，再整体沉入雾中，下一个世界随后升起；新建筑完全拼好后她才从门里走出。她用两只脚走路，步子跟着走过的地面一步一步迈出。没有任何东西像贴图一样淡入：每个构件从出现的第一刻起就是实体。立在雾中的从雾里升起；立在别的构件上的，从那块构件的顶面升出来，低于那层地面的部分一律不画，所以永远看不到它穿过任何东西；悬浮的、或上升路线被挡住的，则从自身长出来，永远不会超出它最终所在的位置。灯光要等建筑立好才亮，从光源处向外展开；门里的光束会沿坡道一路照出去。旅人的脚始终踩在脚下的东西上（每一级台阶、坡道的弧面），`npm run check:walks` 会沿每条路线检查她的身体有没有穿过任何东西。
- **简短的入场，完整的开场随时可看。** 打开页面只需几秒：纪念碑从雾中升起，旅人从门里走出。完整的开场（约 17 秒，仿照《纪念碑谷》）可以点页面底部的 *Replay the opening*，或在网址后加 `?intro` 观看。 空旷的天空里云在飘，章节卡（*Ⅰ · A Quiet Valley*）一个字母一个字母地浮现。随后整个世界旋转四分之一圈，转到等距视角，镜头缓缓拉远，云层散开；不可能三角在空中一笔画出：先沿水平方向，再向上，再朝向观者，转动停稳时最后一角把它闭合。然后纪念碑以实体从雾中升起：高柱和环墙、塔楼、从柱顶升起的八角星、从前方石块中折出的两道阶梯。五处地点依次亮起，旅人从门里走出，纪念碑滑到一旁，页面淡入。按任意键或轻触即可跳过。
- **Research** 是论文索引。每篇论文有自己的页面（`#research/<slug>`）；还没有论文时，列表只显示 *Unlocked*。
- **Projects** 与 GitHub 仓库的可见性同步。只列出公开仓库：设为私有就消失，设为公开就出现。构建时带一份快照，打开板块时再向 GitHub 取一次当前列表（缓存 10 分钟）。
- **Activity** 以热力图显示一年的提交记录，构建时同步。
- **体贴的细节。** 跟随系统的“减少动态效果”设置，另有暂停按钮；“Observe”隐藏页面内容，只看建筑。按键：<kbd>1</kbd>–<kbd>5</kbd> 进入板块，<kbd>←</kbd> <kbd>→</kbd> 切换，<kbd>Esc</kbd> 返回。手机上建筑在上、板块列表在下，建筑随页面一起滚走（滚出屏幕后暂停绘制）。不支持 WebGL2 时，显示同样的文字和列表。
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
- `?v2`：上传的 *Quiet Valley V2*（Canvas 2D 原型，代码在 [`src/quiet/`](src/quiet/)，说明见 [`QUIET-VALLEY-V2.md`](QUIET-VALLEY-V2.md)），原样保留。[`index.html`](index.html) 加载 [`src/quiet-entry.ts`](src/quiet-entry.ts)，由它决定打开 V2 还是 WebGL 版。
- `npm run check:walks`：沿每条路线（包括过桥的那条）检查旅人有没有穿模。

### 部署

推送到 `main` 后由 GitHub Actions 构建并发布到 GitHub Pages；每天北京时间 04:00 还会自动重新部署一次，刷新 GitHub 数据。

之前的黑洞设计（*Event Horizon*）保存在标签 `v4-event-horizon`。
