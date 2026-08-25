import { IIntegrationAdapter } from "../interfaces/IIntegrationAdapter";
import { SocialNetworkAdapter } from "./SocialNetworkAdapter";

/**
 * Universal Registry and Lifecycle Manager for Code-Level Integrations & Social Connectors in iNoU.
 */
export class IntegrationRegistry {
  private static instance: IntegrationRegistry;
  private adapters: Map<string, IIntegrationAdapter> = new Map();

  private constructor() {
    this.registerDefaults();
  }

  public static getInstance(): IntegrationRegistry {
    if (!IntegrationRegistry.instance) {
      IntegrationRegistry.instance = new IntegrationRegistry();
    }
    return IntegrationRegistry.instance;
  }

  private registerDefaults(): void {
    // 1. Telegram Bot / Channel
    this.register(
      new SocialNetworkAdapter({
        id: "telegram",
        name: "Telegram Bot",
        credentialEnvVar: "TELEGRAM_BOT_TOKEN",
        defaultChannel: "@inou_feed",
        documentationUrl: "https://core.telegram.org/bots",
      }),
    );

    // 2. Twitter / X Broadcast
    this.register(
      new SocialNetworkAdapter({
        id: "twitter",
        name: "X (Twitter) Feed",
        credentialEnvVar: "TWITTER_BEARER_TOKEN",
        defaultChannel: "main_timeline",
        documentationUrl: "https://developer.x.com",
      }),
    );

    // 3. Discord Webhook & Bot
    this.register(
      new SocialNetworkAdapter({
        id: "discord",
        name: "Discord Server",
        credentialEnvVar: "DISCORD_WEBHOOK_URL",
        defaultChannel: "#general",
        documentationUrl: "https://discord.com/developers/docs/intro",
      }),
    );

    // 4. Slack Workspace
    this.register(
      new SocialNetworkAdapter({
        id: "slack",
        name: "Slack Workspace",
        credentialEnvVar: "SLACK_BOT_TOKEN",
        defaultChannel: "#announcements",
        documentationUrl: "https://api.slack.com",
      }),
    );

    // 5. LinkedIn Professional Network
    this.register(
      new SocialNetworkAdapter({
        id: "linkedin",
        name: "LinkedIn Network",
        credentialEnvVar: "LINKEDIN_ACCESS_TOKEN",
        defaultChannel: "organization_feed",
        documentationUrl: "https://developer.linkedin.com",
      }),
    );
  }

  public register(adapter: IIntegrationAdapter): void {
    this.adapters.set(adapter.id.toLowerCase(), adapter);
  }

  public get(id: string): IIntegrationAdapter | null {
    return this.adapters.get(id.toLowerCase()) || null;
  }

  public getAll(): IIntegrationAdapter[] {
    return Array.from(this.adapters.values());
  }

  public getConfigured(rootDir?: string): IIntegrationAdapter[] {
    return this.getAll().filter((a) => a.isConfigured(rootDir));
  }

  public getByCategory(category: string): IIntegrationAdapter[] {
    return this.getAll().filter((a) => a.category === category);
  }
}

export const integrationRegistry = IntegrationRegistry.getInstance();
