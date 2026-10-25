# 沙海哨站 · 界面美术资产

制作日期：2026-10-24。执行者：OpenAI Codex（基于 GPT-6）。

图片使用 **内置 image_gen.imagegen** 生成，没有使用 CLI/API 后备流程。角色保留现有蓝发、蓝眼、鱼鳍耳、女仆头饰、围裙与鲸尾特征；场景参考游戏里的浅砂岩拱门、青绿色圆顶、木箱与沙地。它们是界面宣传插画，不代表新增的地图几何、角色皮肤或可用武器。

## 当前使用的六张图

| 文件 | 位置 | 画面 |
| --- | --- | --- |
| `menu-sandwatch.webp` | 游戏开始菜单 | 蓝色肥鱼小队集结，左侧留出标题与主按钮 |
| `lobby-outpost.webp` | 游戏大厅 | 哨站露台出战准备 |
| `loading-crossfire.webp` | 随机载入背景 | 拱门交火 |
| `loading-rooftops.webp` | 随机载入背景；地图与房间缩略图 | 屋顶侧翼 |
| `loading-courtyard.webp` | 随机载入背景 | 庭院推进 |
| `armory-basin-v2.webp` | 仓库整备区 | 用户追加的铁盆形象；扶盆手已按反馈局部重绘 |

六张运行图片合计 **1,130,424 字节，约 1.08 MiB**。原尺寸 PNG 保存在 `originals/`；WebP 使用 Sharp 做格式压缩（quality 88），没有通过脚本重画图像。PNG 不参与游戏页面加载。

`originals/armory-basin.png` 是手部修正前的草稿，**不要接回游戏**。最终采用 `originals/armory-basin-v2.png`。修正了抬手的朝向、手指与盆沿的接触、手腕至袖口衔接；其余构图保持一致。

## 提示词与参考

- [主菜单、大厅、三张载入图的完整提示词](prompts.json)：使用现有 `assets/蓝色大肥鱼.png` 为角色身份参考，实际游戏截图 `tests/controls-results/04-multikill.png` 为环境参考，不复制截图 HUD。
- [铁盆形象初稿提示词](armory-prompt.json)：来自用户指定的 `C:/Users/22449/Downloads/1792732885222.jpeg`，另以实际场景截图匹配环境。
- [最终手部修正提示词](armory-hand-fix.json)：局部编辑初稿，仅修正扶盆手，不替换人物或环境。

路径均以本目录为基准。运行代码只引用项目内资源，不依赖上述外部参考文件继续存在。

## 武器预览

`weapons/rifle.png`、`pistol.png`、`fishpistol.png`、`knife.png` 是 **游戏现有 Three.js 模型的静态渲染**，不是生成式绘画。由 `tests/render-weapon-thumbs.cjs` 在独立浏览器中渲染，640 × 320 透明 PNG。打开仓库时直接使用这些图片，不反复创建 Canvas/WebGL 上下文；改动武器模型后可重跑此脚本同步预览。

## 接入与后续维护

- 视觉样式：`css/lobby.css`。HTML 中重复的旧大厅/仓库/房间样式已合并到此文件。
- 载入图与指南、焦点、菜单返回：`js/menu-ui.js`。
- `FishUI.beginLoading(mode)` 使用洗牌队列，三张图随机轮换且相邻不重复。超长载入每 9 秒切换一次；`endLoading()` 取消轮换和过期图像回调。
- 大厅空闲时预取载入图，解码结果按 URL 复用。图片失败或超时回退纯色背景，不阻塞场景构建。没有为了展示插画而人为拉长载入时间。
- 扩展图库时同时更新图目列表、图数显示与此清单；提示词尽量保持相同身份约束与场景色板。
- 目前是宣传插画层面的角色动作。若以后真正把铁盆做成可穿戴装备，应另做符合现有比例的模型与碰撞/命中规则，不把插画误当作已实现的玩法。
