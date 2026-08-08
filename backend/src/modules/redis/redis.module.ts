import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        let isLoggedError = false;

        const client = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          db: parseInt(process.env.REDIS_DB || '0', 10),
          enableOfflineQueue: false, // Gagal cepat jika Redis offline agar DB fallback instan
          maxRetriesPerRequest: null, // Nonaktifkan batas max retries
          retryStrategy: (times: number) => {
            // Coba ulang maksimal 5 kali lalu jeda hingga reconnect dipicu
            if (times > 5) return 5000;
            return Math.min(times * 200, 2000);
          },
          lazyConnect: true,
          enableReadyCheck: false,
        });

        client.on('connect', () => {
          isLoggedError = false;
          console.log('[Redis] Connected successfully');
        });

        client.on('error', (err: Error) => {
          if (!isLoggedError) {
            console.warn('[Redis] Server offline / unreachable (falling back to Database):', err.message);
            isLoggedError = true;
          }
        });

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
