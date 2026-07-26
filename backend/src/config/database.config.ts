/**
 * Database Configuration
 * 
 * This file contains database connection settings and pool configuration
 * to prevent connection issues during high traffic or frequent refreshes.
 */

export const databaseConfig = {
  // Connection pool settings
  pool: {
    // Maximum number of connections in the pool
    // Increase this if you have many concurrent users
    max: 20,
    
    // Minimum number of connections to maintain
    min: 5,
    
    // Maximum time (in milliseconds) to wait for a connection
    acquireTimeout: 20000, // 20 seconds
    
    // Maximum time (in milliseconds) a connection can be idle before being released
    idleTimeout: 30000, // 30 seconds
    
    // Maximum lifetime of a connection (in milliseconds)
    // Connections will be closed and recreated after this time
    connectionTimeoutMillis: 10000, // 10 seconds
  },
  
  // Retry configuration
  retry: {
    // Maximum number of retry attempts for failed queries
    maxAttempts: 3,
    
    // Initial delay between retries (in milliseconds)
    initialDelay: 1000,
    
    // Maximum delay between retries (in milliseconds)
    maxDelay: 5000,
  },
  
  // Health check configuration
  healthCheck: {
    // Interval for health checks (in milliseconds)
    interval: 30000, // 30 seconds
    
    // Timeout for health check queries (in milliseconds)
    timeout: 5000, // 5 seconds
  },
};

/**
 * Build PostgreSQL connection URL with pool parameters
 */
export function buildDatabaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  
  // Add connection pool parameters to URL
  url.searchParams.set('connection_limit', databaseConfig.pool.max.toString());
  url.searchParams.set('pool_timeout', (databaseConfig.pool.acquireTimeout / 1000).toString());
  url.searchParams.set('connect_timeout', (databaseConfig.pool.connectionTimeoutMillis / 1000).toString());
  
  // Add statement timeout to prevent long-running queries
  url.searchParams.set('statement_timeout', '30000'); // 30 seconds
  
  // Enable connection pooling mode
  url.searchParams.set('pgbouncer', 'true');
  
  return url.toString();
}
