import { DatabaseSync } from "node:sqlite";
import * as fs from "node:fs";
import * as path from "node:path";
import { Logger } from "../utils/logger.ts";

const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), "data/mosquito.db");
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(dbPath);

// Bật WAL mode để đọc/ghi nhanh và ổn định hơn
db.exec("PRAGMA journal_mode = WAL;");

// Khởi tạo schema bảng nếu chưa có
db.exec(`
  CREATE TABLE IF NOT EXISTS guild_stats (
    guild_id TEXT PRIMARY KEY,
    total_slaps INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    highest_streak INTEGER NOT NULL DEFAULT 0,
    last_slapped_by TEXT,
    last_slapped_user_id TEXT
  );

  CREATE TABLE IF NOT EXISTS user_stats (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    slap_count INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    highest_streak INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS global_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_slaps INTEGER NOT NULL DEFAULT 0,
    last_slapped_at TEXT,
    last_slapped_by TEXT
  );

  INSERT OR IGNORE INTO global_stats (id, total_slaps) VALUES (1, 0);
`);

Logger.info(`SQLite database initialized at ${dbPath}`);
