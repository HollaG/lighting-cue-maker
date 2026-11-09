export const LogLevel = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/** Lowest level that is printed. Debug logs only show in development. */
const MIN_LEVEL: LogLevel = import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO;

/**
 * console wrapper that prefixes every message with a label, e.g. `[EventSetup] Saved step 1`.
 *
 * ```ts
 * const log = new Logger("EventSetup");
 * log.info("Saved step", 1);
 * const fixturesLog = log.child("Fixtures"); // [EventSetup:Fixtures]
 * ```
 */
export class Logger {
  readonly label: string;

  constructor(label: string) {
    this.label = label;
  }

  /** A logger whose label is nested under this one: `parent:child`. */
  child(label: string): Logger {
    return new Logger(`${this.label}:${label}`);
  }

  debug(...args: unknown[]) {
    this.log(LogLevel.DEBUG, ...args);
  }

  info(...args: unknown[]) {
    this.log(LogLevel.INFO, ...args);
  }

  warn(...args: unknown[]) {
    this.log(LogLevel.WARN, ...args);
  }

  error(...args: unknown[]) {
    this.log(LogLevel.ERROR, ...args);
  }

  private log(level: LogLevel, ...args: unknown[]) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;
    // Pass args through untouched so objects stay expandable in devtools.
    console[level](`[${this.label}]`, ...args);
  }
}
