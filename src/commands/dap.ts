import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember } from "discord.js";
import { GuildMosquitoManager } from "../managers/GuildMosquitoManager.ts";
import { MosquitoTracker } from "../managers/MosquitoTracker.ts";

export const dapCommand = new SlashCommandBuilder()
  .setName("dap")
  .setDescription("Đập con muỗi và đuổi nó ra khỏi phòng voice!");

export const slapCommand = new SlashCommandBuilder()
  .setName("slap")
  .setDescription("Slap the mosquito and kick it out of the voice room!");

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "Lệnh này chỉ dùng được trong server!",
      ephemeral: true,
    });
    return;
  }

  const guildId = interaction.guild.id;
  const manager = GuildMosquitoManager.getInstance();
  const tracker = MosquitoTracker.getInstance();

  if (manager.isConnected(guildId)) {
    const member = interaction.member as GuildMember;
    const displayName = member?.displayName || interaction.user.displayName || interaction.user.username;

    manager.slap(guildId, displayName);
    tracker.recordSlap(guildId, interaction.user.id, displayName);
    const replyText = tracker.formatSlapText(displayName, interaction.user.id, guildId);

    await interaction.reply({ content: replyText });
  } else {
    await interaction.reply({
      content: "🦟 Muỗi chưa bay vào phòng voice nào á cậu, từ từ =))",
      ephemeral: true,
    });
  }
}
