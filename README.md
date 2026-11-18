# 🦟 Mosquito Discord Bot

<p align="center">
  <b>Bot Discord giải trí mô phỏng tiếng muỗi vo ve gây ức chế trong kênh thoại, hỗ trợ đa máy chủ (Multi-Guild) và chạy trực tiếp trên Node.js v24+ Native TypeScript.</b>
</p>

---

## 🌐 Trạng thái hỗ trợ Đa máy chủ (Multi-Server Readiness)

**Bot ĐÃ SẴN SÀNG 100% cho nhiều server (Multi-Guild Concurrent):**
- **Cách ly trạng thái tuyệt đối:** Mỗi server Discord (`guildId`) được quản lý bằng một instance độc lập qua `GuildMosquitoManager` và `MosquitoInstance`.
- **Không chồng chéo hay xung đột:** Việc bật/tắt `/spawn`, đếm ngược timer ngẫu nhiên, hoặc phát âm thanh ở Server A hoàn toàn không ảnh hưởng đến Server B.
- **Tự động giải phóng tài nguyên:** Khi bot bị kick hoặc phòng thoại hết người, bot tự động dọn dẹp kết nối voice và timer của riêng server đó.

---

## 📊 Chính sách & Thu thập dữ liệu Giám sát (Telemetry & Data Collection)

Nhằm mục đích theo dõi độ ổn định, hiệu năng kết nối thoại (`@discordjs/voice`) và tối ưu hóa trải nghiệm mô phỏng muỗi trên môi trường đa server, bot thực hiện thu thập telemetry ẩn danh ở mức tối thiểu:

- **Dữ liệu được thu thập:**
  - **ID Máy chủ (`guildId`):** Phân biệt log và phiên hoạt động theo từng server.
  - **ID Kênh thoại (`channelId`):** Theo dõi trạng thái kết nối, ngắt kết nối và thời lượng bot bay vào phòng thoại.
  - **Sự kiện tương tác người dùng:** Đếm số lần thực thi lệnh `/spawn` và số lần muỗi bị "đập" (`slap`) cùng `displayName` của người thực hiện để hiển thị thông báo phản hồi trong kênh.
  - **Độ trễ & Mã lỗi thoại:** Ghi nhận lỗi AudioPlayer hoặc Voice Connection Status (Ready/Disconnected) phục vụ việc fix bug tự động.
- **Cam kết bảo mật:**
  - Bot **KHÔNG** ghi âm, thu thập hay lưu trữ bất kỳ luồng âm thanh (voice packets) nào của người dùng.
  - **KHÔNG** đọc, quét hay lưu trữ nội dung tin nhắn chat thông thường (ngoại trừ việc bắt tin nhắn mention trực tiếp bot để kích hoạt cơ chế đập muỗi).
  - Dữ liệu log chỉ lưu cục bộ trên console/hệ thống giám sát nội bộ của chủ sở hữu bot.

---

## ✨ Tính năng nổi bật

- **🌐 Hỗ trợ đa máy chủ (Multi-Guild Scalability):** Tách biệt và cách ly trạng thái hoàn toàn giữa các server (`Map<guildId, MosquitoInstance>`).
- **🦟 Dịch vụ muỗi vo ve (`/spawn`):**
  - **Rình rập toàn Server & Random Voice Room:** Muỗi tự động tìm kiếm và **ngẫu nhiên bay vào bất kỳ phòng voice nào đang có người** trong server sau khoảng thời gian ngẫu nhiên từ 1 đến 15 phút.
  - **Tùy chọn cố định kênh:** Bạn vẫn có thể chỉ định cố định 1 kênh thoại mục tiêu nếu muốn.
  - **Cảm biến phòng thoại thông minh:** Chỉ chọn các phòng có người thật (không tính bot). Nếu phòng voice hết người hoặc mọi người bỏ chạy, muỗi sẽ tự động rời đi và lên lịch săn phòng khác.
  - **Lặp âm thanh liên tục:** Phát lặp vô tận âm thanh muỗi vo ve (`src/assets/sound.mp3`) qua `@discordjs/voice`.
- **👏 Cơ chế "Đập muỗi" (Chỉ người cùng phòng mới đập được):**
  - **Chỉ thành viên đang ở CÙNG Voice Room với muỗi mới có thể đập!** Nếu bạn ở phòng voice khác hoặc không ở trong voice, bot sẽ trêu chọc và từ chối.
  - Hỗ trợ cả Slash Command (`/dap`, `/slap`) lẫn Chat (`!dap`, `!slap`, `dap muoi`, `@MosquitoBot đập`, ...).
  - Phản hồi dạng text-only gọn gàng và tự động theo dõi chuỗi Streak cá nhân.
- **⚡ Chạy Native TypeScript trên Node.js v24+:**
  - Không cần build/bundle trung gian, không cần `ts-node`, đã loại bỏ hoàn toàn Bun.
  - Chạy trực tiếp mã nguồn TypeScript với tính năng Type Stripping có sẵn trên Node.js v24.

---

## 📋 Danh sách Lệnh Slash Commands

| Lệnh | Mô tả | Quyền yêu cầu |
| :--- | :--- | :--- |
| `/dap` hoặc `/slap` | **Đập muỗi**: Đuổi muỗi văng khỏi phòng voice ngay lập tức | Thành viên server |
| `/spawn on <kênh_thoại>` | Bật dịch vụ muỗi vo ve cho kênh thoại chỉ định (hẹn giờ ngẫu nhiên 1-15p) | Thành viên server |
| `/spawn-now [kênh_thoại]` | Triệu hồi muỗi bay vào phòng voice quấy rối ngay lập tức | Thành viên server |
| `/spawn off` | Tắt dịch vụ muỗi và lập tức ngắt kết nối voice | Thành viên server |
| `/mosquito-stats` | Xem bảng thành tích, số muỗi đã diệt và chuỗi streak đập muỗi của server | Không yêu cầu |
| `/leaderboard` | Xem top 10 thợ săn muỗi có thành tích cao nhất server | Không yêu cầu |
| `/help` | Xem hướng dẫn sử dụng và danh sách tất cả lệnh của Bot | Không yêu cầu |
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

## 🐳 Triển khai với Docker & Docker Compose

Dự án đã được cấu hình sẵn `Dockerfile` chuẩn hóa trên nền **Node.js v24 (Bookworm-slim)** và `docker-compose.yml`.

### Chạy nhanh bằng Docker Compose:

1. Đảm bảo file `.env` đã có `TOKEN` và `APP_ID`.
2. Khởi chạy container:
```bash
docker compose up -d --build
```
3. Xem log hoạt động của bot:
```bash
docker compose logs -f
```
4. Dừng container:
```bash
docker compose down
```

### Build và chạy Docker thủ công:
```bash
# Build image
docker build -t mosquito-bot .

# Chạy container với file .env
docker run -d --name mosquito-bot --env-file .env --restart unless-stopped mosquito-bot
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
│   └── logger.ts            # Logger ghi log chuẩn hóa telemetry theo [GuildId]
├── deploy-command.ts        # Script đăng ký slash commands lên Discord API
└── index.ts                 # Điểm khởi chạy chính của Bot Discord
```

---

## 📄 License

Giấy phép ISC. Được tạo ra nhằm mục đích giải trí và troll vui vẻ trong server Discord!
