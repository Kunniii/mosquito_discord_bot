import { EmbedBuilder } from "discord.js";
import { db } from "../db/database.ts";
import { Logger } from "../utils/logger.ts";

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
  guild_id: string;
  user_id: string;
  display_name: string;
  slap_count: number;
  current_streak: number;
  highest_streak: number;
}

export class MosquitoTracker {
  private static instance: MosquitoTracker;

  // In-memory cache (lưu trên RAM để đọc/ghi tức thì)
  private guildCache = new Map<string, GuildMosquitoStats>();
  private userCache = new Map<string, Map<string, UserStatsRow>>();
  private globalCache: GlobalMosquitoStats = { totalSlaps: 0 };

  // Hàng đợi các bản ghi thay đổi chờ ghi batch vào DB
  private dirtyGuilds = new Set<string>();
  private dirtyUsers = new Set<string>(); // format: `${guildId}:${userId}`
  private isGlobalDirty = false;
  private flushTimer: NodeJS.Timeout | undefined;
  private readonly FLUSH_INTERVAL_MS = 10_000; // Ghi batch xuống DB mỗi 10 giây

  private stmtUpsertGuild = db.prepare(`
    INSERT INTO guild_stats (guild_id, total_slaps, current_streak, highest_streak, last_slapped_by, last_slapped_user_id)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      total_slaps = excluded.total_slaps,
      current_streak = excluded.current_streak,
      highest_streak = excluded.highest_streak,
      last_slapped_by = excluded.last_slapped_by,
      last_slapped_user_id = excluded.last_slapped_user_id
  `);

  private stmtUpsertUser = db.prepare(`
    INSERT INTO user_stats (guild_id, user_id, display_name, slap_count, current_streak, highest_streak)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      display_name = excluded.display_name,
      slap_count = excluded.slap_count,
      current_streak = excluded.current_streak,
      highest_streak = excluded.highest_streak
  `);

  private stmtUpdateGlobal = db.prepare(`
    UPDATE global_stats
    SET total_slaps = ?,
        last_slapped_at = ?,
        last_slapped_by = ?
    WHERE id = 1
  `);

  private constructor() {
    this.loadFromDb();
    this.startBatchTimer();
  }

  public static getInstance(): MosquitoTracker {
    if (!MosquitoTracker.instance) {
      MosquitoTracker.instance = new MosquitoTracker();
    }
    return MosquitoTracker.instance;
  }

  private loadFromDb() {
    const globalRow = db.prepare("SELECT * FROM global_stats WHERE id = 1").get() as unknown as GlobalStatsRow | undefined;
    if (globalRow) {
      this.globalCache = {
        totalSlaps: globalRow.total_slaps,
        lastSlappedAt: globalRow.last_slapped_at ?? undefined,
        lastSlappedBy: globalRow.last_slapped_by ?? undefined,
      };
    }

    const guildRows = db.prepare("SELECT * FROM guild_stats").all() as unknown as GuildStatsRow[];
    for (const row of guildRows) {
      this.guildCache.set(row.guild_id, {
        totalSlaps: row.total_slaps,
        currentStreak: row.current_streak,
        highestStreak: row.highest_streak,
        lastSlappedBy: row.last_slapped_by ?? undefined,
        lastSlappedUserId: row.last_slapped_user_id ?? undefined,
      });
    }

    const userRows = db.prepare("SELECT * FROM user_stats").all() as unknown as UserStatsRow[];
    for (const row of userRows) {
      let guildUsers = this.userCache.get(row.guild_id);
      if (!guildUsers) {
        guildUsers = new Map();
        this.userCache.set(row.guild_id, guildUsers);
      }
      guildUsers.set(row.user_id, row);
    }

    Logger.info(
      `Loaded ${guildRows.length} guilds, ${userRows.length} users, global total: ${this.globalCache.totalSlaps} slaps into memory cache.`
    );
  }

