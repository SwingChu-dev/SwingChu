import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stocksRouter from "./stocks";
import stockChatRouter from "./stockChat";
import signalRouter from "./signalAnalysis";
import marketIntelRouter from "./marketIntel";
import weeklyCoachRouter from "./weeklyCoach";
import portfolioImportRouter from "./portfolioImport";
import earningsRouter from "./earnings";
import fomcRouter from "./fomc";
import analystRouter from "./analyst";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stocksRouter);
router.use(stockChatRouter);
router.use(signalRouter);
router.use(marketIntelRouter);
router.use(weeklyCoachRouter);
router.use(portfolioImportRouter);
router.use(earningsRouter);
router.use(fomcRouter);
router.use(analystRouter);

export default router;
