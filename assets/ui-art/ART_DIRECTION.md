# 沙海哨站 · 界面美术资产

初版制作日期：2026-10-24；角色替换更新：2026-10-31。执行者：OpenAI Codex（基于 GPT-6）。

2026-11-01 追加：伪·Claude娘现已实装，新增 `equipment/claude_fake.png` 为其实际 Three.js 模型渲染预览，不佩戴头盔。仓库仍显示两个阵营，各一名可用、合计六名“敬请期待”。所有现有区域背景图（包括仓库铁盆图）均未改动；角色卡、大厅头像也不会因配装而换成戴盔图。

图片使用 **内置 image_gen.imagegen** 生成，没有使用 CLI/API 后备流程。角色保留现有蓝发、蓝眼、鱼鳍耳、女仆头饰、围裙与鲸尾特征；场景参考游戏里的浅砂岩拱门、青绿色圆顶、木箱与沙地。它们是界面宣传插画，不代表新增的地图几何、角色皮肤或可用武器。

## 当前使用的六张图

| 文件 | 位置 | 画面 |
| --- | --- | --- |
| `menu-sandwatch-cast.webp` | 游戏开始菜单 | deepseek娘主体，GPT娘与Grok娘支援，原左侧留白保留 |
| `lobby-outpost-cast.webp` | 游戏大厅 | 原哨站露台，真·Claude娘替换右侧队友，补入Kimi娘 |
| `loading-crossfire-cast.webp` | 随机载入背景 | 原拱门交火，配角替换为伪·Claude娘、Kimi娘、GPT娘、Grok娘 |
| `loading-rooftops-cast.webp` | 随机载入背景；地图与房间缩略图 | 原夕阳屋顶，Gemini娘侧翼，真·Claude娘与Grok娘在远端 |
| `loading-courtyard-cast.webp` | 随机载入背景 | 原庭院推进，真·Claude娘及GPT娘、Kimi娘、Gemini娘、Grok娘 |
| `armory-basin-v2.webp` | 仓库整备区 | 用户追加的铁盆形象；扶盆手已按反馈局部重绘 |

六张当前运行背景合计 **1,167,480 字节，约 1.11 MiB**。五张新生成原图均为 **1672 × 941**，保存在 `originals/*-cast.png`；WebP 使用 Sharp 做格式压缩（quality 88），没有通过脚本重画图像。PNG 不参与游戏页面加载。以新文件名接入，避免旧图片缓存；原版与备份保留。

按用户明确要求，仓库的 `armory-basin-v2.webp` 及对应原始 PNG **完全未修改**。SHA-256 分别为 `26e0ddb29ea91fcac05576671d68a506b5b22f43091cccf14e1eaf306e262032`、`e856d95d9d7cd36a8440728286fc7f1ed647343729739a8e8170dfeaa00b919a`，与修改前备份一致。

`originals/armory-basin.png` 是手部修正前的草稿，**不要接回游戏**。最终采用 `originals/armory-basin-v2.png`。修正了抬手的朝向、手指与盆沿的接触、手腕至袖口衔接；其余构图保持一致。

## 提示词与参考

- [主菜单、大厅、三张载入图的完整提示词](prompts.json)：使用现有 `assets/蓝色大肥鱼.png` 为角色身份参考，实际游戏截图 `tests/controls-results/04-multikill.png` 为环境参考，不复制截图 HUD。
- [铁盆形象初稿提示词](armory-prompt.json)：来自用户指定的 `C:/Users/22449/Downloads/1792732885222.jpeg`，另以实际场景截图匹配环境。
- [最终手部修正提示词](armory-hand-fix.json)：局部编辑初稿，仅修正扶盆手，不替换人物或环境。
- [本次五张图的角色替换完整提示词与输出映射](character-refresh-prompts.json)：使用内置 image_gen 编辑原图，约束背景、构图、光影、deepseek娘主体及 UI 留白不变，仅替换配角；大厅适当补一名队友。庭院因单次最多五张输入限制分两次局部编辑，最终只替换剩余远端角色。没有调用 CLI / API 后备流程。

## 未开放角色的仓库预览

`character-previews/` 下七个文件是用户提供参考图的原样复制，没有改变原素材。文件名到角色的对应为 `claude_fake.png` → 伪·Claude娘、`claude_true.jpg` → 真·Claude娘、`gpt.jpg` → GPT娘、`kimi.jpg` → kimi娘、`grok.jpg` → Grok娘、`gemini.jpg` → Gemini娘、`qwen.jpg` → Qwen娘。前六张来自素材库 `图片/Q版建模参考/` 中同名角色的正面图；Qwen 来自 `图片/Qwen娘_Q版_全身正面_白底_2x_BV1ijxB6KEJW.jpg`。

仓库展示分组：红方依次为 **伪·Claude娘、真·Claude娘、Grok娘、GPT娘**，蓝方依次为 **deepseek娘、kimi娘、Gemini娘、Qwen娘**。分组只用于仓库排版，不作为当前实际对局的队伍或角色限制；其他区域的宣传图不随本次分组改变，仓库铁盆背景也保持原样。

卡片在原图上叠加 HTML/CSS 的“敬请期待”文字条，名字位于图下，按钮保持禁用；没有新增可玩模型。使用页面文字便于后续本地化和开放角色时去除标记。按用户最新要求，deepseek娘的仓库形象、大厅角色预览和头像始终使用不戴头盔的 `equipment/deepseek.png`，不随头盔装备状态切换。原戴盔渲染图保留为历史资产，当前页面不引用；头盔装备卡和实际对局中的佩戴效果正常保留。

路径均以本目录为基准。运行代码只引用项目内资源，不依赖上述外部参考文件继续存在。

## 武器预览

`weapons/rifle.png`、`pistol.png`、`fishpistol.png`、`knife.png` 是 **游戏现有 Three.js 模型的静态渲染**，不是生成式绘画。由 `tests/render-weapon-thumbs.cjs` 在独立浏览器中渲染，640 × 320 透明 PNG。打开仓库时直接使用这些图片，不反复创建 Canvas/WebGL 上下文；改动武器模型后可重跑此脚本同步预览。

## 接入与后续维护

- 视觉样式：`css/lobby.css`。HTML 中重复的旧大厅/仓库/房间样式已合并到此文件。
- 载入图与指南、焦点、菜单返回：`js/menu-ui.js`。
- `FishUI.beginLoading(mode)` 使用洗牌队列，三张图随机轮换且相邻不重复。超长载入每 9 秒切换一次；`endLoading()` 取消轮换和过期图像回调。
- 大厅空闲时预取载入图，解码结果按 URL 复用。图片失败或超时回退纯色背景，不阻塞场景构建。没有为了展示插画而人为拉长载入时间。
- 扩展图库时同时更新图目列表、图数显示与此清单；提示词尽量保持相同身份约束与场景色板。
- 铁饭碗已作为真正装备接入，规则见 [头盔接入](../equipment/iron-rice-bowl/INTEGRATION.md)。当前 deepseek娘与伪·Claude娘可用于实战；真·Claude娘、Grok娘、GPT娘、kimi娘、Gemini娘、Qwen娘仍为宣传插画与预告，不能由插画推断已经开放玩法。
