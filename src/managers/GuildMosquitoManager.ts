import { Guild, VoiceChannel } from "discord.js";
import { getVoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { MosquitoInstance, SlapResultType } from "./MosquitoInstance.ts";
import type { MosquitoConfig, SlapResult } from "./MosquitoInstance.ts";
import { Logger } from "../utils/logger.ts";

export class GuildMosquitoManager {
  private static instance: GuildMosquitoManager;
  private instances = new Map<string, MosquitoInstance>();

  private constructor() {}

  public static getInstance(): GuildMosquitoManager {
    if (!GuildMosquitoManager.instance) {
      GuildMosquitoManager.instance = new GuildMosquitoManager();
    }
    return GuildMosquitoManager.instance;
  }

  public get(guildId: string): MosquitoInstance | undefined {
    return this.instances.get(guildId);
  }

  public registerAndStart(guild: Guild, targetChannel?: VoiceChannel, config?: Partial<MosquitoConfig>): MosquitoInstance {
    const guildId = guild.id;
    let mosquito = this.instances.get(guildId);

    if (mosquito) {
      Logger.info("Re-configuring existing mosquito instance for guild...", guildId);
      mosquito.stop();
      mosquito.updateTarget(guild, targetChannel);
    } else {
      mosquito = new MosquitoInstance(guild, targetChannel, config);
      this.instances.set(guildId, mosquito);
    }

    mosquito.start();
    return mosquito;
  }

  public async registerAndSpawnNow(
    guild: Guild,
    channel?: VoiceChannel,
    config?: Partial<MosquitoConfig>
  ): Promise<{ success: boolean; channel?: VoiceChannel }> {
    const guildId = guild.id;
    let mosquito = this.instances.get(guildId);

    if (mosquito) {
      mosquito.stop();
      mosquito.updateTarget(guild, channel);
    } else {
      mosquito = new MosquitoInstance(guild, channel, config);
      this.instances.set(guildId, mosquito);
    }

    const target = channel || mosquito.pickTargetChannel();
    if (!target) {
      return { success: false };
    }

    const connected = await mosquito.spawnNow(target);
    return { success: connected, channel: target };
  }

  public stop(guildId: string): boolean {
    const mosquito = this.instances.get(guildId);
    if (mosquito) {
      mosquito.stop();
      return true;
    }
    return false;
  }

  public slap(guildId: string, authorDisplayName: string, memberVoiceChannelId?: string | null): SlapResult {
    const mosquito = this.instances.get(guildId);
    const existing = getVoiceConnection(guildId);

    if (mosquito) {
      return mosquito.slap(authorDisplayName, memberVoiceChannelId);
    } else if (existing) {
      existing.destroy();
      return { type: SlapResultType.SUCCESS };
    }
    return { type: SlapResultType.NOT_CONNECTED };
  }

  public isConnected(guildId: string): boolean {
    const mosquito = this.instances.get(guildId);
    const existing = getVoiceConnection(guildId);
    return Boolean(
      (mosquito && (mosquito.isVoiceConnected || mosquito.connection)) ||
      (existing && existing.state.status !== VoiceConnectionStatus.Destroyed)
    );
  }

  public getCurrentVoiceChannelId(guildId: string): string | undefined {
    const mosquito = this.instances.get(guildId);
    return mosquito?.getCurrentVoiceChannelId();
  }
}
