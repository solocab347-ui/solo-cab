/**
 * Helper to push critical security events to Sentry with consistent tagging.
 * Falls back to console.warn if Sentry is not initialized.
 */

import * as Sentry from '@sentry/react';

export type SecurityEventName =
  | 'auth.brute_force'
  | 'auth.suspicious_login'
  | 'payment.fraud_attempt'
  | 'payment.duplicate_charge'
  | 'gps.spoof_detected'
  | 'admin.role_change'
  | 'admin.sensitive_action'
  | 'rate_limit.tripped'
  | 'webhook.signature_invalid'
  | 'realtime.unauthorized_access';

export function reportSecurityEvent(
  name: SecurityEventName,
  data: Record<string, unknown> = {},
  severity: 'info' | 'warning' | 'error' | 'fatal' = 'warning',
) {
  try {
    Sentry.withScope((scope) => {
      scope.setTag('security_event', name);
      scope.setTag('security_severity', severity);
      scope.setLevel(severity);
      scope.setContext('security', data);
      Sentry.captureMessage(`[security] ${name}`);
    });
  } catch {
    // eslint-disable-next-line no-console
    console.warn('[security]', name, data);
  }
}
