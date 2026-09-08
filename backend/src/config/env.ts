import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET ?? "development-secret",
};

export function isAllowedOrigin(origin?: string) {
  if (!origin) {
    return true;
  }

  return (
    origin === env.frontendOrigin ||
    /^http:\/\/localhost:\d+$/.test(origin) ||
    /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
  );
}
