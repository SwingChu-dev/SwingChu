import { Router } from "express";
import NodeCache from "node-cache";
import {
  fetchKisBalance,
  isBalanceAvailable,
  type KisBalanceSummary,
} from "../lib/kisProvider";

const router = Router();
const cache  = new NodeCache({ stdTTL: 60 }); // 1분 캐시

// GET /api/kis/balance
router.get("/api/kis/balance", async (_req, res) => {
  if (!isBalanceAvailable()) {
    return res.json({
      available: false,
      message:   "CANO 환경변수가 설정되지 않았습니다. Secrets에 추가해 주세요.",
    });
  }

  const cached = cache.get<KisBalanceSummary>("balance");
  if (cached) return res.json({ available: true, data: cached });

  const result = await fetchKisBalance();
  if (!result) {
    return res.status(502).json({
      available: true,
      error:     "한국투자증권 API 호출 실패. 잠시 후 다시 시도해 주세요.",
    });
  }

  cache.set("balance", result);
  return res.json({ available: true, data: result });
});

export default router;
