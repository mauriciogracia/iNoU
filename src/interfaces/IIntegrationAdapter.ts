export type IntegrationCategoryType =
  | "social"
  | "webhook"
  | "cloud_storage"
  | "mcp"
  | "llm";

export type IntegrationStatusType =
  | "Connected"
  | "Disconnected"
  | "RateLimited"
  | "Error";

/**
 * Universal code interface for external service and social network adapters.
 */
export interface IIntegrationAdapter {
  readonly id: string;
  readonly name: string;
  readonly category: IntegrationCategoryType;
  readonly status: IntegrationStatusType;
  readonly statusColor: "green" | "orange" | "red";
  readonly targetChannelOrScope?: string;
  readonly defaultEndpoint?: string;
  readonly credentialEnvVar?: string;
  readonly documentationUrl?: string;

  isConfigured(rootDir?: string): boolean;
  publish?(payload: any, rootDir?: string): Promise<any>;
  testConnection?(rootDir?: string): Promise<boolean>;
}
