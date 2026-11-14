import {
  Client,
  Events,
  GatewayIntentBits,
  Message,
} from "discord.js";
import { execute as executePing } from "./commands/ping.ts";
import { execute as executeSpawn } from "./commands/spawn.ts";
import { execute as executeSpawnNow } from "./commands/spawn-now.ts";
import { execute as executeStats } from "./commands/stats.ts";
import { GuildMosquitoManager } from "./managers/GuildMosquitoManager.ts";
import { MosquitoTracker } from "./managers/MosquitoTracker.ts";
import { Logger } from "./utils/logger.ts";

const token = process.env.TOKEN;
if (!token) {
  Logger.error("Thiếu biến môi trường TOKEN. Vui lòng cung cấp trong .env hoặc environment.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

const manager = GuildMosquitoManager.getInstance();

client.once(Events.ClientReady, () => {
  Logger.info(`Bot đã sẵn sàng và online dưới tên: ${client.user?.tag}`);
});

// Xử lý Slash Commands
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    if (commandName === "ping") {
      await executePing(interaction);
    } else if (commandName === "spawn") {
      await executeSpawn(interaction);
    } else if (commandName === "spawn-now") {
      await executeSpawnNow(interaction);
    } else if (commandName === "mosquito-stats") {
      await executeStats(interaction);
    }
  } catch (error) {
    Logger.error(`Lỗi khi thực thi lệnh /${commandName}:`, error, interaction.guildId ?? undefined);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: "Đã xảy ra lỗi khi thực thi lệnh!", ephemeral: true });
    } else {
      await interaction.reply({ content: "Đã xảy ra lỗi khi thực thi lệnh!", ephemeral: true });
    }
  }
});

// Xử lý Đập Muỗi qua Chat Mention
client.on(Events.MessageCreate, async (message: Message) => {
  if (message.author.bot || !message.guild) return;

  // Kiểm tra bot có được mention không
  if (message.mentions.has(client.user!)) {
    const guildId = message.guild.id;
    const tracker = MosquitoTracker.getInstance();

    // Loại bỏ mention <@ID> hoặc <@!ID> khỏi nội dung tin nhắn để lấy từ khóa
    const contentWithoutMention = message.content.replace(/<@!?\d+>/g, "").trim().toLowerCase();
    const commandWord = contentWithoutMention.split(/\s+/)[0];

    const acceptCommands = ["slap", "dap", "đập", "hit", "cmm", "dmm", "dcmm", "kill", "👏"];

    if (manager.isConnected(guildId)) {
      if (acceptCommands.includes(commandWord)) {
        manager.slap(guildId, message.author.displayName);
        const stats = tracker.recordSlap(guildId, message.author.id, message.author.displayName);
        const embed = tracker.createSlapEmbed(
          message.author.displayName,
          message.author.displayAvatarURL(),
          stats
        );
        await message.reply({ embeds: [embed] });
      } else {
        const failEmbed = tracker.createFailEmbed(
          message.author.displayName,
          message.author.displayAvatarURL()
        );
        await message.reply({ embeds: [failEmbed] });
      }
    } else {
      await message.reply(
        `# :mosquito:\n## Muỗi chưa bay vào phòng voice nào á cậu, từ từ =))`
      );
    }
  }
});

// Lắng nghe Voice State để tự động xử lý khi Bot bị ngắt kết nối
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  // Nếu bot rời phòng voice (bị kick hoặc disconnect)
  if (oldState.member?.id === client.user?.id && !newState.channelId) {
    const guildId = oldState.guild.id;
    const mosquito = manager.get(guildId);
    if (mosquito && mosquito.isVoiceConnected) {
      Logger.info("Bot bị ngắt kết nối khỏi voice channel bởi server.", guildId);
      mosquito.handleDisconnect();
    }
  }
});

client.login(token);
