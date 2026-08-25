/**
 * OutputChannelEnum defines the distinct output stream types for iNoU interaction and system responses.
 * Standard Linux streams:
 * - USER_REPLY: User-facing final output / AI response -> stdout (Descriptor 1)
 * - THINKING: Model reasoning & intention decomposition -> stderr (Descriptor 2)
 * - DEBUG: Low-level system introspection & API logs -> stderr (Descriptor 2)
 */
export enum OutputChannelEnum {
  USER_REPLY = 'USER_REPLY',
  THINKING = 'THINKING',
  DEBUG = 'DEBUG',
}
