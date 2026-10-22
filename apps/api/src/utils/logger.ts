import { getEnv } from '../config/env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level | 'silent', number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

let levelOverride: Level | 'silent' | null = null;

function activeLevel(): Level | 'silent' {
  return levelOverride ?? getEnv().logLevel;
}

function shouldLog(level: Level): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[activeLevel()];
}

function safeStringify(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function write(level: Level, message: string, meta?: unknown): void {
  if (!shouldLog(level)) return;
  const stamp = new Date().toISOString();
  const line = `${stamp} [${level.toUpperCase()}] ${message}`;
  const payload = meta === undefined ? '' : ` ${safeStringify(meta)}`;
  if (level === 'error') {
    console.error(line + payload);
  } else if (level === 'warn') {
    console.warn(line + payload);
  } else {
    console.log(line + payload);
  }
}

export const logger = {
  debug: (message: string, meta?: unknown) => write('debug', message, meta),
  info: (message: string, meta?: unknown) => write('info', message, meta),
  warn: (message: string, meta?: unknown) => write('warn', message, meta),
  error: (message: string, meta?: unknown) => write('error', message, meta),
  setLevel: (level: Level | 'silent' | null) => {
    levelOverride = level;
  },
};
