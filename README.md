# 🦟 Mosquito Discord Bot

<p align="center">
  <b>Bot Discord giải trí mô phỏng tiếng muỗi vo ve gây ức chế trong kênh thoại, hỗ trợ đa server (Multi-Guild) và chạy trực tiếp trên Node.js v24+ Native TypeScript.</b>
</p>

---

## ✨ Tính năng nổi bật

- **🌐 Hỗ trợ đa máy chủ (Multi-Guild Scalability):**
  - Tách biệt và cách ly trạng thái hoàn toàn giữa các server (`Map<guildId, MosquitoInstance>`).
  - Cho phép bot hoạt động cùng lúc trên nhiều máy chủ Discord mà không bị xung đột kết nối voice hay đè lệnh lẫn nhau.
- **🦟 Dịch vụ muỗi vo ve (`/spawn`):**
  - **Hẹn giờ ngẫu nhiên:** Muỗi tự động bay vào phòng thoại mục tiêu sau khoảng thời gian ngẫu nhiên từ 1 đến 15 phút.
  - **Cảm biến phòng thoại thông minh:** Kiểm tra xem phòng có người thật (không tính bot) hay không trước khi join. Nếu phòng trống, bot sẽ tự dời lịch hẹn tiếp theo.
  - **Lặp âm thanh liên tục:** Phát lặp vô tận âm thanh muỗi vo ve (`src/assets/sound.mp3`) qua `@discordjs/voice`.
- **👏 Cơ chế "Đập muỗi" (Slap/Kill):**
  - Khi muỗi đang trong phòng thoại, chỉ cần tag bot `@MosquitoBot` kèm các từ khóa (`dap`, `đập`, `slap`, `hit`, `kill`, `👏`, `cmm`, ...), bot sẽ bị "đập chết" và văng khỏi kênh thoại ngay lập tức, đồng thời bắt đầu đếm ngược đợt tái sinh kế tiếp.
- **⚡ Chạy Native TypeScript trên Node.js v24+:**
  - Không cần bước build/bundle trung gian, không cần `ts-node`, đã loại bỏ hoàn toàn Bun.
  - Chạy trực tiếp mã nguồn TypeScript với tính năng Type Stripping có sẵn trên Node.js v24.

---

## 📋 Danh sách Lệnh Slash Commands

| Lệnh | Mô tả | Quyền yêu cầu |
| :--- | :--- | :--- |
| `/spawn on <kênh_thoại>` | Bật dịch vụ muỗi vo ve cho kênh thoại chỉ định | Thành viên server |
| `/spawn off` | Tắt dịch vụ muỗi và lập tức ngắt kết nối voice | Thành viên server |
| `/ping` | Kiểm tra độ trễ phản hồi của Bot | Không yêu cầu |

---

## 🛠️ Yêu cầu hệ thống

- **Node.js:** v24.0.0 trở lên
- **NPM:** v10.0.0 trở lên

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### 1. Clone repository
```bash
git clone https://github.com/Kunniii/mosquito_discord_bot.git
cd mosquito_discord_bot
```

### 2. Cài đặt thư viện dependencies
```bash
npm install
```

### 3. Cấu hình biến môi trường (`.env`)
Tạo file `.env` từ file `.env.example`:
```env
TOKEN=your_discord_bot_token
APP_ID=your_discord_application_id
```

### 4. Đăng ký Slash Commands (Deploy)
Cập nhật và đăng ký các slash commands lên Discord API:
```bash
npm run deploy
```

### 5. Khởi chạy Bot
```bash
npm run server
# Hoặc vừa deploy vừa chạy server:
npm start
```

### 6. Kiểm tra lỗi kiểu dữ liệu (Type Check)
```bash
npm run typecheck
```

---

## 🏗️ Cấu trúc thư mục dự án

```text
src/
├── commands/
│   ├── ping.ts              # Lệnh kiểm tra độ trễ ping
│   └── spawn.ts             # Lệnh bật/tắt dịch vụ muỗi vo ve
├── managers/
│   ├── GuildMosquitoManager.ts # Quản lý và điều phối muỗi theo từng Server
│   └── MosquitoInstance.ts     # Trạng thái vòng đời & audio của muỗi trong 1 Server
├── utils/
│   └── logger.ts            # Logger ghi log chuẩn hóa theo [GuildId]
├── deploy-command.ts        # Script đăng ký slash commands lên Discord API
└── index.ts                 # Điểm khởi chạy chính của Bot Discord
```

---

## 📄 License

Giấy phép ISC. Được tạo ra nhằm mục đích giải trí và troll vui vẻ trong server Discord!
