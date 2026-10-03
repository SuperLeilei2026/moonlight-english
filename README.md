![深夜来客：用英文对话和寻找线索推动剧情的浏览器游戏](./docs/cover.png)

# 深夜来客 · Moonlight English

**用英语，玩进一个故事。** 敲开 Mabel 的门，寻找失踪的猫屋主，让每一句话改变接下来发生的事。

[**在线试玩 →**](https://superleilei2026.github.io/moonlight-english/) · [玩法](#可以玩什么) · [本地运行](#本机预览与修改) · [头图制作说明](./docs/cover-notes.md)

两章独立可玩的浏览器游戏：角色会记住你的选择，物品可以用来追问证据，猜错也能继续。头图是玩法示意插画，参考 City Afterimage 的编辑式海报呈现；实际游戏可以从上面的试玩入口打开。

**解压后直接用浏览器打开 `index.html`，就可以玩。** 图标、场景、脚本均在包内，不需要安装依赖、注册账号或填写 API 密钥。需要修改代码或使用稳定的同源存档时，建议按下面的方法启动本机预览。

## 可以玩什么

- **第一章「借一杯茶」**：第一次回应就可以直接开口，也可以使用预设句；说服 Mabel 邀请你进去，发现猫的秘密，或靠一件可退货的披风逗笑她。三个结局，成功后可以直接继续第二章。
- **第二章「消失的屋主」**：探索客厅、厨房和温室；收集并出示证据，和鸽子 Pip 交涉，用茶匙敲出暗号。两条入场路线、误判后道歉、只能送一次的饼干，以及隐藏结局。
- **自动存档**：恢复所在房间、物品、角色关系和已遇见的结局；支持导出、恢复 JSON 备份。第一章恢复到当前节点，第二章普通对话从当前场景重新接入；敲到一半的暗号和结局画面会单独恢复。
- **学习辅助**：中文提示开关、按当前进度给暗示、故事记录里的参考表达。
- **从第一句开口**：敲门后的第一次回应和关键证据追问都可以自由说或写；浏览器先把语音转成可编辑文字，再由本地剧情规则判断沟通意图。
- **延迟迁移**：成功追问后安排 24 小时后的新情境，不先展示旧答案，检查能否把同一种沟通能力带过去。
- **自由聊天**：整理当前剧情和真实选择，复制到你使用的 AI 聊天应用继续。如果聊天应用支持语音，可以在那里开口接戏。

游戏本体使用预先编写的分支，没有在公开前端保存模型密钥，也不做发音评分或自动换算雅思分数。关键练习台词使用随网页发布的预生成角色语音；自由回答的转写由浏览器提供，兼容性和是否使用浏览器厂商服务取决于当前浏览器。文字输入始终可用。

剧情意图判断是有限、可解释的本地规则，不是通用 AI 理解。支持页面工具的 Codex 可以读取用户主动提交的练习，并将一条反馈保存回来；普通浏览器仍可通过“自由聊天”复制内容给其他 AI。

这是两章剧情游戏的独立项目，专注于在故事中使用英语。

## 本机预览与修改

可直接打开 `index.html`。部分浏览器会限制本地文件的存储、剪贴板或语音识别；无法持久保存时，页面会提示「暂存于本次会话」，语音不可用时可以直接输入。完整语音体验建议使用 GitHub Pages 的 HTTPS 地址或本机预览。

如果安装了 **Node.js 20 或更新版本**，在本文件所在目录运行：

```sh
npm run dev
```

打开终端显示的地址，默认是 `http://127.0.0.1:4173`。本项目没有 npm 依赖，无需 `npm install`。修改章节 HTML 后需要重新构建模板：

```sh
npm run build
npm run check
```

`npm run build` 生成 `dist/`，只包含运行网页需要的文件。`npm run check` 检查语法、相对资源路径、独立运行依赖、模板一致性，以及存档恢复、损坏文件和存储不可用的行为。

## 上传 GitHub 并变成可分享的网页

### 1. 上传项目

在 GitHub 新建仓库，例如 `moonlight-english`。将**解压后的项目文件**上传到仓库根目录；根目录应直接看到 `index.html`、`package.json`、`assets/`、`chapters/` 等。不要只上传 ZIP，也不要在仓库中多套一层项目目录。

请保留隐藏目录 **`.github/workflows/`**。在 macOS Finder 中可用 `Command + Shift + .` 显示隐藏文件。你也可以通过 Git 客户端上传整个项目；`.gitignore` 会排除生成文件、日志和本地环境文件。

### 2. 开启 GitHub Pages

在仓库进入 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。

### 3. 第一次发布

进入 **Actions → Deploy Moonlight English → Run workflow**。成功后到 **Settings → Pages → Visit site** 打开网址。之后推送到 `main` 分支会自动检查、构建并发布；主分支名称不同的话，请修改 `.github/workflows/pages.yml` 中的 `branches`。

工作流仅发布 `dist/`。资源使用相对路径，因此可以部署到 `https://用户名.github.io/仓库名/` 这样的项目子目录。

如果只用 GitHub 网页上传、漏掉了 `.github` 目录，也可以先使用无需构建的发布方式：在 **Settings → Pages** 选择 **Deploy from a branch → main → /(root)**。随包的 `index.html` 和已生成模板已经可以直接运行。后续若改动 `chapters/*.html`，先运行 `npm run build` 更新 `assets/templates.js` 再上传。两种发布方式选一种即可。

GitHub Free 使用公开仓库发布 Pages；其他仓库可见性取决于账号方案。本包不包含密钥或私人学习记录。

官方说明：[自定义 Pages 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[配置发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)、[创建 Pages 站点](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)。发布状态可在本仓库的 Actions 中查看。

## 存档与隐私

进度保存在当前浏览器的 `localStorage`，键为 `moonlight-english:save:v1`。没有账号、服务器或云同步；换设备、清理数据、使用无痕窗口可能使存档不可用。可用「故事记录 → 导出存档」备份，再在另一设备上恢复。恢复前会确认覆盖。

保存的内容只有虚构故事中的选择、物品和进度。点击「复制剧情」不会自动发送到任何外部 AI 服务，也不会把聊天应用里的后续对话自动写回游戏。

在同一域名下部署多份本项目时，会共享这个存档键；若希望它们独立，请修改 `assets/storage.js` 中的 `KEY`。

## 目录与继续开发

```text
index.html                 统一入口和对话框
assets/app.js              章节切换、故事记录、备份、复制剧情
assets/app.css             游戏外壳与独立网页样式
assets/storage.js          剧情存档格式、校验与设备本地保存
assets/practice.js         语音输入、意图规则与练习记录
assets/audio/              预生成的固定角色语音
assets/templates.js        自动生成的章节 HTML，勿直接编辑
assets/lucide.min.js        随包图标库
chapters/doorstep.*         第一章的 HTML、CSS、剧情逻辑
chapters/midnight.*         第二章的 HTML、CSS、剧情逻辑
scripts/                   构建、预览、检查与角色语音生成脚本
tests/                     存档行为测试
.github/workflows/pages.yml GitHub Pages 发布配置
licenses/                  第三方许可
docs/                      README 头图与制作说明
```

章节通过 `window.MoonlightChapters.<id>()` 注册挂载函数，返回 `save()` 和 `dispose()`；公共能力由 `window.Moonlight` 提供。章节切换会先保存并卸载上一章，清理音效资源。

检查覆盖构建、资源路径和存档单元测试，挂载与恢复逻辑另有代码审查。完整交互可按 [验收清单](ACCEPTANCE.md) 在目标浏览器体验。

## 第三方资源

图标来自 **Lucide 1.8.0**，原始 ISC / 部分图标的 MIT 许可保存在 `licenses/lucide-LICENSE.txt`。随包角色语音的生成方式和可选的 Kokoro 后端说明见 `licenses/voice-assets-NOTICE.md`；游戏运行时不会下载语音模型或请求配音服务。
