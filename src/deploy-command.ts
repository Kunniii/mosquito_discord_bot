import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { pingCommand } from "./commands/ping";
import { spawnCommand } from "./commands/spawn";

const commands = [pingCommand.toJSON(), spawnCommand.toJSON()];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN as string);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationCommands(process.env.APP_ID as string), {
      body: commands,
    });

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();
