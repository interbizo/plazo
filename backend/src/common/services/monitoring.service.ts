/**
 * Production Monitoring Service
 * 
 * Centralized monitoring and alerting for production environment
 */

import { Injectable, Logger } from '@nestjs/common';

export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface MetricData {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  // In-memory metrics (use Redis in production for distributed systems)
  private metrics = new Map<string, MetricData[]>();

  /**
   * Record a metric
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    const metric: MetricData = {
      name,
      value,
      timestamp: new Date(),
      tags,
    };

    // Store in memory
    const existing = this.metrics.get(name) || [];
    existing.push(metric);
    
    // Keep only last 1000 entries per metric
    if (existing.length > 1000) {
      existing.shift();
    }
    
    this.metrics.set(name, existing);

    // Send to monitoring service in production
    if (this.isProduction) {
      this.sendToMonitoring(metric);
    }
  }

  /**
   * Send alert
   */
  alert(message: string, level: AlertLevel = AlertLevel.ERROR, context?: any) {
    this.logger.log(`[${level.toUpperCase()}] ${message}`, context);

    if (!this.isProduction) {
      return;
    }

    // Send to Sentry
    if (process.env.SENTRY_DSN) {
      // TODO: Implement Sentry integration
      // if (level === AlertLevel.CRITICAL || level === AlertLevel.ERROR) {
      //   Sentry.captureException(new Error(message), {
      //     level: level as any,
      //     extra: context,
      //   });
      // } else {
      //   Sentry.captureMessage(message, level as any);
      // }
    }

    // Send to Slack/Discord webhook for critical alerts
    if (level === AlertLevel.CRITICAL && process.env.ALERT_WEBHOOK_URL) {
      this.sendWebhookAlert(message, context);
    }
  }

  /**
   * Track database query performance
   */
  trackQuery(query: string, duration: number, success: boolean) {
    this.recordMetric('database.query.duration', duration, {
      success: success.toString(),
    });

    // Alert on slow queries
    if (duration > 5000) {
      this.alert(
        `Slow query detected: ${duration}ms`,
        AlertLevel.WARNING,
        { query: query.substring(0, 200) },
      );
    }

    // Alert on failed queries
    if (!success) {
      this.recordMetric('database.query.errors', 1);
    }
  }

  /**
   * Track API endpoint performance
   */
  trackEndpoint(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
  ) {
    this.recordMetric('api.request.duration', duration, {
      method,
      path,
      status: statusCode.toString(),
    });

    // Alert on slow endpoints
    if (duration > 3000) {
      this.alert(
        `Slow endpoint: ${method} ${path} took ${duration}ms`,
        AlertLevel.WARNING,
      );
    }

    // Track error rates
    if (statusCode >= 500) {
      this.recordMetric('api.errors.5xx', 1, { method, path });
    } else if (statusCode >= 400) {
      this.recordMetric('api.errors.4xx', 1, { method, path });
    }
  }

  /**
   * Track authentication events
   */
  trackAuth(event: 'login' | 'logout' | 'failed_login' | 'token_refresh', userId?: string) {
    this.recordMetric(`auth.${event}`, 1, userId ? { userId } : undefined);

    // Alert on suspicious auth activity
    if (event === 'failed_login') {
      const recentFailures = this.getMetricCount('auth.failed_login', 5 * 60 * 1000); // Last 5 minutes
      
      if (recentFailures > 10) {
        this.alert(
          `High number of failed login attempts: ${recentFailures} in last 5 minutes`,
          AlertLevel.WARNING,
        );
      }
    }
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: Record<string, any>;
  } {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    // Check error rates
    const errorRate5xx = this.getMetricCount('api.errors.5xx', 5 * 60 * 1000);
    const totalRequests = this.getMetricCount('api.request.duration', 5 * 60 * 1000);
    const errorPercentage = totalRequests > 0 ? (errorRate5xx / totalRequests) * 100 : 0;

    // Check average response time
    const avgResponseTime = this.getMetricAverage('api.request.duration', 5 * 60 * 1000);

    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (errorPercentage > 10 || avgResponseTime > 5000) {
      status = 'unhealthy';
    } else if (errorPercentage > 5 || avgResponseTime > 3000) {
      status = 'degraded';
    }

    return {
      status,
      metrics: {
        errorRate5xx,
        totalRequests,
        errorPercentage: errorPercentage.toFixed(2),
        avgResponseTime: avgResponseTime.toFixed(2),
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Get metric count in time window
   */
  private getMetricCount(name: string, timeWindowMs: number): number {
    const metrics = this.metrics.get(name) || [];
    const cutoff = Date.now() - timeWindowMs;
    
    return metrics.filter(m => m.timestamp.getTime() > cutoff).length;
  }

  /**
   * Get metric average in time window
   */
  private getMetricAverage(name: string, timeWindowMs: number): number {
    const metrics = this.metrics.get(name) || [];
    const cutoff = Date.now() - timeWindowMs;
    
    const recentMetrics = metrics.filter(m => m.timestamp.getTime() > cutoff);
    
    if (recentMetrics.length === 0) {
      return 0;
    }
    
    const sum = recentMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / recentMetrics.length;
  }

  /**
   * Send metric to external monitoring service
   */
  private sendToMonitoring(metric: MetricData) {
    // TODO: Implement integration with monitoring service
    // Examples:
    // - DataDog: dogstatsd.gauge(metric.name, metric.value, metric.tags)
    // - Prometheus: prometheusClient.gauge(metric.name).set(metric.value)
    // - CloudWatch: cloudwatch.putMetricData(...)
  }

  /**
   * Send webhook alert (Slack, Discord, etc)
   */
  private async sendWebhookAlert(message: string, context?: any) {
    try {
      const webhookUrl = process.env.ALERT_WEBHOOK_URL;
      if (!webhookUrl) return;

      const payload = {
        text: `🚨 CRITICAL ALERT: ${message}`,
        attachments: context ? [
          {
            color: 'danger',
            fields: Object.entries(context).map(([key, value]) => ({
              title: key,
              value: JSON.stringify(value),
              short: true,
            })),
          },
        ] : [],
      };

      // Use fetch or axios to send webhook
      // await fetch(webhookUrl, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });
    } catch (error) {
      this.logger.error('Failed to send webhook alert:', error);
    }
  }
}
