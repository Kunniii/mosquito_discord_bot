import { EmbedBuilder } from "discord.js";
import { db } from "../db/database.ts";

export interface GuildMosquitoStats {
  totalSlaps: number;
  currentStreak: number;
  highestStreak: number;
  lastSlappedBy?: string;
  lastSlappedUserId?: string;
}

export interface GlobalMosquitoStats {
  totalSlaps: number;
  lastSlappedAt?: string;
  lastSlappedBy?: string;
}

interface GlobalStatsRow {
  id: number;
  total_slaps: number;
  last_slapped_at: string | null;
  last_slapped_by: string | null;
}

interface GuildStatsRow {
  guild_id: string;
  total_slaps: number;
  current_streak: number;
  highest_streak: number;
  last_slapped_by: string | null;
  last_slapped_user_id: string | null;
}

interface UserStatsRow {
  user_id: string;
  display_name: string;
  slap_count: number;
  current_streak: number;
  highest_streak: number;
}

export class MosquitoTracker {
  private static instance: MosquitoTracker;

  private stmtGetGuild = db.prepare("SELECT * FROM guild_stats WHERE guild_id = ?");
  private stmtGetUser = db.prepare("SELECT * FROM user_stats WHERE guild_id = ? AND user_id = ?");
  private stmtUpsertGuild = db.prepare(`
    INSERT INTO guild_stats (guild_id, total_slaps, current_streak, highest_streak, last_slapped_by, last_slapped_user_id)
    VALUES (?, 1, 1, 1, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      total_slaps = total_slaps + 1,
      current_streak = current_streak + 1,
      highest_streak = MAX(highest_streak, current_streak + 1),
      last_slapped_by = excluded.last_slapped_by,
      last_slapped_user_id = excluded.last_slapped_user_id
  `);
  private stmtUpsertUser = db.prepare(`
    INSERT INTO user_stats (guild_id, user_id, display_name, slap_count, current_streak, highest_streak)
    VALUES (?, ?, ?, 1, 1, 1)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      display_name = excluded.display_name,
      slap_count = slap_count + 1,
      current_streak = current_streak + 1,
      highest_streak = MAX(highest_streak, current_streak + 1)
  `);
  private stmtResetStreak = db.prepare("UPDATE guild_stats SET current_streak = 0 WHERE guild_id = ?");
  private stmtTopUsers = db.prepare(
    "SELECT user_id, display_name, slap_count, current_streak, highest_streak FROM user_stats WHERE guild_id = ? ORDER BY slap_count DESC LIMIT 10"
  );
  private stmtGetGlobal = db.prepare("SELECT * FROM global_stats WHERE id = 1");
  private stmtUpdateGlobal = db.prepare(`
    UPDATE global_stats
    SET total_slaps = total_slaps + 1,
        last_slapped_at = ?,
        last_slapped_by = ?
    WHERE id = 1
  `);

  private constructor() {}

  public static getInstance(): MosquitoTracker {
    if (!MosquitoTracker.instance) {
      MosquitoTracker.instance = new MosquitoTracker();
    }
    return MosquitoTracker.instance;
  }

  public getStats(guildId: string): GuildMosquitoStats {
    const row = this.stmtGetGuild.get(guildId) as unknown as GuildStatsRow | undefined;
    if (!row) {
      return {
        totalSlaps: 0,
        currentStreak: 0,
        highestStreak: 0,
      };
    }
    return {
      totalSlaps: row.total_slaps,
      currentStreak: row.current_streak,
      highestStreak: row.highest_streak,
      lastSlappedBy: row.last_slapped_by ?? undefined,
      lastSlappedUserId: row.last_slapped_user_id ?? undefined,
    };
  }

  public getUserStats(guildId: string, userId: string): UserStatsRow | undefined {
    return this.stmtGetUser.get(guildId, userId) as unknown as UserStatsRow | undefined;
  }

  public getGlobalStats(): GlobalMosquitoStats {
    const row = this.stmtGetGlobal.get() as unknown as GlobalStatsRow | undefined;
    if (!row) {
      return { totalSlaps: 0 };
    }
    return {
      totalSlaps: row.total_slaps,
      lastSlappedAt: row.last_slapped_at ?? undefined,
      lastSlappedBy: row.last_slapped_by ?? undefined,
    };
  }

  public recordSlap(
    guildId: string,
    userId: string,
    displayName: string
  ): { stats: GuildMosquitoStats; userStreak: number; userTotal: number } {
    const nowIso = new Date().toISOString();
    db.exec("BEGIN");
    try {
      this.stmtUpsertGuild.run(guildId, displayName, userId);
      this.stmtUpsertUser.run(guildId, userId, displayName);
      this.stmtUpdateGlobal.run(nowIso, displayName);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }

    const stats = this.getStats(guildId);
    const userRow = this.getUserStats(guildId, userId);

    return {
      stats,
      userStreak: userRow?.current_streak ?? 1,
      userTotal: userRow?.slap_count ?? 1,
    };
  }

  public formatSlapText(displayName: string, userId: string, guildId: string): string {
    const userRow = this.getUserStats(guildId, userId);
    const userStreak = userRow?.current_streak ?? 1;
    const userTotal = userRow?.slap_count ?? 1;

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
    this.stmtResetStreak.run(guildId);
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

  public createLeaderboardEmbed(guildId: string, guildName: string): EmbedBuilder {
    const stat = this.getStats(guildId);
    const rows = this.stmtTopUsers.all(guildId) as unknown as UserStatsRow[];

    let description = "";
    if (rows.length === 0) {
      description = "Chưa có ai đập được con muỗi nào trong server này! 🦟";
    } else {
      const medals = ["🥇", "🥈", "🥉"];
      description = rows
        .map((row, idx) => {
          const rank = medals[idx] ?? `**#${idx + 1}**`;
          return `${rank} <@${row.user_id}> — **${row.slap_count}** con *(Streak: ${row.current_streak})*`;
        })
        .join("\n");
    }

    return new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle(`🏆 Bảng Xếp Hạng Diệt Muỗi — ${guildName}`)
      .setDescription(description)
      .setFooter({ text: `Tổng cộng toàn server đã diệt: ${stat.totalSlaps} con muỗi` });
  }
}
