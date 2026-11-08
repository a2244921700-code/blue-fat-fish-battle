战术头盔·铁饭碗 / Tactical Helmet - Iron Rice Bowl

游戏资源
Tactical_Helmet_Iron_Rice_Bowl.glb
只有头盔，1 个网格、1 个金属材质、1920 个三角面；没有角色、骨骼、动画或外部贴图依赖。
有封闭顶部、空心内壁和卷边。使用平滑着色，钢材 metallic=1、roughness=0.28。
尺寸约 0.544 × 0.544 × 0.270 米，对应当前约 1 米高的鲸鱼娘角色比例。
材质的银灰色光泽来自场景灯光和环境反射；在游戏中使用已有的环境贴图/照明即可。

编辑工程
Tactical_Helmet_Iron_Rice_Bowl.blend：单独头盔工程，仅有装备网格。
source/Tactical_Helmet_Iron_Rice_Bowl_Character_Fit.blend：包含原角色的佩戴检查工程，头盔已跟随 Head 骨骼。
角色原始交付文件没有改动；装备需要单独载入。source 中的角色仅用来调整贴合，不应作为装备一起导出。
previews 中包含佩戴正面、侧面、整体以及独立外观、内壁预览。

Three.js / React Three Fiber 接入
配套角色：WhaleMaid_FPS_v004.glb。头盔原点位于开口中心，glTF +Y 向上、+Z 向前，单位米。
将整个 helmetGltf.scene 添加到角色 Head 骨骼，再应用 manifest.json 的 mount.matrix_column_major。
可直接使用本目录的 attach_helmet.js：
const equipped = equipIronRiceBowl(characterGltf.scene, helmetGltf.scene, manifest);
卸下时调用 equipped.removeFromParent()。实例间可共享静态几何和材质，卸下单个实例时不要销毁其他实例仍在使用的共享资源。
挂接后由 Head 骨骼带动，不需要给头盔另做骨骼或动画，也不要再手动加角色身高。
角色整体缩放应作用于完整角色外层；头盔随父级继承缩放。
近似挂接偏移为 Head 局部 [-0.000625, 0.193163, -0.031825] 米；请以 manifest 的完整矩阵为准。

贴合验证
按照现有角色 90 个动作的 2839 帧头顶运动范围确定内腔，保持眉眼与耳朵可见。
用实际头盔 GLB 和角色 GLB 构建 Head 挂接测试，并将 450 个姿势与源工程比较。
具体误差与余量见 reports/fit_validation.json，格式检查见 reports/gltf_validation.json。
这是对当前角色和当前动作包的检查；更换发型、体型或制作新的夸张头发动作时，应重新检查贴合。

脚本与参考
scripts 中保留尺寸测量、建模、导出及验证脚本。
reference/Reference_Iron_Rice_Bowl.jpg 是本次提供的参考图。
Blender 工程预览使用自带 CC0 Studio HDRI；许可说明保存在 reference/Studio_HDRI_License.txt。
GLB 本身不包含预览灯光、环境贴图或角色。
