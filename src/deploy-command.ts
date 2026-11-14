import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { pingCommand } from "./commands/ping.ts";
import { spawnCommand } from "./commands/spawn.ts";
import { spawnNowCommand } from "./commands/spawn-now.ts";
import { statsCommand } from "./commands/stats.ts";
import { dapCommand, slapCommand } from "./commands/dap.ts";
import { Logger } from "./utils/logger.ts";

const commands = [
  pingCommand.toJSON(),
  spawnCommand.toJSON(),
  spawnNowCommand.toJSON(),
  statsCommand.toJSON(),
  dapCommand.toJSON(),
  slapCommand.toJSON(),
];

const token = process.env.TOKEN;
const appId = process.env.APP_ID;

if (!token || !appId) {
  Logger.error("Vui lòng cung cấp đầy đủ biến môi trường TOKEN và APP_ID trong .env");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    Logger.info("Bắt đầu đăng ký (deploy) các Slash Commands...");

    await rest.put(Routes.applicationCommands(appId), {
      body: commands,
    });

    Logger.info("Đăng ký thành công các Slash Commands: ping, spawn, spawn-now, mosquito-stats, dap, slap.");
  } catch (error) {
    Logger.error("Lỗi khi đăng ký Slash Commands:", error);
  }
})();
