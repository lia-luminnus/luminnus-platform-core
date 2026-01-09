import { Client, Language } from "@googlemaps/google-maps-services-js";
import dotenv from 'dotenv';

dotenv.config();

/**
 * LIA Geospatial Service
 * Powered by Google Maps Platform
 * Usage Attribution: gmp_mcp_codeassist_v0.1_github
 */
class GeospatialService {
    private client: Client;
    private apiKey: string;
    private attributionId: string = "gmp_mcp_codeassist_v0.1_github";

    constructor() {
        this.client = new Client({});
        // v1.1.0: Suporta múltiplos padrões de env encontrados no projeto
        this.apiKey = process.env.GOOGLE_MAPS_API_KEY ||
            process.env.GOOGLE_API_KEY ||
            process.env.GOOGLE_APT_KEY || "";

        if (!this.apiKey) {
            console.warn("⚠️ [GeospatialService] Nenhuma chave de API Google encontrada (.env).");
        }
    }

    /**
     * Converte um endereço em coordenadas (Lat/Lng)
     */
    async geocodeAddress(address: string) {
        if (!this.apiKey) return null;

        try {
            const response = await this.client.geocode({
                params: {
                    address: address,
                    key: this.apiKey,
                },
                headers: {
                    "X-Goog-Maps-Client-Id": this.attributionId // Tentativa de inclusão de atribuição
                }
            });

            if (response.data.results.length > 0) {
                return response.data.results[0].geometry.location;
            }
            return null;
        } catch (error) {
            console.error("❌ [GeospatialService] Erro em geocodeAddress:", error);
            return null;
        }
    }

    /**
     * Calcula distância e tempo entre dois pontos utilizando a Routes API v2 (moderna)
     * Migrado do SDK legacy devido a erro 403 (API desativada no console)
     */
    async calculateRoute(origin: string, destination: string) {
        if (!this.apiKey) return null;

        try {
            // Primeiro, geocodificar os endereços para obter coordenadas
            const originCoords = await this.geocodeAddress(origin);
            const destCoords = await this.geocodeAddress(destination);

            if (!originCoords || !destCoords) {
                console.warn("⚠️ [GeospatialService] Não foi possível geocodificar os endereços");
                return null;
            }

            // Usar a Routes API v2 via REST (mais moderna e ativa)
            const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': this.apiKey,
                    'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.legs.startLocation,routes.legs.endLocation'
                },
                body: JSON.stringify({
                    origin: {
                        location: {
                            latLng: { latitude: originCoords.lat, longitude: originCoords.lng }
                        }
                    },
                    destination: {
                        location: {
                            latLng: { latitude: destCoords.lat, longitude: destCoords.lng }
                        }
                    },
                    travelMode: 'DRIVE',
                    routingPreference: 'TRAFFIC_AWARE',
                    languageCode: 'pt-BR'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("❌ [GeospatialService] Erro na Routes API:", errorData);
                return null;
            }

            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const distanceKm = (route.distanceMeters / 1000).toFixed(1);
                const durationMinutes = Math.round(parseInt(route.duration.replace('s', '')) / 60);

                // v5.2: Gerar link do Google Maps para a rota
                const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;

                return {
                    distance: `${distanceKm} km`,
                    duration: `${durationMinutes} min`,
                    start_address: origin,
                    end_address: destination,
                    mapsUrl: mapsUrl
                };
            }
            return null;
        } catch (error) {
            console.error("❌ [GeospatialService] Erro em calculateRoute:", error);
            return null;
        }
    }

    /**
     * Busca lugares próximos de um tipo específico ou por query
     */
    async findNearbyPlaces(location: { lat: number, lng: number } | string, query: string, radius: number = 2000) {
        if (!this.apiKey) return [];

        try {
            let lat: number | undefined;
            let lng: number | undefined;

            if (typeof location === 'string') {
                const coords = await this.geocodeAddress(location);
                if (coords) {
                    lat = coords.lat;
                    lng = coords.lng;
                }
            } else {
                lat = location.lat;
                lng = location.lng;
            }

            if (lat === undefined || lng === undefined) return [];

            const response = await this.client.placesNearby({
                params: {
                    location: { lat, lng },
                    radius: radius,
                    keyword: query, // Usar keyword para buscas mais genéricas como "farmácias"
                    key: this.apiKey,
                    language: Language.pt_BR
                }
            });

            return response.data.results.map(place => ({
                name: place.name,
                address: place.vicinity,
                rating: place.rating,
                open_now: (place as any).opening_hours?.open_now,
                location: place.geometry?.location
            }));
        } catch (error) {
            console.error("❌ [GeospatialService] Erro em findNearbyPlaces:", error);
            return [];
        }
    }
}

export const geospatialService = new GeospatialService();
