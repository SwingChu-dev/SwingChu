import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stocksRouter from "./stocks";
import stockChatRouter from "./stockChat";
import stockPatternRouter from "./stockPattern";
import signalRouter from "./signalAnalysis";
import marketIntelRouter from "./marketIntel";
import earningsRouter from "./earnings";
import fomcRouter from "./fomc";
import macroEventsRouter from "./macroEvents";
import analystRouter from "./analyst";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stocksRouter);
router.use(stockChatRouter);
router.use(stockPatternRouter);
router.use(signalRouter);
router.use(marketIntelRouter);
router.use(earningsRouter);
router.use(fomcRouter);
router.use(macroEventsRouter);
router.use(analystRouter);

export default router;
