import { SlashCommandBuilder } from "@discordjs/builders";
import { VoiceChannel, CommandInteraction } from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  VoiceConnection,
  AudioPlayer,
  getVoiceConnection,
} from "@discordjs/voice";
import * as path from "path";

class Mosquito {
  channel: VoiceChannel;
  soundPath: string;
  connection: VoiceConnection | undefined;
  isVoiceConnected = false;
  state = VoiceConnectionStatus.Signalling;
  player: AudioPlayer | undefined;

  constructor(channel: VoiceChannel, soundPath: string) {
    this.channel = channel;
    this.soundPath = path.join(__dirname, soundPath);
    console.log(`[+] using sound at ${this.soundPath}`);
  }

  async connect() {
    try {
      this.connection = getVoiceConnection(this.channel.guild.id);

      if (!this.connection) {
        console.log("[+] No exist connection, create new one!");
        this.connection = joinVoiceChannel({
          channelId: this.channel.id,
          guildId: this.channel.guild.id,
          adapterCreator: this.channel.guild.voiceAdapterCreator,
        });
      } else {
        console.log("[+] Using existing connection!");
      }

      this.player = createAudioPlayer();

      this.connection.on(VoiceConnectionStatus.Ready, (oldState, newState) => {
        console.log("[+] Connection is in the Ready state!");
      });
      this.player.on(AudioPlayerStatus.Playing, (oldState, newState) => {
        console.log("[+] Audio player is in the Playing state!");
      });

      this.isVoiceConnected = true;

      const resourcePath = this.soundPath;

      const playSound = () => {
        const resource = createAudioResource(resourcePath);
        this.player?.play(resource);
      };

      playSound();

      this.connection.subscribe(this.player);

      this.player.on(AudioPlayerStatus.Idle, () => {
        playSound();
      });

      this.player.on("error", (error) => {
        console.error(`Error: ${error.message} with resource ${resourcePath}`);
      });
    } catch (error) {
      console.error(error);
    }
  }

  disconnect() {
    if (this.connection) {
      console.log("[+] Muoi disconnected");
      this.connection.destroy();
      this.isVoiceConnected = false;
      this.player?.stop();
      this.player = undefined;
      this.connection = undefined;
    }
  }

  isVoiceChannelHasUser() {
    return this.channel.members.size > 0;
  }
}

let spawn = false;
let muoi: Mosquito;

function randomRangeInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function createMuoiAndJoin() {
  const m = randomRangeInt(3, 15);
  if (muoi && !muoi.isVoiceConnected) {
    console.log(`[+] Muoi will join in ${m}s`);
    setTimeout(async () => {
      if (muoi.isVoiceChannelHasUser()) {
        await muoi.connect();
        console.log("[+] Muoi joined!");
      } else {
        console.log("[!] Timeout but no active user!");
        createMuoiAndJoin();
      }
    }, m * 60 * 1000);
  }
}

export function isMuoiConnected() {
  return muoi && muoi.isVoiceConnected;
}

export function dapMuoi() {
  if (muoi && muoi.isVoiceConnected) {
    muoi.disconnect();
    if (spawn) {
      createMuoiAndJoin();
    }
  }
}

export const spawnCommand = new SlashCommandBuilder()
  .setName("spawn")
  .setDescription("Quản lý dịch vụ muỗi")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("on")
      .setDescription("Sinh ra muỗi vào một kênh thoại!")
      .addChannelOption((option) =>
        option.setName("kênh_thoại").setDescription("ID của kênh thoại").setRequired(true)
      )
  )
  .addSubcommand((subcommand) => subcommand.setName("off").setDescription("Ngừng sinh ra muỗi"));

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply("# Không biếc gì hếc... Join vô một cái server rồi xài!");
    return;
  }

  if (interaction.isChatInputCommand()) {
    const subcommand = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel("kênh_thoại");

    if (subcommand === "on") {
      spawn = true;
      if (!(channel instanceof VoiceChannel)) {
        await interaction.reply(
          "Muỗi chỉ join được vào Voice room thôi! :face_holding_back_tears:"
        );
        return;
      }
      if (!muoi) {
        muoi = new Mosquito(channel, "../assets/sound.mp3");
      }
      createMuoiAndJoin();
      await interaction.reply(`OK! Muỗi sẽ random join vô room ${channel} :eyes:`);
    } else if (subcommand === "off") {
      spawn = false;
      await interaction.reply("OK! Sẽ không sinh ra muỗi nữa :face_holding_back_tears:");
    }
  }
}
