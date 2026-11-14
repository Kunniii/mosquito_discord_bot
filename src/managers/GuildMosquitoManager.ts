import { VoiceChannel } from "discord.js";
import { MosquitoInstance } from "./MosquitoInstance.ts";
import type { MosquitoConfig } from "./MosquitoInstance.ts";
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

  public registerAndStart(channel: VoiceChannel, config?: Partial<MosquitoConfig>): MosquitoInstance {
    const guildId = channel.guild.id;
    let mosquito = this.instances.get(guildId);

    if (mosquito) {
      Logger.info("Re-configuring existing mosquito instance for new channel...", guildId);
      mosquito.stop();
      mosquito.updateChannel(channel);
    } else {
      mosquito = new MosquitoInstance(channel, config);
      this.instances.set(guildId, mosquito);
    }

    mosquito.start();
    return mosquito;
  }

  public async registerAndSpawnNow(channel: VoiceChannel, config?: Partial<MosquitoConfig>): Promise<MosquitoInstance> {
    const guildId = channel.guild.id;
    let mosquito = this.instances.get(guildId);

    if (mosquito) {
      mosquito.stop();
      mosquito.updateChannel(channel);
    } else {
      mosquito = new MosquitoInstance(channel, config);
      this.instances.set(guildId, mosquito);
    }

    await mosquito.spawnNow();
    return mosquito;
  }

  public stop(guildId: string): boolean {
    const mosquito = this.instances.get(guildId);
    if (mosquito) {
      mosquito.stop();
      return true;
    }
    return false;
  }

  public slap(guildId: string, authorDisplayName: string): boolean {
    const mosquito = this.instances.get(guildId);
    if (mosquito && mosquito.isVoiceConnected) {
      return mosquito.slap(authorDisplayName);
    }
    return false;
  }

  public isConnected(guildId: string): boolean {
    const mosquito = this.instances.get(guildId);
    return Boolean(mosquito && mosquito.isVoiceConnected);
  }
}
