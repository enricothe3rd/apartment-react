import type { NextFunction, Request, Response } from "express";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimit(options: { windowMs: number; max: number }) {
  return (request: Request, response: Response, next: NextFunction) => {
    const key = request.ip ?? "unknown";
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (bucket.count >= options.max) {
      response.status(429).json({ message: "Too many requests. Try again later." });
      return;
    }

    bucket.count += 1;
    next();
  };
}
