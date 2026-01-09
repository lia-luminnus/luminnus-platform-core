/**
 * Services Index
 * Centralized exports for all services
 */

// Core services
export { GeminiLiveService } from './geminiLiveService';
export { MultimodalService } from './multimodalService';
export { BackendService } from './backendService';
export { getApiKey } from './configService';

// Integration services
export { BackendBridge, backendBridge } from './integrations/backendBridge';
export { SearchService, searchService } from './integrations/searchService';
export { MapsService, mapsService } from './integrations/mapsService';

// Media services
export { VeoService, veoService } from './media/veoService';
export { ImagenService, imagenService } from './media/imagenService';
export { AudioProcessor, audioProcessor } from './media/audioProcessor';

// Types
export type { SearchResult, SearchResponse } from './integrations/searchService';
export type { Location, MapPlace, MapSearchResponse } from './integrations/mapsService';
export type { VeoGenerationRequest, VeoGenerationResponse } from './media/veoService';
export type { ImagenGenerationRequest, ImagenGenerationResponse } from './media/imagenService';
export type { AudioMetrics, WaveformData } from './media/audioProcessor';
