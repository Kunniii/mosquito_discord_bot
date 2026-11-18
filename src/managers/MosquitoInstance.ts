import type { DiscordGatewayAdapterCreator } from "@discordjs/voice";
import { Guild, VoiceChannel } from "discord.js";
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

export const SlapResultType = {
  SUCCESS: "SUCCESS",
  WRONG_ROOM: "WRONG_ROOM",
  NOT_CONNECTED: "NOT_CONNECTED",
} as const;

export type SlapResultType = (typeof SlapResultType)[keyof typeof SlapResultType];

export interface SlapResult {
  type: SlapResultType;
  currentChannelId?: string;
}

export class MosquitoInstance {
  public guild: Guild;
  public guildId: string;
  public targetChannel: VoiceChannel | undefined;
  public currentChannel: VoiceChannel | undefined;
  public soundPath: string;
  public isEnabled = false;
  public isVoiceConnected = false;

  public connection: VoiceConnection | undefined;
  private player: AudioPlayer | undefined;
  private timer: NodeJS.Timeout | undefined;
  private minMinutes: number;
  private maxMinutes: number;

  constructor(guild: Guild, targetChannel?: VoiceChannel, config: Partial<MosquitoConfig> = {}) {
    this.guild = guild;
    this.guildId = guild.id;
    this.targetChannel = targetChannel;
    this.minMinutes = config.minMinutes ?? 1;
    this.maxMinutes = config.maxMinutes ?? 15;
    this.soundPath = config.soundPath ?? path.resolve(__dirname, "../assets/sound.mp3");
  }

  public updateTarget(guild: Guild, targetChannel?: VoiceChannel) {
    this.guild = guild;
    this.targetChannel = targetChannel;
  }

  public getActiveVoiceChannels(): VoiceChannel[] {
    const channels: VoiceChannel[] = [];
    for (const ch of this.guild.channels.cache.values()) {
      if (ch instanceof VoiceChannel) {
        const humanCount = ch.members.filter((m) => !m.user.bot).size;
        if (humanCount > 0 && ch.joinable) {
          channels.push(ch);
        }
      }
    }
    return channels;
  }

  public pickTargetChannel(): VoiceChannel | undefined {
    if (this.targetChannel) {
      const humanCount = this.targetChannel.members.filter((m) => !m.user.bot).size;
      if (humanCount > 0 && this.targetChannel.joinable) {
        return this.targetChannel;
      }
      return undefined;
    }

    const active = this.getActiveVoiceChannels();
    if (active.length === 0) return undefined;
    const randomIndex = Math.floor(Math.random() * active.length);
    return active[randomIndex];
  }

  public start() {
    this.isEnabled = true;
    Logger.info("Mosquito service started.", this.guildId);
    this.scheduleNextSpawn();
  }

  public async spawnNow(channel?: VoiceChannel): Promise<boolean> {
    this.isEnabled = true;
    this.clearSpawnTimer();
    Logger.info("Forcing mosquito to spawn immediately (spawn-now).", this.guildId);
    return await this.connect(channel);
  }

  public stop() {
    this.isEnabled = false;
    this.clearSpawnTimer();
    this.disconnect();
    Logger.info("Mosquito service stopped and disconnected.", this.guildId);
  }

  public getCurrentVoiceChannelId(): string | undefined {
    return this.currentChannel?.id || this.connection?.joinConfig?.channelId || undefined;
  }

  public slap(slappedBy: string, memberVoiceChannelId?: string | null): SlapResult {
    const existing = getVoiceConnection(this.guildId);
    const currentChannelId = this.getCurrentVoiceChannelId();

    if (!this.isVoiceConnected && !this.connection && !existing) {
      return { type: SlapResultType.NOT_CONNECTED };
    }

    if (!memberVoiceChannelId || memberVoiceChannelId !== currentChannelId) {
      Logger.info(
        `Slap by ${slappedBy} rejected: user is in ${memberVoiceChannelId}, mosquito is in ${currentChannelId}`,
        this.guildId
      );
      return {
        type: SlapResultType.WRONG_ROOM,
        currentChannelId,
      };
    }

    Logger.info(`Mosquito slapped by ${slappedBy} in room ${currentChannelId}`, this.guildId);
    this.disconnect();

    if (this.isEnabled) {
      this.scheduleNextSpawn();
    }
    return {
      type: SlapResultType.SUCCESS,
      currentChannelId,
    };
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

  public scheduleNextSpawn() {
    this.clearSpawnTimer();
    if (!this.isEnabled) return;

    const delayMinutes = this.getRandomIntervalMinutes();
    Logger.info(`Next spawn scheduled in ${delayMinutes} minute(s).`, this.guildId);

    this.timer = setTimeout(async () => {
      if (!this.isEnabled) return;

      const target = this.pickTargetChannel();
      if (target) {
        await this.connect(target);
      } else {
        Logger.info("No active voice channels with users. Rescheduling spawn...", this.guildId);
        this.scheduleNextSpawn();
      }
    }, delayMinutes * 60 * 1000);
  }

  public async connect(target?: VoiceChannel): Promise<boolean> {
    try {
      const channelToJoin = target || this.pickTargetChannel();
      if (!channelToJoin) {
        Logger.info("Cannot connect: no eligible voice channel found with users", this.guildId);
        return false;
      }

      this.currentChannel = channelToJoin;
      this.connection = getVoiceConnection(this.guildId);

      if (!this.connection || this.connection.joinConfig.channelId !== channelToJoin.id) {
        Logger.info(`Connecting to voice channel: ${channelToJoin.name} (${channelToJoin.id})`, this.guildId);
        this.connection = joinVoiceChannel({
          channelId: channelToJoin.id,
          guildId: this.guildId,
          adapterCreator: this.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
          selfDeaf: false,
          selfMute: false,
        });
      }

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

      return true;
    } catch (error) {
      Logger.error("Failed to connect or play audio", error, this.guildId);
      this.disconnect();
      return false;
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
    this.currentChannel = undefined;
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
