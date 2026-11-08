# 战术护目镜接入说明

2026-11-08，OpenAI Codex。原始资产：`D:\DSH\素材库\游戏专用素材\蓝色肥鱼大作战专用\模型&动画\装备模型\战术护目镜·识别到违规IP`。素材库不修改。

## 资源与挂点

| 角色 ID | 原素材版本 | 原 GLB 字节 | 三角面 |
| --- | --- | ---: | ---: |
| `deepseek` | `WhaleMaid` | 46,480 | 2,068 |
| `claude_fake` | `PseudoClaude` | 46,500 | 2,068 |
| `claude_true` | `TrueClaude` | 46,500 | 2,068 |

三份都是同款装备的**不同头型几何**，不能简单共用第一份并缩放。`tools/build-goggles-assets.cjs` 对照源 manifest 的 SHA256 校验后，仅输出三份 JS/Base64 和一个紧凑 manifest，合计 **187,824 字节（约 183.4 KiB）**。HTTP 与 `file://` 共用，不另复制 GLB、Blender 工程、角色网格、动画或验证预览。每份为 6 个材质 / 6 个图元、无纹理。

`js/goggles.js` 按角色 ID 缓存并发加载。`FishCharacters.load()` 只加载本次需要的头型版本。`FishGoggles.attach(rig)` 将源 `fit_profiles.json` 的 position / quaternion / scale 原样应用到装备根节点，再挂 `rig.bones.Head`。这些数据已经是 glTF / Three.js 坐标，不能再次旋转 90°，角色自身的 2 倍世界比例由骨架继承。

透明镜片材质为 `Goggles_Smoke_Blue_Transparent_Lens`：透明度 0.32、双面、`depthWrite=false`、不投射 / 接收阴影；镜框和绑带使用现有金属风格并正常投影。只读几何 / 材质标记 `artShared`，实例清理不会销毁其他角色正在使用的资源。

仓库装备预览 `assets/ui-art/equipment/tactical-goggles.png` 由实际模型渲染，114,438 字节。模型载荷加该预览共 **302,262 字节（约 295.2 KiB）**；角色选择的原预览和仓库背景不改。

## 生命周期

- `equipHeadgear()` 统一处理头盔 / 护目镜互斥，换装先移除旧实例。
- 镜片不会出现在本地第一人称双臂上。世界完整角色仍存在，用既有 shadow-only 渲染保留镜框 / 绑带投影，其他观察视角可以看到装备。
- 第四次头部伤害仍减少 20%，随后移除护目镜实例并结束侦察效果。
- 玩家死亡产生独立尸体骨架，将护目镜以相同局部坐标转移到尸体 Head；复活移除尸体并重新配发四次耐久。护目镜没有另加掉地物理，原铁饭碗掉落流程保留。
- 侦察仍限定真·Claude + 护目镜 + 狙击 + 右键开镜，V 激活 3 秒 / 冷却 60 秒，死亡不重置冷却。
- AI 同样必须满足角色、完好装备、狙击与开镜条件；换弹、跳跃、投雷和切枪期间不能启用。侦察位置只供自身决策，3 秒结束即停止刷新；死亡、复活和换回合保留冷却截止时间。狙击与侦察行为见 [专门说明](../../FPS_狙击与侦察AI说明.md)。

## 配装数据

仓库保留旧存档键 `bff_loadout_v1`，内容升级为 `version:2`。`loadouts.red` / `loadouts.blue` 分别保存主、副、近战、头部、手雷 / 护盾占位规则；`skins` 保存角色。顶层装备字段只用于旧接口兼容，镜像当前 `team`，不再作为修改入口。

UI、游戏入口、未来新装备请使用 `FishEquipment.choices(slot, team)`、`equip(loadout, team, slot, id)` 和 `forTeam(loadout, team)`。`head` 是唯一头部槽，可选择头盔 / 护目镜 / null。`grenade` 与 `shield` 当前是只读配发 / 局内拾取说明，不能借仓库带入额外物品。

重建运行资源：`node tools/build-goggles-assets.cjs`。原资产可作为第二个命令行参数。验证：`node tests/goggles-pack-test.cjs`、`node tests/equipment-test.cjs`、`node tests/browser-goggles-armory-test.cjs`。生成预览：`node tools/render-goggles-previews.cjs`。浏览器脚本通过 `PLAYWRIGHT_MODULE` 指定 Playwright 路径，可用 `FISH_TEST_URL` 指定 HTTP 或 `file://` 入口。
