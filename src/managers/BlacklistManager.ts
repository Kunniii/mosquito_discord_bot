import { db } from "../db/database.ts";
import { Logger } from "../utils/logger.ts";

interface BlacklistRow {
  guild_id: string;
  channel_id: string;
}

export class BlacklistManager {
  private static instance: BlacklistManager;
  private cache = new Map<string, Set<string>>();

  private stmtInsert = db.prepare(
    "INSERT OR IGNORE INTO blacklisted_channels (guild_id, channel_id) VALUES (?, ?)"
  );
  private stmtDelete = db.prepare(
    "DELETE FROM blacklisted_channels WHERE guild_id = ? AND channel_id = ?"
  );
  private stmtClear = db.prepare("DELETE FROM blacklisted_channels WHERE guild_id = ?");

  private constructor() {
    this.loadFromDb();
  }

  public static getInstance(): BlacklistManager {
    if (!BlacklistManager.instance) {
      BlacklistManager.instance = new BlacklistManager();
    }
    return BlacklistManager.instance;
  }

  private loadFromDb() {
    const rows = db.prepare("SELECT guild_id, channel_id FROM blacklisted_channels").all() as unknown as BlacklistRow[];
    for (const row of rows) {
      let set = this.cache.get(row.guild_id);
      if (!set) {
        set = new Set();
        this.cache.set(row.guild_id, set);
      }
      set.add(row.channel_id);
    }
    Logger.info(`Loaded ${rows.length} blacklisted channels into memory.`);
  }

  public getBlacklist(guildId: string): string[] {
    return Array.from(this.cache.get(guildId) ?? []);
  }

  public isBlacklisted(guildId: string, channelId: string): boolean {
    return Boolean(this.cache.get(guildId)?.has(channelId));
  }

  public addChannels(guildId: string, channelIds: string[]): string[] {
    let set = this.cache.get(guildId);
    if (!set) {
      set = new Set();
      this.cache.set(guildId, set);
    }

    const added: string[] = [];
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const id of channelIds) {
        if (!set.has(id)) {
          set.add(id);
          this.stmtInsert.run(guildId, id);
          added.push(id);
        }
      }
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }

    return added;
  }

  public removeChannels(guildId: string, channelIds: string[]): string[] {
    const set = this.cache.get(guildId);
    if (!set) return [];

    const removed: string[] = [];
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const id of channelIds) {
        if (set.has(id)) {
          set.delete(id);
          this.stmtDelete.run(guildId, id);
          removed.push(id);
        }
      }
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }

    return removed;
  }

  public clearBlacklist(guildId: string) {
    this.cache.delete(guildId);
    this.stmtClear.run(guildId);
  }
}
