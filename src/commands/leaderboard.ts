import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { MosquitoTracker } from "../managers/MosquitoTracker.ts";

export const leaderboardCommand = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("Xem bảng xếp hạng những thợ săn muỗi cừ khôi nhất server");

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "Lệnh này chỉ dùng được trong server!",
      ephemeral: true,
    });
    return;
  }

  const tracker = MosquitoTracker.getInstance();
  const embed = tracker.createLeaderboardEmbed(interaction.guild.id, interaction.guild.name);

  await interaction.reply({ embeds: [embed] });
}
