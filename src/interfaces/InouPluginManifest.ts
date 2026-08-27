/**
 * Canonical Plugin Manifest Contract for iNoU Plugins
 * Standard Format: JSON (`inou-plugin.json`)
 */
export interface InouPluginManifestInterface {
  /** Unique plugin identifier (e.g. 'inou-plugin-trello', 'inou-plugin-discord') */
  id: string;
  /** Human-readable plugin name */
  name: string;
  /** Semantic version string (e.g. '1.0.0') */
  version: string;
  /** Detailed plugin description */
  description: string;
  /** Author name or organization */
  author: string;
  /** Optional icon URL or relative asset path */
  icon?: string;
  /** Plugin category (e.g. 'ProjectManagement', 'Social', 'Gaming', 'Humanitarian') */
  category: string;
  /** Security & access permissions required by the plugin */
  permissions: string[];
  /** Relative entrypoint file (e.g. 'dist/index.js') */
  entrypoint: string;
  /** Shell commands and aliases registered by this plugin */
  commands: string[];
  /** Canonical semantic verbs handled by this plugin */
  verbs?: string[];
  /** Required configuration fields (e.g. 'apiKey', 'apiToken', 'webhookUrl') */
  requiredConfig?: string[];
}

export type InouPluginManifest = InouPluginManifestInterface;

