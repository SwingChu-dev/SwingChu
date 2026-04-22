import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json({ limit: "12mb" })); // 스크린샷 base64 업로드 허용
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
