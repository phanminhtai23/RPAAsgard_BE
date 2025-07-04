import { Router } from "express";
import stagehandRoutes from "./stagehandRoutes.js";

const router = Router();

// Mount các routes
router.use("/api", stagehandRoutes);

// Health check endpoint
router.get("/health", (req, res) => {
    res.json({ status: "OK", message: "Server is running" });
});

export default router;
