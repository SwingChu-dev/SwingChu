import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stocksRouter from "./stocks";
import signalRouter from "./signalAnalysis";
import marketIntelRouter from "./marketIntel";
import weeklyCoachRouter from "./weeklyCoach";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stocksRouter);
router.use(signalRouter);
router.use(marketIntelRouter);
router.use(weeklyCoachRouter);

export default router;
