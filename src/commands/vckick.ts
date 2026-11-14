import { SlashCommandBuilder } from "@discordjs/builders";
import {
  ChatInputCommandInteraction,
  GuildMember,
  PermissionsBitField,
} from "discord.js";
import { Logger } from "../utils/logger.ts";

export const vckickCommand = new SlashCommandBuilder()
  .setName("vckick")
  .setDescription("Kick một thành viên ra khỏi Voice Channel")
  .addUserOption((option) =>
    option
      .setName("target")
      .setDescription("Người cần đuổi khỏi voice channel")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("Lý do đuổi")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({
      content: "Lệnh này chỉ có thể sử dụng bên trong server!",
      ephemeral: true,
    });
    return;
  }

  const issuer = interaction.member as GuildMember;
  const targetUser = interaction.options.getUser("target", true);
  const reason = interaction.options.getString("reason") ?? "Bị đuổi khỏi voice channel bởi quản trị viên";

  // 1. Kiểm tra quyền của người gọi lệnh (MoveMembers)
  if (!issuer.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
    await interaction.reply({
      content: "❌ Bạn không có quyền `Move Members` để thực hiện thao tác này!",
      ephemeral: true,
    });
    return;
  }

  // 2. Kiểm tra quyền của Bot trong server
  const botMember = guild.members.me;
  if (!botMember || !botMember.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
    await interaction.reply({
      content: "❌ Bot chưa được cấp quyền `Move Members` trong server này!",
      ephemeral: true,
    });
    return;
  }

  // 3. Lấy GuildMember của target
  const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
  if (!targetMember) {
    await interaction.reply({
      content: "❌ Không tìm thấy thành viên này trong server!",
      ephemeral: true,
    });
    return;
  }

  // 4. Kiểm tra target có đang kết nối voice không
  if (!targetMember.voice.channel) {
    await interaction.reply({
      content: `❌ **${targetMember.displayName}** hiện không tham gia kênh thoại nào!`,
      ephemeral: true,
    });
    return;
  }

  // 5. Kiểm tra phân cấp Role (Role Hierarchy)
  if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
    await interaction.reply({
      content: `❌ Không thể kick **${targetMember.displayName}** vì Role của họ cao hơn hoặc ngang bằng Role của Bot!`,
      ephemeral: true,
    });
    return;
  }

  // 6. Thực thi ngắt kết nối voice
  try {
    const channelName = targetMember.voice.channel.name;
    await targetMember.voice.disconnect(reason);
    Logger.info(`Kicked member ${targetMember.user.tag} from voice (${channelName}). Reason: ${reason}`, guild.id);

    await interaction.reply({
      content: `👢 Đã kick thành công **${targetMember.displayName}** ra khỏi kênh thoại **${channelName}**!\n*Lý do: ${reason}*`,
    });
  } catch (error) {
    Logger.error(`Failed to disconnect member ${targetMember.user.tag}`, error, guild.id);
    await interaction.reply({
      content: "❌ Đã xảy ra lỗi khi cố gắng ngắt kết nối voice của thành viên này!",
      ephemeral: true,
    });
  }
}
