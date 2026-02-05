// ======================================================================
// @luminnus/lia-runtime - Single Source of Truth para Admin e Client
// ======================================================================

// Contracts
export { ConnectionState } from './contracts/events.contract.js';
export type {
    GeminiLiveEvent,
    GeminiLiveEventType,
    GeminiLiveSession,
    LiaRuntimeConfig,
    UpdateAvailableEvent,
    ToolResult
} from './contracts/events.contract.js';

// Utils
export * from './utils/index.js';

// Live Service
export * from './live/index.js';

// Version/Update Service
export * from './version/index.js';

// Memory Policy & Governance
export * from './memory/index.js';

// Persona & Personality SSOT
export { getLiaGreeting, LIA_PERSONALITY_V4, LIA_ADMIN_OVERRIDE } from './persona.js';

// Protocols
export * from './protocols/fileUnderstandingProtocol.js';

// Capabilities (Execution Router)
export * from './capabilities/capabilityRegistry.js';
