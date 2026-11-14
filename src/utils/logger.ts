export class Logger {
  static info(message: string, guildId?: string) {
    const prefix = guildId ? `[Guild: ${guildId}]` : "[Global]";
    console.log(`[INFO] ${prefix} ${message}`);
  }

  static warn(message: string, guildId?: string) {
    const prefix = guildId ? `[Guild: ${guildId}]` : "[Global]";
    console.warn(`[WARN] ${prefix} ${message}`);
  }

  static error(message: string, error?: unknown, guildId?: string) {
    const prefix = guildId ? `[Guild: ${guildId}]` : "[Global]";
    console.error(`[ERROR] ${prefix} ${message}`, error ?? "");
  }
}
