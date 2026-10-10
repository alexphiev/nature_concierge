import { isIP } from "node:net";
import robotsParser from "robots-parser";

const BOT_NAME = "GuideNatureLaCiotat-StatusBot";
const MAX_REDIRECTS = 3;
const HOST_SPACING_MS = 1_000;
const ROBOTS_OPTIONS = { timeoutMs: 5_000, maxBytes: 500_000 };

export type FetchOptions = {
  headers?: Record<string, string>;
  timeoutMs: number;
  maxBytes: number;
  etag?: string | null;
  lastModified?: string | null;
};

export type Page = {
  status: number;
  notModified: boolean;
  body: string;
  etag: string | null;
  lastModified: string | null;
};

export type Fetcher = (url: string, options: FetchOptions) => Promise<Page>;

export class HttpError extends Error {
  constructor(public status: number) {
    super(`http ${status}`);
  }
}

export class RobotsDisallowError extends Error {
  constructor() {
    super("robots.txt disallow");
  }
}

function userAgent(): string {
  const contact = process.env.BOT_CONTACT_URL;
  return contact ? `${BOT_NAME}/1.0 (+${contact})` : `${BOT_NAME}/1.0`;
}

function isPrivateIp(host: string): boolean {
  if (isIP(host) === 4) {
    const [a, b] = host.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  const v6 = host.toLowerCase();
  return v6 === "::" || v6 === "::1" || /^(f[cd]|fe[89ab]|::ffff:)/.test(v6);
}

export function assertSafeUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`unsafe url: protocol ${url.protocol}`);
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || (isIP(host) !== 0 && isPrivateIp(host))) {
    throw new Error(`unsafe url: host ${host}`);
  }
  return url;
}

async function readCapped(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value.subarray(0, maxBytes - size));
    size += value.byteLength;
  }
  await reader.cancel().catch(() => {});

  const charset = /charset=["']?([\w-]+)/i.exec(response.headers.get("content-type") ?? "")?.[1];
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(charset ?? "utf-8");
  } catch {
    decoder = new TextDecoder();
  }
  return decoder.decode(Buffer.concat(chunks));
}

export async function fetchPage(rawUrl: string, options: FetchOptions): Promise<Page> {
  const headers: Record<string, string> = { ...options.headers, "User-Agent": userAgent() };
  if (options.etag) headers["If-None-Match"] = options.etag;
  if (options.lastModified) headers["If-Modified-Since"] = options.lastModified;
  const signal = AbortSignal.timeout(options.timeoutMs);

  let url = assertSafeUrl(rawUrl);
  for (let hop = 0; ; hop++) {
    const response = await fetch(url, { headers, signal, redirect: "manual" });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && response.status !== 304 && location) {
      await response.body?.cancel().catch(() => {});
      if (hop === MAX_REDIRECTS) throw new Error("too many redirects");
      url = assertSafeUrl(new URL(location, url).href);
      continue;
    }
    if (response.status === 304) {
      return { status: 304, notModified: true, body: "", etag: null, lastModified: null };
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new HttpError(response.status);
    }
    return {
      status: response.status,
      notModified: false,
      body: await readCapped(response, options.maxBytes),
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
    };
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// One fetcher per run: it holds the robots.txt cache and the per-host queue
// (one request in flight per hostname, 1 s apart).
export function createFetcher(): Fetcher {
  const hostTails = new Map<string, Promise<unknown>>();
  const robots = new Map<string, Promise<ReturnType<typeof robotsParser> | null>>();

  function gated<T>(host: string, task: () => Promise<T>): Promise<T> {
    const run = (hostTails.get(host) ?? Promise.resolve()).then(task);
    hostTails.set(
      host,
      run.then(
        () => sleep(HOST_SPACING_MS),
        () => sleep(HOST_SPACING_MS),
      ),
    );
    return run;
  }

  function robotsFor(url: URL) {
    let entry = robots.get(url.origin);
    if (!entry) {
      const robotsUrl = `${url.origin}/robots.txt`;
      // A missing or unreadable robots.txt allows everything.
      entry = gated(url.host, () => fetchPage(robotsUrl, ROBOTS_OPTIONS)).then(
        (page) => robotsParser(robotsUrl, page.body),
        () => null,
      );
      robots.set(url.origin, entry);
    }
    return entry;
  }

  return async (rawUrl, options) => {
    const url = assertSafeUrl(rawUrl);
    const rules = await robotsFor(url);
    if (rules?.isAllowed(url.href, BOT_NAME) === false) throw new RobotsDisallowError();
    return gated(url.host, () => fetchPage(url.href, options));
  };
}
