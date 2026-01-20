// ======================================================================
// @luminnus/lia-runtime - Single Source of Truth para Admin e Client
// ======================================================================

// Contracts
export * from './contracts';

// Utils
export * from './utils';

// Live Service
export * from './live';

// Version/Update Service
export * from './version';

// Memory Policy & Governance
export * from './memory';

// Persona & Personality SSOT
export { getLiaGreeting, LIA_PERSONALITY_V4, LIA_ADMIN_OVERRIDE } from './persona';

// Protocols
export * from './protocols/fileUnderstandingProtocol';

// Capabilities (Execution Router)
export * from './capabilities/capabilityRegistry';
