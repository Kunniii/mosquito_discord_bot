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
import { execute as executeDap } from "./commands/dap.ts";
import { execute as executeHelp } from "./commands/help.ts";
import { execute as executeLeaderboard } from "./commands/leaderboard.ts";
import { execute as executeBlacklist } from "./commands/blacklist.ts";
import { execute as executeShowConfig } from "./commands/show-config.ts";
import { GuildMosquitoManager } from "./managers/GuildMosquitoManager.ts";
import { MosquitoTracker } from "./managers/MosquitoTracker.ts";
import { SlapResultType } from "./managers/MosquitoInstance.ts";
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
    } else if (commandName === "dap" || commandName === "slap") {
      await executeDap(interaction);
    } else if (commandName === "help") {
      await executeHelp(interaction);
    } else if (commandName === "leaderboard") {
      await executeLeaderboard(interaction);
    } else if (commandName === "blacklist") {
      await executeBlacklist(interaction);
    } else if (commandName === "show-config") {
      await executeShowConfig(interaction);
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

// Xử lý Đập Muỗi qua Chat (Mention hoặc Prefix command !dap, !slap, dap muoi)
client.on(Events.MessageCreate, async (message: Message) => {
  if (message.author.bot || !message.guild) return;

  const guildId = message.guild.id;
  const isMentioned = message.mentions.has(client.user!);
  const contentLower = message.content.toLowerCase().trim();

  // Nhận diện prefix command: !dap, !slap, dap muoi, đập muỗi
  const isPrefixSlap =
    contentLower.startsWith("!dap") ||
    contentLower.startsWith("!slap") ||
    contentLower.startsWith("dap muoi") ||
    contentLower.startsWith("đập muỗi") ||
    contentLower.startsWith("/dap") ||
    contentLower.startsWith("/slap");

  if (isMentioned || isPrefixSlap) {
    const tracker = MosquitoTracker.getInstance();

    // Loại bỏ mention <@ID> hoặc <@!ID> khỏi nội dung tin nhắn để tìm từ khóa
    const contentWithoutMention = message.content.replace(/<@!?\d+>/g, "").trim().toLowerCase();

    const acceptKeywords = [
      "slap", "dap", "đập", "hit", "kill", "giết", "chết", "cút", "vỗ",
      "cmm", "dmm", "dcmm", "👏", "bốp", "die"
    ];

    const hasSlapKeyword = isPrefixSlap || acceptKeywords.some((kw) => contentWithoutMention.includes(kw));

    if (manager.isConnected(guildId)) {
      if (hasSlapKeyword) {
        const member = message.member || (await message.guild.members.fetch(message.author.id).catch(() => null));
        const userVoiceChannelId = member?.voice?.channelId;

        const result = manager.slap(guildId, message.author.displayName, userVoiceChannelId);

        if (result.type === SlapResultType.SUCCESS) {
          tracker.recordSlap(guildId, message.author.id, message.author.displayName);
          const replyText = tracker.formatSlapText(message.author.displayName, message.author.id, guildId);
          await message.reply(replyText);
        } else if (result.type === SlapResultType.WRONG_ROOM) {
          const wrongRoomText = tracker.formatWrongRoomText(message.author.id, result.currentChannelId);
          await message.reply(wrongRoomText);
        } else {
          await message.reply("# :mosquito:\n## Muỗi chưa bay vào phòng voice nào á cậu, từ từ =))");
        }
      } else {
        const failText = tracker.formatFailText(message.author.id);
        await message.reply(failText);
      }
    } else {
      await message.reply(
        `# :mosquito:\n## Muỗi chưa bay vào phòng voice nào á cậu, từ từ =))`
      );
    }
  }
});

// Lắng nghe Voice State để tự động xử lý khi Bot bị ngắt kết nối hoặc phòng voice hết người
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  const guildId = oldState.guild.id;
  const mosquito = manager.get(guildId);

  // Nếu bot rời phòng voice (bị kick hoặc disconnect)
  if (oldState.member?.id === client.user?.id && !newState.channelId) {
    if (mosquito && mosquito.isVoiceConnected) {
      Logger.info("Bot bị ngắt kết nối khỏi voice channel bởi server.", guildId);
      mosquito.handleDisconnect();
    }
    return;
  }

  // Nếu mọi người trong phòng thoại của muỗi đều rời đi
  if (mosquito && mosquito.isVoiceConnected && mosquito.currentChannel) {
    if (oldState.channelId === mosquito.currentChannel.id) {
      const nonBotMembers = mosquito.currentChannel.members.filter((m) => !m.user.bot);
      if (nonBotMembers.size === 0) {
        Logger.info(
          `Tất cả thành viên đã rời phòng ${mosquito.currentChannel.name}. Muỗi rời phòng và lên lịch bay tiếp.`,
          guildId
        );
        mosquito.disconnect();
        if (mosquito.isEnabled) {
          mosquito.scheduleNextSpawn();
        }
      }
    }
  }
});

client.login(token);

// Đảm bảo ghi hết batch SQLite trước khi tắt bot
const gracefulShutdown = () => {
  Logger.info("Shutting down... Flushing remaining stats batch to SQLite.");
  MosquitoTracker.getInstance().flushBatch();
  process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
