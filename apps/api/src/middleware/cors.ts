import { cors } from "hono/cors";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:8081",
  "https://savoro.app",
  "https://www.savoro.app",
];

export const corsMiddleware = cors({
  origin: (origin) => {
    // Allow mobile apps (no origin header) and listed origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return origin || "*";
    }
    return "";
  },
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  maxAge: 86400,
  credentials: true,
});
