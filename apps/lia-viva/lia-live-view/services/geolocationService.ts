/**
 * Geolocation Service
 * Captures and manages user's real-time location
 */

export class GeolocationService {
    private currentPosition: GeolocationPosition | null = null;
    private watchId: number | null = null;

    /**
     * Request user's current location
     */
    async getCurrentLocation(): Promise<{ latitude: number; longitude: number; address?: string } | null> {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                console.warn('[Geolocation] Not supported by browser');
                resolve(null);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    this.currentPosition = position;
                    const { latitude, longitude } = position.coords;

                    console.log(`📍 Localização capturada: ${latitude}, ${longitude}`);

                    // Try to get address from reverse geocoding
                    const address = await this.reverseGeocode(latitude, longitude);

                    // Send to backend
                    await this.sendLocationToBackend(latitude, longitude, address);

                    resolve({ latitude, longitude, address: address || undefined });
                },
                (error) => {
                    console.warn('[Geolocation] Error getting location:', error.message);
                    resolve(null);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        });
    }

    /**
     * Start watching user's location for updates
     */
    startWatching(callback?: (location: { latitude: number; longitude: number }) => void) {
        if (!navigator.geolocation) {
            console.warn('[Geolocation] Not supported');
            return;
        }

        if (this.watchId !== null) {
            console.log('[Geolocation] Already watching');
            return;
        }

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentPosition = position;
                const { latitude, longitude } = position.coords;
                console.log(`📍 Localização atualizada: ${latitude}, ${longitude}`);

                if (callback) {
                    callback({ latitude, longitude });
                }
            },
            (error) => {
                console.warn('[Geolocation] Watch error:', error.message);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 60000, // 1 minute
                timeout: 30000
            }
        );

        console.log('[Geolocation] Started watching location');
    }

    /**
     * Stop watching location
     */
    stopWatching() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
            console.log('[Geolocation] Stopped watching location');
        }
    }

    /**
     * Reverse geocode coordinates to address
     */
    private async reverseGeocode(lat: number, lng: number): Promise<string | null> {
        try {
            // Use Nominatim (OpenStreetMap) for reverse geocoding
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'LIA-Assistant/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const address = data.display_name || null;

            console.log(`📬 Endereço obtido: ${address}`);
            return address;
        } catch (error) {
            console.warn('[Geolocation] Reverse geocode failed:', error);
            return null;
        }
    }

    /**
     * Send location to backend
     */
    private async sendLocationToBackend(latitude: number, longitude: number, address: string | null) {
        try {
            const response = await fetch('/api/location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude, longitude, address })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            console.log('✅ Localização enviada para backend');
        } catch (error) {
            console.error('❌ Erro ao enviar localização:', error);
        }
    }

    /**
     * Get last known position
     */
    getLastPosition() {
        return this.currentPosition;
    }
}

// Export singleton instance
export const geolocationService = new GeolocationService();
