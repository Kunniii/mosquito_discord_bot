import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, VoiceChannel } from "discord.js";
import { GuildMosquitoManager } from "../managers/GuildMosquitoManager.ts";

export const spawnCommand = new SlashCommandBuilder()
  .setName("spawn")
  .setDescription("Quản lý dịch vụ muỗi vo ve")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("on")
      .setDescription("Bật muỗi rình rập và random bay vào các phòng voice có người!")
      .addChannelOption((option) =>
        option
          .setName("kênh_thoại")
          .setDescription("Cố định một kênh thoại (bỏ trống để muỗi tự do random tất cả phòng có người)")
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) => subcommand.setName("off").setDescription("Ngừng sinh ra muỗi và rời phòng"));

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "# Không biếc gì hếc... Phải dùng lệnh trong một server!",
      ephemeral: true,
    });
    return;
  }

  if (interaction.isChatInputCommand()) {
    const subcommand = interaction.options.getSubcommand();
    const manager = GuildMosquitoManager.getInstance();

    if (subcommand === "on") {
      const channel = interaction.options.getChannel("kênh_thoại");

      if (channel && !(channel instanceof VoiceChannel)) {
        await interaction.reply({
          content: "Kênh chỉ định phải là Voice room! :face_holding_back_tears:",
          ephemeral: true,
        });
        return;
      }

      manager.registerAndStart(interaction.guild, (channel as VoiceChannel) || undefined);

      if (channel) {
        await interaction.reply(`OK! Muỗi đã được bật và sẽ rình rập cố định phòng <#${channel.id}> :eyes:`);
      } else {
        await interaction.reply(
          `OK! Muỗi đã được kích hoạt trên **toàn server** và sẽ **ngẫu nhiên bay vào bất kỳ phòng voice nào có người**! 🦟💨`
        );
      }
    } else if (subcommand === "off") {
      const stopped = manager.stop(interaction.guild.id);
      if (stopped) {
        await interaction.reply("OK! Đã tắt muỗi và ngắt kết nối thoại hoàn toàn! :face_holding_back_tears:");
      } else {
        await interaction.reply("Hiện tại muỗi chưa được bật trên server này!");
      }
    }
  }
}
