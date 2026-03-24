import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { isAvailable as kisAvailable } from "../lib/kisProvider";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/api/kis-status", (_req, res) => {
  res.json({
    kisEnabled:  kisAvailable(),
    message:     kisAvailable()
      ? "한국투자증권 API 활성화됨 — 실시간 시세 사용 중"
      : "APP_KEY / APP_SECRET 미설정 — Yahoo Finance 폴백 모드",
    dataSource:  kisAvailable() ? "KIS (실시간)" : "Yahoo Finance (15분 지연)",
  });
});

export default router;
