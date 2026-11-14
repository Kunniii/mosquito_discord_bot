# Chính sách Quyền riêng tư (Privacy Policy) - Mosquito Discord Bot

*Cập nhật lần cuối: 14/11/2026*

Chính sách Quyền riêng tư này giải thích cách **Mosquito Discord Bot** ("Bot") xử lý và bảo vệ thông tin khi hoạt động trong máy chủ Discord của bạn.

---

## 1. Dữ liệu Bot Thu thập
Bot chỉ thu thập và xử lý các thông tin kỹ thuật tối thiểu cần thiết để duy trì tính năng:
- **ID Máy chủ (`guildId`):** Dùng để cách ly trạng thái hoạt động của muỗi giữa các máy chủ khác nhau.
- **ID Kênh thoại (`channelId`):** Dùng để kết nối và truyền âm thanh tiếng muỗi vào đúng phòng được chỉ định.
- **Tên hiển thị (`displayName`) & ID người dùng:** Chỉ được đọc tạm thời trong bộ nhớ khi người dùng tag bot đập muỗi (`@MosquitoBot dap`) để phản hồi tin nhắn trong kênh.
- **Nhật ký lỗi (Error Logs):** Ghi lại lỗi kết nối âm thanh thoại nội bộ (chỉ lưu trên console máy chủ của bot để fix bug).

---

## 2. Dữ liệu Bot KHÔNG Thu thập (Cam kết)
- **KHÔNG thu thập hay ghi âm giọng nói (Audio Packets):** Bot chỉ truyền phát âm thanh ra kênh thoại, hoàn toàn không nghe, không thu âm, không lưu trữ giọng nói của bất kỳ ai trong phòng.
- **KHÔNG đọc hay lưu trữ nội dung tin nhắn riêng tư:** Bot chỉ kích hoạt khi có sự kiện mention trực tiếp tên Bot và không lưu trữ lịch sử tin nhắn của máy chủ vào bất kỳ cơ sở dữ liệu nào.
- **KHÔNG chia sẻ hay bán dữ liệu:** Chúng tôi không chia sẻ bất kỳ thông tin nào cho bên thứ ba hoặc mục đích thương mại.

---

## 3. Lưu trữ và Xóa Dữ liệu
- Toàn bộ dữ liệu trạng thái (`guildId`, `channelId`, timer) chỉ được lưu trữ tạm thời trong RAM (bộ nhớ tạm) khi Bot đang chạy.
- Khi Bot khởi động lại hoặc khi bạn dùng lệnh `/spawn off`, các trạng thái này sẽ bị hủy ngay lập tức.
- Bạn có thể xóa hoàn toàn dữ liệu máy chủ khỏi bộ nhớ bot đơn giản bằng cách kick Bot ra khỏi máy chủ.

---

## 4. Liên hệ
Nếu có thắc mắc về quyền riêng tư hoặc muốn yêu cầu xóa dữ liệu nhật ký, vui lòng liên hệ qua:
- [GitHub Repository Issues](https://github.com/Kunniii/mosquito_discord_bot)
