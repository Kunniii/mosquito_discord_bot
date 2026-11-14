import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, VoiceChannel, GuildMember } from "discord.js";
import { GuildMosquitoManager } from "../managers/GuildMosquitoManager.ts";

export const spawnNowCommand = new SlashCommandBuilder()
  .setName("spawn-now")
  .setDescription("Triệu hồi muỗi bay vào phòng voice ngay lập tức!")
  .addChannelOption((option) =>
    option
      .setName("kênh_thoại")
      .setDescription("Kênh thoại để muỗi quấy rối ngay (mặc định kênh bạn đang ở)")
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
    let channel = interaction.options.getChannel("kênh_thoại");

    // Nếu không truyền option kênh_thoại, lấy kênh người dùng đang tham gia
    if (!channel) {
      const member = interaction.member as GuildMember;
      if (member?.voice?.channel) {
        channel = member.voice.channel;
      }
    }

    if (!(channel instanceof VoiceChannel)) {
      await interaction.reply({
        content: "Vui lòng chọn một kênh Voice hoặc tự tham gia vào một Voice room trước! :face_holding_back_tears:",
        ephemeral: true,
      });
      return;
    }

    const manager = GuildMosquitoManager.getInstance();
    await manager.registerAndSpawnNow(channel);

    await interaction.reply(`🦟 **BZZZ!** Muỗi đã xuất hiện và bay thẳng vào phòng <#${channel.id}> ngay lập tức! :eyes:`);
  }
}
