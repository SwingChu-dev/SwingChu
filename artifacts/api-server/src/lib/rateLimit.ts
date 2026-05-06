/**
 * 단순 IP 기반 일일 rate limiter. 별도 dep 없이 node-cache(이미 사용 중)로 구현.
 * 출시 베타 단계에서 AI API 비용 폭주 방어용 — 정식 유료 tier가 들어가기 전까지의 임시.
 */
import type { Request, Response, NextFunction } from "express";
import NodeCache from "node-cache";

const buckets = new NodeCache({ stdTTL: 24 * 60 * 60, checkperiod: 60 * 60 });

function clientId(req: Request): string {
  // App에서 보낸 안정 디바이스 ID 우선, 없으면 IP. 둘 다 없으면 "unknown".
  const dev = String(req.headers["x-device-id"] ?? "").slice(0, 64);
  if (dev) return `dev:${dev}`;
  const fwd = String(req.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim();
  return `ip:${fwd || req.ip || "unknown"}`;
}

export function rateLimit(label: string, maxPerDay: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const id    = clientId(req);
    const key   = `${label}:${id}`;
    const count = (buckets.get<number>(key) ?? 0) + 1;
    buckets.set(key, count);
    res.setHeader("X-RateLimit-Limit",     String(maxPerDay));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, maxPerDay - count)));
    if (count > maxPerDay) {
      console.warn(`[rate-limit] ${label} exceeded by ${id} (${count}/${maxPerDay})`);
      return res.status(429).json({
        error: "일일 사용량 초과",
        label,
        limit: maxPerDay,
      });
    }
    next();
  };
}
