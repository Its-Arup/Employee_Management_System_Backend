import { logger } from '../util';
import { ENV } from '../constant';

/**
 * Keep-alive service to prevent Render free tier from spinning down
 * This service pings the health endpoint periodically to keep the service active
 */
export class KeepAliveService {
    private intervalId: NodeJS.Timeout | null = null;
    private readonly pingIntervalMs = 14 * 60 * 1000; // 14 minutes (Render free tier spins down after 15 minutes)
    private readonly serviceUrl: string;

    constructor() {
        // Determine service URL - use Render URL in production, localhost in development
        if (ENV.ENVIORNMENT === 'production' && process.env.RENDER_EXTERNAL_URL) {
            this.serviceUrl = process.env.RENDER_EXTERNAL_URL;
        } else if (ENV.ENVIORNMENT === 'production' && process.env.RENDER_INTERNAL_URL) {
            this.serviceUrl = process.env.RENDER_INTERNAL_URL;
        } else {
            // In development or if Render URLs not available, don't enable keep-alive
            this.serviceUrl = '';
        }
    }

    /**
     * Start the keep-alive service
     */
    start(): void {
        // Only start keep-alive in production on Render
        if (!this.serviceUrl || ENV.ENVIORNMENT !== 'production') {
            logger.info('Keep-alive service disabled (not running on Render production)');
            return;
        }

        if (this.intervalId) {
            logger.warn('Keep-alive service is already running');
            return;
        }

        logger.info('Starting keep-alive service', { 
            meta: { 
                interval: `${this.pingIntervalMs / 60000} minutes`,
                serviceUrl: this.serviceUrl 
            } 
        });

        // Ping immediately on start
        this.ping();

        // Set up periodic pings
        this.intervalId = setInterval(() => {
            this.ping();
        }, this.pingIntervalMs);
    }

    /**
     * Stop the keep-alive service
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            logger.info('Keep-alive service stopped');
        }
    }

    /**
     * Ping the health endpoint
     */
    private async ping(): Promise<void> {
        try {
            const url = `${this.serviceUrl}/api/health`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'KeepAlive-Service'
                },
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            if (response.ok) {
                logger.info('Keep-alive ping successful', { 
                    meta: { 
                        status: response.status,
                        statusText: response.statusText 
                    } 
                });
            } else {
                logger.warn('Keep-alive ping returned non-OK status', { 
                    meta: { 
                        status: response.status,
                        statusText: response.statusText 
                    } 
                });
            }
        } catch (error) {
            logger.error('Keep-alive ping failed', { 
                meta: { 
                    error,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                } 
            });
        }
    }
}

export const keepAliveService = new KeepAliveService();
