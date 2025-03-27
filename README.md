# RiceCall 
<div align="center">
  <img src="https://github.com/user-attachments/assets/74f23cae-f3aa-4deb-bbd1-72290d9193f3" width="200px" align="center">
</div>

<img src="https://img.shields.io/badge/Join-Discord-blue?logo=discord&link=https%3A%2F%2Fdiscord.gg%2FadCWzv6wwS"/> <img src="https://img.shields.io/badge/Current_Version-v0.1.0a-green"/>

RiceCall，RaidCall 的非官方復刻版，使用 react 框架開發，electron 建置

## - 功能 (Feature)
- 高度還原 RaidCall 介面和功能
- 重溫曾經的情懷

## - 更新日誌 (Update Log)
### v0.1.0a (2025-03-31)
- **初版發布** 
- 支援基礎語音頻道與聊天功能
- 基於 Electron 建構桌面應用
- 大致還原的前端 UI 介面

## - 安裝方法

## - 常見問題 (FAQ)
### ❓ Q: 啟動 `yarn electron-dev` 時出現錯誤？
✅ A: 請確保你已經安裝 `yarn`，如果沒有可以執行：
```bash
npm install -g yarn
```
### ❓ Q: 我的問題不在以上的內容中
✅ A: 請加入我們的 [Discord](https://discord.gg/adCWzv6wwS) 伺服器或至 [Issues](https://github.com/NerdyHomeReOpen/RiceCall/issues) 頁面詳細描述你所遇到的問題


## - 技術架構 (Tech Stack)
- **前端 (Client):** React, Electron
- **後端 (Server):** Node.js, WebSocket
- **資料庫 (Database):** SQLite (開發模式)
- **通訊協定 (Protocol):** WebRTC / WebSocket

## - 如何貢獻 (Contributing)
我們歡迎所有開發者參與 RiceCall 的開發！你可以透過以下方式貢獻：
1. Fork 此專案，進行修改後提交 [Pull Request](https://github.com/NerdyHomeReOpen/RiceCall/pulls)
2. 回報 Bug 或提出新功能建議，請到 [Issues](https://github.com/NerdyHomeReOpen/RiceCall/issues) 頁面
3. 幫助改善文件 (如 ReadMe 或開發指南)

### 代辦事項 (TODO List)
- [ ] 更改後端語言 (高效率語言, e.g. Rust, C++, Python)
- [ ] 優化資料庫 (使用 NoSQL)
- [ ] 改進 WebRTC
- [ ] 新增雜音抑制
- [ ] 混音功能

## - 專案倉庫
| Repo        | Role                 |
| ------------- | -------------------- |
| [/NerdyHomeReOpen/RiceCall](https://github.com/NerdyHomeReOpen/RiceCall) | frontend |
| [/NerdyHomeReOpen/RiceCallServer](https://github.com/NerdyHomeReOpen/RiceCall/tree/Websocket) | backend |

## - 專案架構
```bash
RiceCall
├── public/                   # 靜態資源 (圖片、icons 等)
├── resources/                # Electron 打包相關資源
├── src/                      # 應用程式的主要原始碼
│   ├── components/           # React/Electron 元件
│   ├── app/                  # Next.js 頁面
│   ├── hooks/                # React Hooks
│   ├── styles/               # CSS
│   ├── services/             # API 呼叫、資料處理
├── main.js                   # Electron 入口文件
├── test-server/              # 測試用的本地伺服器
├── .env.example              # 環境變數範例
├── .gitignore                # Git 忽略清單
├── .prettierrc               # Prettier 設定
├── dev-app-update.yml        # 應用程式更新設定 (Electron auto-update)
├── Dockerfile                # Docker 部署設定
├── electron-builder.json     # Electron 打包設定
├── eslint.config.mjs         # ESLint 設定
├── json.sqlite               # SQLite 資料庫 (測試用)
├── LICENSE                   # 專案授權
├── package.json              # npm/yarn 依賴管理
├── postcss.config.mjs        # PostCSS 設定
├── README.md                 # 專案說明文件
├── tailwind.config.ts        # Tailwind CSS 設定
├── tsconfig.json             # TypeScript 設定
├── yarn.lock                 # Yarn 鎖定依賴版本
```

## - 建置本地環境

1. 安裝 Modules
```bash
yarn install
```

2. 啟動 Client
```bash
yarn electron-dev
```

3. 啟動 Test-Server (前端開發用)
```bash
node ./test-server/index.js
```

4. 建置 Database
```bash
node ./test-server/initial.js
```

客戶端及伺服器即會運行於本地電腦上

> [客戶端](localhost:3000) (localhost:3000)
>
> [伺服器端](localhost:4500) (localhost:4500)

## - 免責聲明

**RiceCall** 是一個**獨立開發**的專案，與 RaidCall 的原開發團隊、伺服器或任何官方組織 **沒有任何關聯**。本專案**並非** RaidCall 的延續或官方授權版本，亦**不涉及恢復過去的 RaidCall 服務或其伺服器**。

RiceCall 的開發純屬愛好者社群的自主行動，目的在於提供一個新的語音交流平台，並非商業化項目。本專案可能會參考或取用部分 RaidCall 相關的素材，但所有內容皆屬我們的獨立創作，且不代表 RaidCall 官方立場或意圖。

如有任何與 RaidCall 相關的問題，請直接聯繫其原開發團隊或官方渠道。**RiceCall 不負責與 RaidCall 相關的任何技術支援**、帳號恢復或資料遺失等問題。

本專案完全獨立開發，所有內容僅供學術研究與技術交流使用。如涉及任何版權、商標或其他權利問題，請聯繫我們進行溝通。
