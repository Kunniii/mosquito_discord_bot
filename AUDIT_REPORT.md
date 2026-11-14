# BÁO CÁO PHÂN TÍCH VÀ AUDIT DỰ ÁN: MOSQUITO DISCORD BOT

## 1. Tổng quan dự án (Project Overview)
- **Tên dự án:** `mosquito_discord_bot`
- **Mục đích:** Bot Discord giải trí/troll mô phỏng một "con muỗi". Bot tự động ngẫu nhiên bay vào kênh thoại (Voice Channel) mục tiêu sau một khoảng thời gian nhất định và liên tục phát âm thanh vo ve tiếng muỗi (`src/assets/sound.mp3`). Người dùng trong server có thể tương tác "đập muỗi" bằng lệnh chat hoặc tắt chế độ muỗi bằng slash command.
- **Runtime & Công nghệ:**
  - Runtime: **Bun** (`bun.lockb`, version khởi tạo ~v1.1.18).
  - Ngôn ngữ: **TypeScript** (`typescript: ^5.0.0`).
  - Thư viện chính:
    - `discord.js` v14.15.3 (Client Discord).
    - `@discordjs/voice` v0.17.0 (Quản lý kết nối voice & stream âm thanh).
    - `@discordjs/rest` & `discord-api-types` v10 (Đăng ký Slash Commands).
    - Codec & Audio: `ffmpeg-static`, `libsodium-wrappers`, `@discordjs/opus`, `opusscript`, `sodium-native`, `tweetnacl`.

---

## 2. Luồng hoạt động chi tiết (Architecture & Logic)

### 2.1. Chu kỳ sống & Tần suất hoạt động của Muỗi
1. **Kích hoạt muỗi (`/spawn on kênh_thoại`):**
   - Đặt cờ biến toàn cục `spawn = true`.
   - Khởi tạo instance duy nhất của class `Mosquito` trỏ tới kênh Voice chỉ định và file âm thanh `src/assets/sound.mp3`.
   - Gọi hàm `createMuoiAndJoin()`.
2. **Tần suất / Thời gian chờ ngẫu nhiên (Spawn Frequency):**
   - Sử dụng hàm `randomRangeInt(1, 15)`:
     ```ts
     const m = randomRangeInt(1, 15); // Giá trị trả về từ 1 đến 14 phút
     ```
   - Log thông báo: `[+] Muoi will join in {m}m`.
   - Sau thời gian timeout (`m * 60 * 1000` ms):
     - Kiểm tra nếu Voice Channel có người (`muoi.isVoiceChannelHasUser()` -> `members.size > 0`): Bot kết nối vào voice (`muoi.connect()`).
     - Nếu Voice Channel trống (không có ai): Bot không kết nối và đệ quy gọi lại `createMuoiAndJoin()` để tính thời gian chờ một đợt khác.
3. **Cơ chế phát âm thanh (Audio Loop):**
   - Khi vào voice channel, tạo `AudioPlayer` và `createAudioResource(resourcePath)`.
   - Kết nối audio player với voice connection (`connection.subscribe(player)`).
   - Lắng nghe sự kiện `AudioPlayerStatus.Idle`: Ngay khi file âm thanh muỗi kết thúc, nó lập tức phát lại (`playSound()`), tạo vòng lặp âm thanh vô tận gây ức chế cho người dùng trong kênh thoại.
4. **Cơ chế "Đập muỗi" (Slap/Kill Mechanic):**
   - Lắng nghe sự kiện tin nhắn `messageCreate` (khi bot được tag/mention `@bot`):
   - Danh sách từ khóa chấp nhận:
     ```ts
     ["slap", "dap", "đập", "hit", "cmm", "dmm", "dcmm", "kill", "👏"]
     ```
   - Nếu tin nhắn có mention bot và bắt đầu bằng một trong các từ khóa trên:
     - Gửi tin nhắn phản hồi: *Cậu {tên} mới đập muỗi :mosquito: :clap:*
     - Gọi `dapMuoi()`: Ngắt kết nối voice (`muoi.disconnect()`), hủy player.
     - Nếu cờ `spawn` vẫn đang bật (`spawn === true`), hệ thống tự động gọi lại `createMuoiAndJoin()`, tức là sau 1-14 phút nữa muỗi sẽ tái sinh và quay trở lại!
   - Nếu mention bot nhưng không đúng từ khóa:
     - Bot trêu chọc: *Lêu lêu cậu {tên} không biết đập muỗi :smirk:*
   - Nếu muỗi chưa kết nối voice:
     - Phản hồi: *Muỗi chưa được sinh ra á cậu, từ từ =))*
5. **Dừng muỗi (`/spawn off`):**
   - Đặt `spawn = false`. (Lưu ý: chưa tự động ngắt kết nối muỗi nếu muỗi đang ở trong voice).

---

## 3. Báo cáo Kiểm toán Mã nguồn (Audit & Code Quality Review)

