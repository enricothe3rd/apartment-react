import { createHash, randomBytes } from "node:crypto";

export function createRefreshToken() {
  return randomBytes(48).toString("hex");
}

export function hashRefreshToken(refreshToken: string) {
  return createHash("sha256").update(refreshToken).digest("hex");
}
