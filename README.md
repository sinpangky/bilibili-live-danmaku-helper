# B站直播弹幕助手 | Bilibili Live Danmaku Helper

**一键 +1 复读、收藏弹幕、快捷发送、独轮车循环发送。让 B 站直播间互动更方便。**

一个免费、开源的 Chrome、Edge 和桌面 Firefox 扩展，专为哔哩哔哩（Bilibili）直播间设计。

*An open-source Chrome, Edge and Firefox extension for Bilibili Live. One-click danmaku repetition, copying, favorites, quick replies, automatic message rotation, and fullscreen support.*

[下载安装](#安装) · [查看源码](https://github.com/sinpangky/bilibili-live-danmaku-helper) · [隐私说明](PRIVACY.md)

> 适用平台：B站网页版直播间 `live.bilibili.com`  
> 源码版本：v0.0.4 · Manifest V3 · 简体中文界面

## 它能做什么？

看直播时，遇到想复读的弹幕，不必自己重新输入。

把鼠标放在弹幕上，就能直接操作。

- **一键 +1 / 复读弹幕**：悬停直播画面中的弹幕，点击 `+1` 即可发送相同内容。支持文字、Unicode Emoji 和 B 站表情。
- **复制与快捷回复**：直接复制弹幕，或者一键填入 `@发送者`，继续输入回复。
- **弹幕收藏夹**：收藏喜欢的弹幕，按直播间分类管理，随时重新发送。
- **独轮车 / 循环发送**：输入多行弹幕，按固定或随机间隔自动循环发送，支持次数、时长与长文本分段设置。
- **全屏也能操作**：支持直播间普通模式、网页全屏和播放器全屏。
- **侧边聊天栏快捷操作**：可选开启聊天栏中的 +1、复制、收藏和回复按钮。
- **快捷键与本地备份**：使用 `Alt+Q` 打开功能面板，支持数字键快捷发送收藏，并可导入、导出 JSON 数据。

## 安装

### Firefox 桌面版（140 及以上）

1. 下载 [Firefox 签名安装包（v0.0.4，.xpi）](https://github.com/sinpangky/bilibili-live-danmaku-helper/releases/download/v0.0.4/bililive-danmaku-plus-one-firefox-v0.0.4.xpi)。
2. 在 Firefox 地址栏输入 `about:addons`，点击齿轮菜单，选择 **从文件安装附加组件**。
3. 选中下载的 `.xpi` 文件，按提示确认安装。该版本已获 Mozilla 签名，重启 Firefox 后仍可使用。

### Chrome / Edge

1. 下载 [Chrome / Edge 安装包（v0.0.4，.zip）](https://github.com/sinpangky/bilibili-live-danmaku-helper/releases/download/v0.0.4/bililive-danmaku-plus-one-v0.0.4.zip)，解压到一个会长期保留的文件夹。
2. 在 Chrome 地址栏输入 `chrome://extensions`，或在 Edge 地址栏输入 `edge://extensions`，打开 **开发者模式**。
3. 点击 **加载已解压的扩展程序**（英文界面为 **Load unpacked**），选择直接包含 `manifest.json` 的文件夹。安装后请保留该文件夹，浏览器会继续从中读取扩展。

安装完成后，打开或刷新一个 [B 站直播间](https://live.bilibili.com/)，将鼠标移到一条弹幕上即可看到 `+1` 按钮。

### 从源码构建

[GitHub Releases](https://github.com/sinpangky/bilibili-live-danmaku-helper/releases) 提供已发布版本。要从当前源码生成两个 ZIP，请使用项目要求的 Node.js 版本，在仓库根目录运行：

```sh
npm ci
npm run package
```

两个安装包写入 `dist/`。开发时可分别加载 `build/firefox/manifest.json` 和 `build/extension/`。已安装 Firefox 和 geckodriver 时，运行 `npm run test:firefox` 可在临时浏览器配置中测试发送、设置和日志。自定义安装位置可通过 `DANMAKU_E2E_FIREFOX_PATH` 和 `DANMAKU_GECKODRIVER` 指定。

## 常用操作

| 操作 | 功能 |
|---|---|
| 悬停滚动弹幕 | 显示 +1、复制、收藏、回复 |
| 点击 +1 | 复读当前弹幕 |
| 点击收藏 | 保存到当前直播间收藏夹 |
| 点击回复 | 在输入框中填入 @发送者 |
| `Alt+Q` | 打开或关闭功能面板 |
| 收藏面板中按 `1`–`9` | 发送对应的可见收藏 |
| `Esc` | 返回上级收藏列表或关闭面板 |
| `Alt+单击` | 弹幕识别失败时尝试直接复读（可关闭） |

更多功能与设置详见完整使用文档。

## 为什么选择这个插件？

**不仅能 +1，还能保存喜欢的弹幕。**

不同直播间的收藏分别管理，也可以搜索、排序、快捷发送和跨直播间添加。

**全屏状态下仍可复读和发送。**

文字及支持混排的表情通过 B 站官方弹幕接口发送，不需要先退出全屏，也不会覆盖输入框中尚未发送的草稿。

**支持常见的 B 站表情。**

不仅处理普通文本，还能识别 Unicode Emoji、B 站小表情以及部分直播间专属表情。专属表情的发送受账号权限限制。

**数据由自己保管。**

收藏默认保存在浏览器本地，可手动备份或授权同步到本地 JSON 文件。插件不包含广告、分析或跟踪服务，也不会向开发者服务器上传收藏。

## 常见问题

**Q：有没有可以在 B 站直播间一键复读弹幕的插件？**

有。本插件支持在直播画面中悬停弹幕，显示 `+1` 按钮，无需手动复制粘贴，也支持可选的侧边聊天栏操作。

**Q：能在 B 站直播间自动循环发送弹幕吗？**

可以。内置独轮车功能，支持多行文本循环发送、固定或随机间隔、发送次数和总时长设置。需要用户自行启动。

**Q：B站直播全屏可以发送弹幕吗？**

支持普通页面、网页全屏和播放器全屏。发送需要正常登录，并受到 B 站发言权限和接口限制。

**Q：收藏会跨设备自动同步吗？**

弹幕收藏默认保存在当前浏览器本地，不会自动跨设备同步。Firefox、Chrome 和 Edge 都可通过 JSON 文件导入、导出收藏。浏览器提供目录选择器时，还可授权本地目录自动备份。

**Q：支持手机 B 站 App 或其他直播平台吗？**

不支持。目前仅支持电脑浏览器中的 `live.bilibili.com`，不支持 B 站手机客户端、斗鱼、虎牙或抖音。

**Q：是否支持绕过禁言或平台发送限制？**

不支持。独轮车与普通发送均受 B 站平台限制，请合理设置发送频率，避免影响其他观众或触发风控。

## 开源、隐私与开发

本项目基于 [SadUnicorn171/danmaku-echo](https://github.com/SadUnicorn171/danmaku-echo) v2.2.0 修改，专注 B 站直播体验。

- [版本更新记录](CHANGELOG.md)
- [隐私政策](PRIVACY.md)
- [上游与修改说明](NOTICE.md)
- [开源许可证](LICENSE)

使用 TypeScript 和 Vue 开发。构建需要 Node.js 22.22.2+（22.x）或 24.15.0 及以上，运行 `npm run check` 可验证两种扩展清单并执行项目测试。

**搜索关键词：** B站直播弹幕助手、B站弹幕复读插件、弹幕+1、一键复读、B站独轮车、直播弹幕收藏、Bilibili Live Danmaku、Chrome Extension。