  private startBatchTimer() {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.flushBatch();
    }, this.FLUSH_INTERVAL_MS);
    this.flushTimer.unref();
  }

  /**
   * Ghi toàn bộ các thay đổi tích lũy từ RAM xuống SQLite trong 1 transaction duy nhất để tránh lock DB.
   */
  public flushBatch() {
    if (this.dirtyGuilds.size === 0 && this.dirtyUsers.size === 0 && !this.isGlobalDirty) {
      return;
    }

    const guildsToFlush = Array.from(this.dirtyGuilds);
    const usersToFlush = Array.from(this.dirtyUsers);
    const flushGlobal = this.isGlobalDirty;

    this.dirtyGuilds.clear();
    this.dirtyUsers.clear();
    this.isGlobalDirty = false;

    try {
      db.exec("BEGIN IMMEDIATE");
      try {
        for (const guildId of guildsToFlush) {
          const stat = this.guildCache.get(guildId);
          if (stat) {
            this.stmtUpsertGuild.run(
              guildId,
              stat.totalSlaps,
              stat.currentStreak,
              stat.highestStreak,
              stat.lastSlappedBy ?? null,
              stat.lastSlappedUserId ?? null
            );
          }
        }

        for (const key of usersToFlush) {
          const [guildId, userId] = key.split(":");
          const userStat = this.userCache.get(guildId)?.get(userId);
          if (userStat) {
            this.stmtUpsertUser.run(
              guildId,
              userId,
              userStat.display_name,
              userStat.slap_count,
              userStat.current_streak,
              userStat.highest_streak
            );
          }
        }

        if (flushGlobal) {
          this.stmtUpdateGlobal.run(
            this.globalCache.totalSlaps,
            this.globalCache.lastSlappedAt ?? null,
            this.globalCache.lastSlappedBy ?? null
          );
        }

        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
    } catch (error) {
      // Nếu ghi lỗi (VD: busy), trả lại queue để đợt batch sau ghi lại
      guildsToFlush.forEach((g) => this.dirtyGuilds.add(g));
      usersToFlush.forEach((u) => this.dirtyUsers.add(u));
      if (flushGlobal) this.isGlobalDirty = true;
      Logger.error("Failed to flush stats batch to SQLite, will retry next cycle:", error);
    }
  }

  public getStats(guildId: string): GuildMosquitoStats {
    let stat = this.guildCache.get(guildId);
    if (!stat) {
      stat = {
        totalSlaps: 0,
        currentStreak: 0,
        highestStreak: 0,
      };
      this.guildCache.set(guildId, stat);
    }
    return stat;
  }

  public getUserStats(guildId: string, userId: string): UserStatsRow | undefined {
    return this.userCache.get(guildId)?.get(userId);
  }

  public getGlobalStats(): GlobalMosquitoStats {
    return { ...this.globalCache };
  }

  public recordSlap(
    guildId: string,
    userId: string,
    displayName: string
  ): { stats: GuildMosquitoStats; userStreak: number; userTotal: number } {
    // 1. Cập nhật Guild stats trong RAM
    const stat = this.getStats(guildId);
    stat.totalSlaps += 1;
    stat.currentStreak += 1;
    if (stat.currentStreak > stat.highestStreak) {
      stat.highestStreak = stat.currentStreak;
    }
    stat.lastSlappedBy = displayName;
    stat.lastSlappedUserId = userId;
    this.dirtyGuilds.add(guildId);

    // 2. Cập nhật User stats trong RAM
    let guildUsers = this.userCache.get(guildId);
    if (!guildUsers) {
      guildUsers = new Map();
      this.userCache.set(guildId, guildUsers);
    }

    let userStat = guildUsers.get(userId);
    if (!userStat) {
      userStat = {
        guild_id: guildId,
        user_id: userId,
        display_name: displayName,
        slap_count: 0,
        current_streak: 0,
        highest_streak: 0,
      };
      guildUsers.set(userId, userStat);
    }

    userStat.display_name = displayName;
    userStat.slap_count += 1;
    userStat.current_streak += 1;
    if (userStat.current_streak > userStat.highest_streak) {
      userStat.highest_streak = userStat.current_streak;
    }
    this.dirtyUsers.add(`${guildId}:${userId}`);

    // 3. Cập nhật Global stats trong RAM
    this.globalCache.totalSlaps += 1;
    this.globalCache.lastSlappedAt = new Date().toISOString();
    this.globalCache.lastSlappedBy = displayName;
    this.isGlobalDirty = true;

    return {
      stats: stat,
      userStreak: userStat.current_streak,
      userTotal: userStat.slap_count,
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
    const stat = this.getStats(guildId);
    stat.currentStreak = 0;
    this.dirtyGuilds.add(guildId);
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
    const guildUsers = this.userCache.get(guildId);
    const rows = guildUsers
      ? Array.from(guildUsers.values())
          .sort((a, b) => b.slap_count - a.slap_count)
          .slice(0, 10)
      : [];

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
