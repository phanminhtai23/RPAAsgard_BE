import { Router } from "express";
import stagehandController from "../controllers/stagehandController.js";

const router = Router();

// Route để chạy Stagehand workflow
router.post("/run-stagehand", stagehandController.runStagehand);

export default router;
