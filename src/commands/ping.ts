import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

export const pingCommand = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Kiểm tra độ trễ phản hồi của Bot");

export async function execute(interaction: CommandInteraction) {
  const latency = Date.now() - interaction.createdTimestamp;
  await interaction.reply(`🏓 Pong! Độ trễ phản hồi: ${latency}ms`);
}
