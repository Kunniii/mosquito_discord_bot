import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { MosquitoTracker } from "../managers/MosquitoTracker.ts";

export const statsCommand = new SlashCommandBuilder()
  .setName("mosquito-stats")
  .setDescription("Xem bảng thành tích và chuỗi đập muỗi (streak) của server");

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "Lệnh này chỉ dùng được trong server!",
      ephemeral: true,
    });
    return;
  }

  const tracker = MosquitoTracker.getInstance();
  const stats = tracker.getStats(interaction.guild.id);
  const embed = tracker.createStatsEmbed(stats, interaction.guild.name);

  await interaction.reply({ embeds: [embed] });
}
