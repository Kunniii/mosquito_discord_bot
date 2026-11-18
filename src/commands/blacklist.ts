import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember, PermissionsBitField, VoiceChannel } from "discord.js";
import { BlacklistManager } from "../managers/BlacklistManager.ts";
import { GuildMosquitoManager } from "../managers/GuildMosquitoManager.ts";

function parseChannelIds(singleChannelId?: string | null, rawList?: string | null): string[] {
  const ids = new Set<string>();
  if (singleChannelId) {
    ids.add(singleChannelId);
  }
  if (rawList) {
    // Khớp cả mention <#123456> lẫn ID số thuần túy (17-20 chữ số)
    const matches = rawList.match(/\d{17,20}/g);
    if (matches) {
      for (const m of matches) {
        ids.add(m);
      }
    }
  }
  return Array.from(ids);
}

export const blacklistCommand = new SlashCommandBuilder()
  .setName("blacklist")
  .setDescription("Quản lý danh sách các phòng voice cấm muỗi bay vào")
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Thêm phòng voice vào blacklist")
      .addChannelOption((opt) =>
        opt.setName("kênh").setDescription("Chọn một kênh thoại để cấm muỗi").setRequired(false)
      )
      .addStringOption((opt) =>
        opt
          .setName("danh_sách")
          .setDescription("Nhập nhiều kênh cùng lúc (VD: #phong1 #phong2 hoặc ID cách nhau bởi dấu cách)")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Xóa phòng voice khỏi blacklist")
      .addChannelOption((opt) =>
        opt.setName("kênh").setDescription("Chọn kênh thoại cần bỏ cấm").setRequired(false)
      )
      .addStringOption((opt) =>
        opt
          .setName("danh_sách")
          .setDescription("Nhập nhiều kênh cần bỏ cấm")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) => sub.setName("clear").setDescription("Xóa toàn bộ blacklist của server"))
  .addSubcommand((sub) => sub.setName("list").setDescription("Xem danh sách các phòng đang bị cấm"));

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "Lệnh này chỉ dùng được trong server!",
      ephemeral: true,
    });
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const member = interaction.member as GuildMember;
  if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    await interaction.reply({
      content: "❌ Bạn cần quyền `Manage Channels` để chỉnh sửa Blacklist!",
      ephemeral: true,
    });
    return;
  }

  const guildId = interaction.guild.id;
  const subcommand = interaction.options.getSubcommand();
  const blacklist = BlacklistManager.getInstance();

  if (subcommand === "add") {
    const channelOpt = interaction.options.getChannel("kênh");
    const rawList = interaction.options.getString("danh_sách");

    if (channelOpt && !(channelOpt instanceof VoiceChannel)) {
      await interaction.reply({
        content: "❌ Chỉ có thể thêm kênh thoại (Voice Channel) vào blacklist!",
        ephemeral: true,
      });
      return;
    }

    const ids = parseChannelIds(channelOpt?.id, rawList);
    if (ids.length === 0) {
      await interaction.reply({
        content: "❌ Vui lòng chọn ít nhất một kênh thoại hoặc nhập danh sách ID/tag kênh!",
        ephemeral: true,
      });
      return;
    }

    // Lọc lại các ID thực sự là VoiceChannel trong guild
    const validVoiceIds = ids.filter((id) => {
      const ch = interaction.guild!.channels.cache.get(id);
      return ch instanceof VoiceChannel;
    });

    if (validVoiceIds.length === 0) {
      await interaction.reply({
        content: "❌ Không tìm thấy kênh thoại (Voice Channel) hợp lệ nào trong danh sách bạn cung cấp!",
        ephemeral: true,
      });
      return;
    }

    const added = blacklist.addChannels(guildId, validVoiceIds);

    // Nếu muỗi đang ở trong phòng vừa bị blacklist, đuổi nó ra ngay lập tức
    const mosquitoManager = GuildMosquitoManager.getInstance();
    const mosquito = mosquitoManager.get(guildId);
    const currentChannelId = mosquito?.getCurrentVoiceChannelId();
    if (mosquito && currentChannelId && validVoiceIds.includes(currentChannelId)) {
      mosquito.disconnect();
      if (mosquito.isEnabled) {
        mosquito.scheduleNextSpawn();
      }
    }

    const tags = validVoiceIds.map((id) => `<#${id}>`).join(", ");
    await interaction.reply(
      `🚫 Đã thêm ${added.length > 0 ? added.map((id) => `<#${id}>`).join(", ") : tags} vào **Blacklist**! Muỗi sẽ không bao giờ bay vào các phòng này.`
    );
  } else if (subcommand === "remove") {
    const channelOpt = interaction.options.getChannel("kênh");
    const rawList = interaction.options.getString("danh_sách");
    const ids = parseChannelIds(channelOpt?.id, rawList);

    if (ids.length === 0) {
      await interaction.reply({
        content: "❌ Vui lòng chọn kênh hoặc nhập danh sách kênh cần xóa khỏi blacklist!",
        ephemeral: true,
      });
      return;
    }

    const removed = blacklist.removeChannels(guildId, ids);
    if (removed.length === 0) {
      await interaction.reply({
        content: "ℹ️ Không có kênh nào trong danh sách trên nằm trong blacklist.",
        ephemeral: true,
      });
      return;
    }

    await interaction.reply(
      `✅ Đã gỡ ${removed.map((id) => `<#${id}>`).join(", ")} khỏi **Blacklist**!`
    );
  } else if (subcommand === "clear") {
    blacklist.clearBlacklist(guildId);
    await interaction.reply("🧹 Đã xóa sạch **Blacklist** của server! Muỗi có thể bay vào mọi phòng voice.");
  } else if (subcommand === "list") {
    const list = blacklist.getBlacklist(guildId);
    if (list.length === 0) {
      await interaction.reply("ℹ️ Server hiện chưa có phòng nào trong **Blacklist**.");
    } else {
      await interaction.reply(`🚫 **Danh sách Blacklist:** ${list.map((id) => `<#${id}>`).join(", ")}`);
    }
  }
}
