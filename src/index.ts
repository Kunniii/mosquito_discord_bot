import { Client, IntentsBitField, Message } from "discord.js";
import { execute as executePing } from "./commands/ping";
import { dapMuoi, execute as executeJoin, isMuoiConnected } from "./commands/spawn";
import { generateDependencyReport } from "@discordjs/voice";

console.log(generateDependencyReport());

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildVoiceStates,
  ],
});

client.once("ready", () => {
  console.log("Ready!");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === "ping") {
    await executePing(interaction);
  } else if (commandName === "spawn") {
    await executeJoin(interaction);
  }
});

client.on("messageCreate", async (message: Message) => {
  // Ignore messages from the bot itself
  if (message.author.bot) return;

  // Check if the bot is mentioned
  if (message.mentions.has(client.user!)) {
    if (isMuoiConnected()) {
      const acceptCommands = ["slap", "dap", "đập", "hit", "cmm", "dmm", "dcmm", "kill", "👏"];
      const command = message.content.split(" ")[0];
      if (acceptCommands.includes(command)) {
        await message.reply(
          `# :rightwards_pushing_hand: :mosquito: :leftwards_pushing_hand: \n ## Cậu ${message.author.displayName} mới đập muỗi :mosquito: :clap:`
        );
        dapMuoi();
      } else {
        await message.reply(
          `# :mosquito: :smirk: \n ## Lêu lêu cậu ${message.author.displayName} không biết đập muỗi :smirk: `
        );
      }
    } else {
      await message.reply(`# :mosquito: \n ## Muỗi chưa được sinh ra á cậu, từ từ =)) `);
    }
  }
});

client.login(process.env.TOKEN);
