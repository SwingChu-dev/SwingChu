import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stocksRouter from "./stocks";
import kisRouter from "./kis";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stocksRouter);
router.use(kisRouter);

export default router;
