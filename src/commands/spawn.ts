import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, VoiceChannel } from "discord.js";
import { GuildMosquitoManager } from "../managers/GuildMosquitoManager.ts";

export const spawnCommand = new SlashCommandBuilder()
  .setName("spawn")
  .setDescription("Quản lý dịch vụ muỗi vo ve")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("on")
      .setDescription("Sinh ra muỗi vào một kênh thoại!")
      .addChannelOption((option) =>
        option.setName("kênh_thoại").setDescription("Kênh thoại để muỗi quấy rối").setRequired(true)
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

      if (!(channel instanceof VoiceChannel)) {
        await interaction.reply({
          content: "Muỗi chỉ join được vào Voice room thôi! :face_holding_back_tears:",
          ephemeral: true,
        });
        return;
      }

      manager.registerAndStart(channel);
      await interaction.reply(`OK! Muỗi đã được bật và sẽ random join vô phòng <#${channel.id}> :eyes:`);
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
