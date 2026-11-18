import { EmbedBuilder } from "discord.js";

export interface GuildMosquitoStats {
  totalSlaps: number;
  currentStreak: number;
  highestStreak: number;
  lastSlappedBy?: string;
  lastSlappedUserId?: string;
  userSlapCounts: Record<string, number>;
  userStreaks: Record<string, number>;
  userHighestStreaks: Record<string, number>;
}

export class MosquitoTracker {
  private static instance: MosquitoTracker;
  private stats = new Map<string, GuildMosquitoStats>();

  private constructor() {}

  public static getInstance(): MosquitoTracker {
    if (!MosquitoTracker.instance) {
      MosquitoTracker.instance = new MosquitoTracker();
    }
    return MosquitoTracker.instance;
  }

  public getStats(guildId: string): GuildMosquitoStats {
    let stat = this.stats.get(guildId);
    if (!stat) {
      stat = {
        totalSlaps: 0,
        currentStreak: 0,
        highestStreak: 0,
        userSlapCounts: {},
        userStreaks: {},
        userHighestStreaks: {},
      };
      this.stats.set(guildId, stat);
    }
    return stat;
  }

  public recordSlap(guildId: string, userId: string, displayName: string): { stats: GuildMosquitoStats; userStreak: number; userTotal: number } {
    const stat = this.getStats(guildId);

    stat.totalSlaps += 1;
    stat.currentStreak += 1;
    if (stat.currentStreak > stat.highestStreak) {
      stat.highestStreak = stat.currentStreak;
    }

    stat.lastSlappedBy = displayName;
    stat.lastSlappedUserId = userId;

    // Cập nhật thống kê cá nhân của người dùng
    stat.userSlapCounts[userId] = (stat.userSlapCounts[userId] || 0) + 1;
    stat.userStreaks[userId] = (stat.userStreaks[userId] || 0) + 1;
    if (stat.userStreaks[userId] > (stat.userHighestStreaks[userId] || 0)) {
      stat.userHighestStreaks[userId] = stat.userStreaks[userId];
    }

    return {
      stats: stat,
      userStreak: stat.userStreaks[userId],
      userTotal: stat.userSlapCounts[userId],
    };
  }

  public formatSlapText(displayName: string, userId: string, guildId: string): string {
    const stat = this.getStats(guildId);
    const userStreak = stat.userStreaks[userId] || 1;
    const userTotal = stat.userSlapCounts[userId] || 1;

    return `💥 **BỐP!** <@${userId}> vừa đập nát con muỗi! 🦟🪦 | 🔥 **Streak của bạn:** ${userStreak} liên tiếp *(Tổng diệt: ${userTotal} con)*`;
  }

  public formatFailText(userId: string): string {
    return `🦟 **Lêu lêu!** <@${userId}> đập hụt rồi nhé! Muỗi vẫn đang bay vo ve 😜`;
  }

  public formatWrongRoomText(userId: string, currentChannelId?: string): string {
    if (currentChannelId) {
      return `🦟 **Hụt rồi!** <@${userId}> ơi, muỗi đang vo ve ở phòng <#${currentChannelId}> cơ mà! Cậu có ở cùng phòng đó đâu mà đòi đập! 😜`;
    }
    return `🦟 **Hụt rồi!** <@${userId}> ơi, cậu phải vào cùng phòng voice với muỗi thì mới đập được chứ! 😜`;
  }

  public resetStreak(guildId: string) {
    const stat = this.getStats(guildId);
    stat.currentStreak = 0;
  }

  public createSlapEmbed(displayName: string, userAvatarUrl: string | null, stats: GuildMosquitoStats): EmbedBuilder {
    const streakTitle = stats.currentStreak > 1 ? ` 🔥 Chuỗi đập: ${stats.currentStreak} lần liên tiếp!` : "";
    
    // GIF "The Beast - I'm beasting it" siêu ngầu
    const beastGif = "https://media.tenor.com/oT_tiSLfRGUAAAAC/the-beast-im-beasting-it.gif";

    return new EmbedBuilder()
      .setColor(0xff3366) // Màu hồng đỏ nổi bật
      .setTitle(`💥 BỐP! Con muỗi đã bị đập nát! ${streakTitle}`)
      .setDescription(
        `Dũng sĩ **${displayName}** vừa hoá quái thú tung đòn sấm sét tiêu diệt con muỗi! 🦟🪦\n*“I’M BEASTING IT!”* 🔥`
      )
      .addFields(
        { name: "⚡ Chuỗi (Streak)", value: `**${stats.currentStreak}** lần`, inline: true },
        { name: "👑 Kỷ lục", value: `**${stats.highestStreak}** lần`, inline: true },
        { name: "☠️ Đã diệt", value: `**${stats.totalSlaps}** con`, inline: true }
      )
      .setImage(beastGif)
      .setThumbnail(userAvatarUrl || "https://cdn-icons-png.flaticon.com/512/2822/2822506.png")
      .setFooter({
        text: "Mosquito Slayer • The Beast • Muỗi sẽ tái sinh sau ít phút...",
      })
      .setTimestamp();
  }

  public createFailEmbed(displayName: string, userAvatarUrl: string | null): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0xf1c40f) // Màu vàng trêu ngươi
      .setTitle("🦟 Lêu lêu! Đập hụt rồi nhé!")
      .setDescription(
        `Cậu **${displayName}** vừa đập hụt con muỗi rồi! Nó vẫn đang bay vo ve lượn lờ chọc tức cậu đó 😜`
      )
      .addFields({
        name: "💡 Mẹo đập muỗi:",
        value: "Tag bot kèm các từ khóa chuẩn: `đập`, `dap`, `slap`, `hit`, `kill`, `👏`",
      })
      .setThumbnail(userAvatarUrl || "https://cdn-icons-png.flaticon.com/512/2822/2822506.png")
      .setFooter({ text: "Mosquito Tracker • Thử lại đi nào!" });
  }

  public createStatsEmbed(stats: GuildMosquitoStats, guildName: string): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0x00a8ff)
      .setTitle(`🦟 Thống kê Diệt Muỗi: ${guildName}`)
      .setDescription(
        `⚡ Chuỗi: **${stats.currentStreak}** (Kỷ lục: **${stats.highestStreak}**)\n` +
        `☠️ Đã diệt: **${stats.totalSlaps}** con | 🎯 Gần nhất: **${stats.lastSlappedBy || "Chưa có"}**`
      );
  }
}
