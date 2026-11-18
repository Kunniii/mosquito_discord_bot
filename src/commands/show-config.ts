import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, EmbedBuilder } from "discord.js";
import { GuildMosquitoManager } from "../managers/GuildMosquitoManager.ts";
import { BlacklistManager } from "../managers/BlacklistManager.ts";
import { MosquitoTracker } from "../managers/MosquitoTracker.ts";

export const showConfigCommand = new SlashCommandBuilder()
  .setName("show-config")
  .setDescription("Xem cấu hình hiện tại và trạng thái của Bot Muỗi trên server");

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "Lệnh này chỉ dùng được trong server!",
      ephemeral: true,
    });
    return;
  }

  const guildId = interaction.guild.id;
  const mosquito = GuildMosquitoManager.getInstance().get(guildId);
  const blacklist = BlacklistManager.getInstance().getBlacklist(guildId);
  const tracker = MosquitoTracker.getInstance();
  const guildStats = tracker.getStats(guildId);
  const globalStats = tracker.getGlobalStats();

  const statusText = mosquito?.isEnabled ? "🟢 Đang BẬT" : "🔴 Đang TẮT";
  const modeText = mosquito?.targetChannel
    ? `🎯 Cố định tại <#${mosquito.targetChannel.id}>`
    : "🎲 Random toàn bộ phòng có người";

  const currentChannelId = mosquito?.getCurrentVoiceChannelId();
  const locationText =
    mosquito?.isVoiceConnected && currentChannelId
      ? `🔊 Đang vo ve trong <#${currentChannelId}>`
      : "💤 Đang ẩn nấp / chờ lịch bay";

  const blacklistText =
    blacklist.length > 0 ? blacklist.map((id) => `<#${id}>`).join(", ") : "*Không có phòng nào bị cấm*";

  const embed = new EmbedBuilder()
    .setColor(mosquito?.isEnabled ? 0x2ecc71 : 0x95a5a6)
    .setTitle(`⚙️ Cấu hình Bot Muỗi — ${interaction.guild.name}`)
    .addFields(
      { name: "🔌 Trạng thái dịch vụ", value: statusText, inline: true },
      { name: "🧭 Chế độ săn mồi", value: modeText, inline: true },
      { name: "📍 Vị trí hiện tại", value: locationText, inline: false },
      { name: "🚫 Phòng bị Blacklist", value: blacklistText, inline: false },
      {
        name: "📊 Thống kê nhanh",
        value: `Server đã diệt: **${guildStats.totalSlaps}** con (Kỷ lục streak: **${guildStats.highestStreak}**) | 🌐 Toàn cầu: **${globalStats.totalSlaps}** con`,
        inline: false,
      }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
