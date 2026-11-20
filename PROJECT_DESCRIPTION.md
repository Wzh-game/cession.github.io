# 梦幻西游 wzhgame — 项目说明

《梦幻西游 wzhgame》是一款持续开发中的浏览器端单机 RPG，使用 HTML、CSS、JavaScript 与 Three.js 构建。

## 项目定位
- 版本方向：2.0 开放世界与仙侠成长系统
- 画面方案：凡界世界地图、识海探索地图采用 Three.js 3D 场景；战斗、角色信息、背包、装备、任务和菜单保持 2D。
- 核心玩法：门派选择、回合制战斗、Boss 挑战、装备锻造、召唤兽培养、任务成就、开放世界探索与存档管理。
- 平台：现代桌面与移动浏览器；重点适配 iPad Safari / Chrome 触控操作。

## 技术与性能策略
- Three.js 通过浏览器 ES Module 加载，需网络可访问 CDN 且浏览器支持 WebGL。
- 移动设备采用较小的可见地图半径、较低像素比、精简装饰物与约 30 FPS 的渲染节奏。
- 地图处于后台或不可见时暂停绘制，减少不必要的 GPU 占用。
- 画质档位继续保留；移动端会自动采用更保守的性能上限。
- 本项目为客户端单机游戏，游戏进度使用浏览器本地存储。

## 仓库与运行
- 在线体验：https://wzh131213-dev.github.io/cession.github.io/
- 仓库：https://github.com/wzh131213-dev/cession.github.io
- 当前开发分支：`add-save-import-export`
- 入口文件：`index.html`
- 本地运行建议通过静态 HTTP 服务打开项目，避免浏览器对 ES Module 的 file:// 限制。

## 兼容性说明
项目持续迭代中。代码检查不等于真实设备性能验证；不同 iPad 型号、浏览器、网络和 WebGL 驱动的帧率可能不同。遇到卡顿时可先将画质调至「低」。