### 3.1. Các vấn đề Kiến trúc & Quản lý Trạng thái (Architecture & State Issues)

| Mức độ | Vấn đề | Chi tiết |
| :--- | :--- | :--- |
| 🔴 **High** | **Singleton / Multi-guild Conflict (Chỉ hỗ trợ 1 Server duy nhất)** | Các biến `spawn` và `muoi` được định nghĩa là biến toàn cục cấp module trong `src/commands/spawn.ts`. Nếu bot được thêm vào 2 server Discord khác nhau, server này gọi `/spawn on` sẽ ghi đè kênh và trạng thái của server kia. |
| 🔴 **High** | **Không hủy kết nối khi chạy `/spawn off`** | Lệnh `/spawn off` chỉ đặt `spawn = false`, không gọi `muoi.disconnect()`. Nếu muỗi đang ở trong phòng voice phát tiếng ồn lúc gõ `/spawn off`, nó vẫn sẽ ở đó phát mãi cho đến khi bị ai đó "đập". |
| 🟡 **Medium** | **Kênh thoại bị khóa cố định (Channel Lock)** | Khi gọi `/spawn on` lần 2 với channel khác, code có đoạn `if (!muoi) muoi = new Mosquito(...)`. Nếu `muoi` đã tồn tại từ trước, bot sẽ tiếp tục dùng kênh cũ mà không cập nhật kênh mới được truyền vào. |
| 🟡 **Medium** | **Rủi ro Memory Leak & Timer trôi nổi (Dangling Timeouts)** | `setTimeout` trong `createMuoiAndJoin()` không lưu `timeoutId`. Nếu admin spam lệnh `/spawn on` nhiều lần, sẽ có hàng loạt bộ hẹn giờ chạy song song ngầm, khiến muỗi join liên tục bất ngờ hoặc gây lỗi kết nối voice. |
| 🟡 **Medium** | **Resource Leak ở Audio Loop** | Mỗi vòng lặp kết thúc `Idle`, hàm `playSound()` gọi `createAudioResource(resourcePath)` tạo mới stream/resource mà không tái sử dụng hay dọn dẹp bộ đệm stream cũ chặt chẽ. |

### 3.2. Vấn đề Logic & Tương tác Người dùng (Logic & UX Bugs)

| Mức độ | Vấn đề | Chi tiết |
| :--- | :--- | :--- |
| 🟡 **Medium** | **Logic kiểm tra từ khóa đập muỗi dễ lỗi** | Trong `src/index.ts`: `const command = message.content.split(" ")[0];`. Khi người dùng mention bot ở đầu câu (ví dụ `@MosquitoBot đập`), từ đầu tiên `split(" ")[0]` sẽ là chuỗi `<@ID_BOT>`, dẫn đến điều kiện so sánh từ khóa luôn bị sai và bot luôn báo *"Lêu lêu cậu... không biết đập muỗi"*. |
| 🟡 **Medium** | **Thiếu xử lý Voice State Disconnect đột ngột** | Nếu ai đó kick bot khỏi voice channel, bot chuyển sang trạng thái disconnected nhưng cờ `isVoiceConnected` trong instance `muoi` không được đồng bộ về `false`, khiến logic đập muỗi hoặc spawn lại bị kẹt trạng thái. |
| 🟢 **Low** | **Thiếu biến môi trường (Environment Validation)** | Không có file kiểm tra hoặc validate cấu hình môi trường tập trung (`TOKEN`, `APP_ID`). |
| 🟢 **Low** | **Cài đặt dư thừa thư viện sodium** | Trong `package.json` cài cùng lúc `sodium`, `sodium-native`, `libsodium-wrappers` và `tweetnacl`. Chỉ cần một gói native hoặc wrapper là đủ cho Discord voice encryption. |

---

## 4. Đề xuất cải tiến & Khắc phục (Recommendations)

1. **Quản lý đa Server (Multi-guild Map):**
   - Chuyển `spawn` và `muoi` từ biến toàn cục đơn lẻ sang `Map<string, GuildMosquitoState>` (với key là `guildId`).
2. **Sửa lệnh `/spawn off`:**
   - Trong nhánh `subcommand === "off"`, cần hủy timer đang chờ và ngắt kết nối ngay lập tức nếu bot đang trong voice (`muoi?.disconnect()`).
3. **Chuẩn hóa cú pháp bắt lệnh đập muỗi:**
   - Loại bỏ mention token khỏi nội dung message trước khi kiểm tra từ khóa (dùng regex hoặc replace mention).
4. **Lắng nghe sự kiện `VoiceConnectionStatus.Disconnected`:**
   - Tự động dọn dẹp trạng thái nội bộ nếu bot bị ngắt kết nối bất thường từ phía Discord.
5. **Cấu hình tùy chỉnh tần suất:**
   - Cho phép truyền tham số min-max vào lệnh spawn thay vì hardcode cố định `randomRangeInt(1, 15)` phút.
