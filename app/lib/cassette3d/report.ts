/**
 * Error reporting for the 3D library (Stage 7). The framework-free code calls
 * reportError(); the Vue side plugs in Sentry (tagged `feature: library3d`)
 * with setErrorReporter. Nothing is sent until a reporter is set.
 */

export type ReportLevel = 'error' | 'warning';

export interface ReportedError {
  message: string;
  level: ReportLevel;
  /** Where it happened, e.g. 'textures', 'start', 'contextLost'. */
  area: string;
}

type Reporter = (error: unknown, area: string, level: ReportLevel, extra?: Record<string, unknown>) => void;

let reporter: Reporter | null = null;
/** The last few reports, for the dev debug hook and the tests. */
const recent: ReportedError[] = [];

export function setErrorReporter(fn: Reporter | null) {
  reporter = fn;
}

export function reportError(error: unknown, area: string, level: ReportLevel = 'error', extra?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  recent.push({ message, level, area });
  if (recent.length > 20) recent.shift();
  try {
    reporter?.(error, area, level, extra);
  } catch {
    // Reporting must never break the scene.
  }
}

export const recentReports = (): ReportedError[] => [...recent];
