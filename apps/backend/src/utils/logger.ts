// Logger utility
type LogLevel = "debug" | "info" | "warn" | "error";

type LogFn = (message: string, ...args: unknown[]) => void;

type Logger = {
    debug: LogFn;
    info: LogFn;
    warn: LogFn;
    error: LogFn;
};

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const currentLogLevel: LogLevel =
    (process.env.LOG_LEVEL as LogLevel) ?? "info";

const shouldLog = (level: LogLevel): boolean =>
    LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel];

const formatTimestamp = (): string => new Date().toISOString();

const formatMessage = (level: LogLevel, message: string): string =>
    `[${formatTimestamp()}] [${level.toUpperCase()}] ${message}`;

const createLogFn =
    (level: LogLevel, consoleFn: typeof console.log): LogFn =>
        (message: string, ...args: unknown[]) => {
            if (shouldLog(level)) {
                consoleFn(formatMessage(level, message), ...args);
            }
        };

export const logger: Logger = {
    debug: createLogFn("debug", console.debug),
    info: createLogFn("info", console.info),
    warn: createLogFn("warn", console.warn),
    error: createLogFn("error", console.error),
};
