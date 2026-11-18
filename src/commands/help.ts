import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, EmbedBuilder } from "discord.js";

export const helpCommand = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Xem hướng dẫn sử dụng và danh sách lệnh của Bot Muỗi");

export async function execute(interaction: CommandInteraction) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🦟 Hướng dẫn sử dụng Mosquito Bot")
    .setDescription(
      "Bot mô phỏng tiếng muỗi vo ve gây ức chế trong kênh thoại! Muỗi sẽ tự động rình rập và random bay vào các phòng voice có người."
    )
    .addFields(
      {
        name: "🚀 Triệu hồi & Điều khiển Muỗi",
        value:
          "• `/spawn on [kênh_thoại]` — Bật dịch vụ muỗi (bỏ trống kênh để muỗi tự random mọi phòng có người).\n" +
          "• `/spawn-now [kênh_thoại]` — Triệu hồi muỗi bay vào phòng ngay lập tức.\n" +
          "• `/spawn off` — Tắt dịch vụ muỗi và rời khỏi phòng thoại.",
      },
      {
        name: "👏 Đập Muỗi (Chỉ người cùng phòng Voice mới đập được!)",
        value:
          "• Dùng lệnh `/dap` hoặc `/slap`.\n" +
          "• Hoặc chat `!dap`, `!slap`, `dap muoi`, `đập muỗi`.\n" +
          "• Hoặc tag `@Mosquito` kèm từ khóa (`đập`, `slap`, `hit`, `kill`, `cút`, `👏`, ...).",
      },
      {
        name: "📊 Thống kê & Xếp hạng",
        value:
          "• `/mosquito-stats` — Xem tổng số muỗi đã diệt và chuỗi streak.\n" +
          "• `/leaderboard` — Xem top 10 thợ săn muỗi của server.\n" +
          "• `/ping` — Kiểm tra độ trễ của Bot.",
      }
    )
    .setFooter({ text: "Mẹo: Bạn có thể chạy khỏi phòng voice để muỗi tự bay đi chỗ khác!" });

  await interaction.reply({ embeds: [embed] });
}
