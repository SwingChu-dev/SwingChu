import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stocksRouter from "./stocks";
import signalRouter from "./signalAnalysis";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stocksRouter);
router.use(signalRouter);

export default router;
