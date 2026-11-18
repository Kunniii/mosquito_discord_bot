import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, VoiceChannel, GuildMember } from "discord.js";
import { GuildMosquitoManager } from "../managers/GuildMosquitoManager.ts";

export const spawnNowCommand = new SlashCommandBuilder()
  .setName("spawn-now")
  .setDescription("Triệu hồi muỗi bay vào phòng voice ngay lập tức!")
  .addChannelOption((option) =>
    option
      .setName("kênh_thoại")
      .setDescription("Kênh thoại để muỗi quấy rối ngay (mặc định kênh bạn đang ở hoặc random phòng có người)")
      .setRequired(false)
  );

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "# Không biếc gì hếc... Phải dùng lệnh trong một server!",
      ephemeral: true,
    });
    return;
  }

  if (interaction.isChatInputCommand()) {
    await interaction.deferReply();

    let channel = interaction.options.getChannel("kênh_thoại");

    // Nếu không truyền option kênh_thoại, kiểm tra xem người gọi lệnh có ở trong room voice nào không
    if (!channel) {
      const member = interaction.member as GuildMember;
      if (member?.voice?.channel instanceof VoiceChannel) {
        channel = member.voice.channel;
      }
    }

    if (channel && !(channel instanceof VoiceChannel)) {
      await interaction.editReply({
        content: "Kênh chỉ định phải là Voice room! :face_holding_back_tears:",
      });
      return;
    }

    const manager = GuildMosquitoManager.getInstance();
    const result = await manager.registerAndSpawnNow(
      interaction.guild,
      (channel as VoiceChannel) || undefined
    );

    if (!result.success || !result.channel) {
      await interaction.editReply({
        content: "❌ Không thể triệu hồi muỗi vì hiện tại không có phòng voice nào có người trong server! Hãy vào phòng voice trước nhé :eyes:",
      });
      return;
    }

    await interaction.editReply(`🦟 **BZZZ!** Muỗi đã xuất hiện và bay thẳng vào phòng <#${result.channel.id}> ngay lập tức! :eyes:`);
  }
}
