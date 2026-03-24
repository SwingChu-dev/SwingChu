import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stocksRouter from "./stocks";
import signalRouter from "./signalAnalysis";
import marketRiskRouter from "./marketRisk";
import sectorRouter from "./sectorAnalysis";
import kisBalanceRouter from "./kisBalance";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stocksRouter);
router.use(signalRouter);
router.use(marketRiskRouter);
router.use(sectorRouter);
router.use(kisBalanceRouter);

export default router;
