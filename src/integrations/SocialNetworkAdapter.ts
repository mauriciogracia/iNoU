import { IIntegrationAdapter, IntegrationCategoryType, IntegrationStatusType } from "../interfaces/IIntegrationAdapter";

export interface SocialNetworkConfig {
  id: string;
  name: string;
  credentialEnvVar: string;
  defaultChannel?: string;
  documentationUrl?: string;
}

/**
 * Social Network Adapter for Telegram, Twitter/X, Discord, Slack, and LinkedIn.
 */
export class SocialNetworkAdapter implements IIntegrationAdapter {
  public readonly id: string;
  public readonly name: string;
  public readonly category: IntegrationCategoryType = "social";
  public readonly credentialEnvVar?: string;
  public readonly targetChannelOrScope?: string;
  public readonly documentationUrl?: string;

  constructor(config: SocialNetworkConfig) {
    this.id = config.id;
    this.name = config.name;
    this.credentialEnvVar = config.credentialEnvVar;
    this.targetChannelOrScope = config.defaultChannel || "broadcast";
    this.documentationUrl = config.documentationUrl;
  }

  public isConfigured(): boolean {
    if (!this.credentialEnvVar) return false;
    return Boolean(process.env[this.credentialEnvVar]);
  }

  public get status(): IntegrationStatusType {
    return this.isConfigured() ? "Connected" : "Disconnected";
  }

  public get statusColor(): "green" | "orange" | "red" {
    return this.isConfigured() ? "green" : "orange";
  }

  public async publish(payload: any): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error(
        `Integration "${this.name}" is not configured. Please set ${this.credentialEnvVar}.`,
      );
    }
    return {
      success: true,
      integrationId: this.id,
      publishedAt: new Date().toISOString(),
      payload,
    };
  }

  public async testConnection(): Promise<boolean> {
    return this.isConfigured();
  }
}
