# 🐑 小羊桌面电子宠物 · Sheep Desktop Pet

一只常驻在 macOS 桌面右下角的电子宠物小羊——原型来自我自己的真实小羊玩偶（白色蓬松毛、大眼睛、两只卷羊角）。

An Electron-based desktop pet: a fluffy sheep (modeled after my real plush toy) that lives in the corner of your screen — feed her, bathe her, dress her up, and pet her like a cat.

<p align="center">
  <img src="assets/overview.png" alt="小羊桌宠 · 功能与服装总览" width="720">
</p>

## ✨ 功能 Features

- 🍎 **喂食** — 一天至少喂一次，饿了会委屈地哭，眼泪会慢慢淹没自己
- 🫧 **洗澡** — 完整五步流程：脱衣 → 淋浴 → 泡泡 → 甩干 → 吹干；一周不洗会渐渐变成灰色小羊
- 👗 **换装衣柜** — 把任意换装插画 PNG 放进 `outfits/` 文件夹，会自动出现在换装面板里（旗袍、Lolita、JK、羽绒服、过年马甲……）
- 🌤 **真实天气联动** — 接入 open-meteo 天气 API + IP 定位，出门场景与现实天气同步，并按气温推荐当日穿搭
- 🌿 **出门散步** — 草坪场景（太阳、云、蝴蝶、随风摇摆的草），平时也会自己沿屏幕底边散步、偶尔打盹
- 💗 **撸羊** — 鼠标来回滑动可以像撸猫一样撸她：眯眼、冒爱心、脑袋蹭蹭你
- 📊 **养成状态** — 食物 / 清洁 / 体力 / 心情四条状态条，困了呼吸会变慢，夜里会睡觉冒 💤
- 🪟 **不打扰工作** — 透明无边框置顶悬浮窗 + 点击穿透，平时缩成 66px 小小一只，点击才展开面板

## 🚀 运行 Run

```bash
npm install
npm start
```

macOS 下也可以直接双击 **「启动小羊.command」** 一键启动。

## 🛠 技术 Tech

- [Electron](https://www.electronjs.org/) — 透明无边框窗口、点击穿透（`setIgnoreMouseEvents`）、开机自启
- 原生 JavaScript + Canvas 动画（呼吸、眨眼、哭泣水位、洗澡泡泡等）
- [open-meteo](https://open-meteo.com/) 免费天气 API
- 角色插画走 AI 生图路线：`assets/AI绘图提示词.txt` 里存有保证「同一只羊」跨图一致的提示词规范

## 📁 结构 Structure

```
sheep-pet/
├─ main.js          Electron 主进程（窗口/穿透/衣柜读取/开机自启/拖动）
├─ preload.js       安全桥接 API
├─ index.html       界面与样式
├─ renderer.js      小羊全部行为逻辑
├─ assets/          主体图片、AI 绘图提示词、场景素材
├─ outfits/         「衣柜」：放进去的换装图自动可用
└─ parts/           五官/四肢/表情/场景等拆分素材
```

## 💡 关于这个项目 About

这是一个借助 AI（Claude Code / Codex）协作完成的个人项目：从需求设计、画风迭代（卡通 Canvas → 半写实厚涂 AI 插画）、到 GitHub 成熟桌面宠物方案调研（如经典的 eSheep），全程由我主导产品设计与验收，AI 负责代码实现。

She is based on a real plush sheep, and she must be fed. 🐑
