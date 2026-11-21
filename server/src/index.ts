import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import routes from "./routes";

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());
app.get("/api/health", (_q, res) => res.json({ ok: true }));
app.use("/api", routes);

mongoose.connect(process.env.MONGO_URI as string).then(() => {
  app.listen(process.env.PORT || 5000, () => console.log("LS OMS API running on :" + (process.env.PORT || 5000)));
}).catch((e) => { console.error("MongoDB connection failed", e); process.exit(1); });
