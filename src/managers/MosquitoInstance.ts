import type { DiscordGatewayAdapterCreator } from "@discordjs/voice";
import { VoiceChannel } from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  VoiceConnection,
  AudioPlayer,
  getVoiceConnection,
  entersState,
  NoSubscriberBehavior,
} from "@discordjs/voice";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { Logger } from "../utils/logger.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MosquitoConfig {
  minMinutes: number;
  maxMinutes: number;
  soundPath: string;
}

export class MosquitoInstance {
  public guildId: string;
  public channel: VoiceChannel;
  public soundPath: string;
  public isEnabled = false;
  public isVoiceConnected = false;

  public connection: VoiceConnection | undefined;
  private player: AudioPlayer | undefined;
  private timer: NodeJS.Timeout | undefined;
  private minMinutes: number;
  private maxMinutes: number;

  constructor(channel: VoiceChannel, config: Partial<MosquitoConfig> = {}) {
    this.guildId = channel.guild.id;
    this.channel = channel;
    this.minMinutes = config.minMinutes ?? 1;
    this.maxMinutes = config.maxMinutes ?? 15;
    this.soundPath = config.soundPath ?? path.resolve(__dirname, "../assets/sound.mp3");
  }

  public updateChannel(channel: VoiceChannel) {
    this.channel = channel;
  }

  public start() {
    this.isEnabled = true;
    Logger.info("Mosquito service started.", this.guildId);
    this.scheduleNextSpawn();
  }

  public async spawnNow() {
    this.isEnabled = true;
    this.clearSpawnTimer();
    Logger.info("Forcing mosquito to spawn immediately (spawn-now).", this.guildId);
    await this.connect();
  }

  public stop() {
    this.isEnabled = false;
    this.clearSpawnTimer();
    this.disconnect();
    Logger.info("Mosquito service stopped and disconnected.", this.guildId);
  }

  public slap(slappedBy: string): boolean {
    const existing = getVoiceConnection(this.guildId);
    if (!this.isVoiceConnected && !this.connection && !existing) {
      return false;
    }

    Logger.info(`Mosquito slapped by ${slappedBy}`, this.guildId);
    this.disconnect();

    if (this.isEnabled) {
      this.scheduleNextSpawn();
    }
    return true;
  }

  private clearSpawnTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private getRandomIntervalMinutes(): number {
    return Math.floor(Math.random() * (this.maxMinutes - this.minMinutes)) + this.minMinutes;
  }

  private scheduleNextSpawn() {
    this.clearSpawnTimer();
    if (!this.isEnabled) return;

    const delayMinutes = this.getRandomIntervalMinutes();
    Logger.info(`Next spawn scheduled in ${delayMinutes} minute(s).`, this.guildId);

    this.timer = setTimeout(async () => {
      if (!this.isEnabled) return;

      if (this.hasActiveUsers()) {
        await this.connect();
      } else {
        Logger.info("Voice channel is empty. Rescheduling spawn...", this.guildId);
        this.scheduleNextSpawn();
      }
    }, delayMinutes * 60 * 1000);
  }

  public hasActiveUsers(): boolean {
    const nonBotMembers = this.channel.members.filter((m) => !m.user.bot);
    return nonBotMembers.size > 0;
  }

  public async connect() {
    try {
      this.connection = getVoiceConnection(this.guildId);

      if (!this.connection) {
        Logger.info(`Connecting to voice channel: ${this.channel.name} (${this.channel.id})`, this.guildId);
        this.connection = joinVoiceChannel({
          channelId: this.channel.id,
          guildId: this.guildId,
          adapterCreator: this.channel.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
          selfDeaf: false,
          selfMute: false,
        });
      }

      // Đánh dấu muỗi đã vào phòng thoại
      this.isVoiceConnected = true;

      if (!this.player) {
        this.player = createAudioPlayer({
          behaviors: {
            noSubscriber: NoSubscriberBehavior.Play,
          },
        });

        this.player.on(AudioPlayerStatus.Playing, () => {
          Logger.info("Playing mosquito sound (AudioPlayer Playing).", this.guildId);
        });

        this.player.on(AudioPlayerStatus.Idle, () => {
          if (this.isVoiceConnected && this.isEnabled) {
            this.playAudio();
          }
        });

        this.player.on("error", (error) => {
          Logger.error(`AudioPlayer error: ${error.message}`, error, this.guildId);
        });
      }

      this.connection.subscribe(this.player);

      // Nếu đã Ready thì phát nhạc ngay, nếu chưa thì đợi và phát
      if (this.connection.state.status === VoiceConnectionStatus.Ready) {
        this.playAudio();
      } else {
        entersState(this.connection, VoiceConnectionStatus.Ready, 20_000)
          .then(() => {
            this.playAudio();
          })
          .catch((err) => {
            Logger.warn("Voice did not reach Ready state quickly, attempting playback anyway:", this.guildId);
            this.playAudio();
          });
      }
    } catch (error) {
      Logger.error("Failed to connect or play audio", error, this.guildId);
      this.disconnect();
    }
  }

  private playAudio() {
    try {
      if (!this.player) {
        Logger.warn("Cannot play audio: player is undefined", this.guildId);
        return;
      }
      Logger.info(`Creating audio resource from ${this.soundPath}`, this.guildId);
      const resource = createAudioResource(this.soundPath, {
        inlineVolume: true,
      });
      resource.volume?.setVolume(1.0);
      this.player.play(resource);
    } catch (err) {
      Logger.error("Error creating audio resource", err, this.guildId);
    }
  }

  public handleDisconnect() {
    this.isVoiceConnected = false;
    if (this.player) {
      this.player.stop();
      this.player = undefined;
    }
    this.connection = undefined;
  }

  public disconnect() {
    this.handleDisconnect();
    const existing = getVoiceConnection(this.guildId);
    if (existing) {
      try {
        existing.destroy();
      } catch (e) {
        Logger.error("Error destroying voice connection", e, this.guildId);
      }
    }
  }
}
