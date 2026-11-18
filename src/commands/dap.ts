import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember } from "discord.js";
import { GuildMosquitoManager } from "../managers/GuildMosquitoManager.ts";
import { MosquitoTracker } from "../managers/MosquitoTracker.ts";
import { SlapResultType } from "../managers/MosquitoInstance.ts";

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

  const member = interaction.member as GuildMember;
  const userVoiceChannelId = member?.voice?.channelId;
  const displayName = member?.displayName || interaction.user.displayName || interaction.user.username;

  const result = manager.slap(guildId, displayName, userVoiceChannelId);

  if (result.type === SlapResultType.SUCCESS) {
    tracker.recordSlap(guildId, interaction.user.id, displayName);
    const replyText = tracker.formatSlapText(displayName, interaction.user.id, guildId);
    await interaction.reply({ content: replyText });
  } else if (result.type === SlapResultType.WRONG_ROOM) {
    const wrongRoomText = tracker.formatWrongRoomText(interaction.user.id, result.currentChannelId);
    await interaction.reply({ content: wrongRoomText });
  } else {
    await interaction.reply({
      content: "🦟 Muỗi chưa bay vào phòng voice nào á cậu, từ từ =))",
      ephemeral: true,
    });
  }
}
