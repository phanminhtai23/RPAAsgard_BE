import { StagehandService } from "../services/stagehandService.js";

class StagehandController {
    constructor() {
        this.stagehandService = new StagehandService();
    }

    runStagehand = async (req, res) => {
        try {
            // Nhận body theo format mới
            const { cdpUrl, workflow } = req.body;

            if (!cdpUrl || !workflow) {
                return res.status(400).json({
                    success: false,
                    error: "Missing cdpUrl or workflow",
                });
            }

            // Validate workflow format
            if (!Array.isArray(workflow) || workflow.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: "Workflow must be a non-empty array",
                });
            }

            // Validate cdpUrl format
            if (!cdpUrl.startsWith("ws://") && !cdpUrl.startsWith("wss://")) {
                return res.status(400).json({
                    success: false,
                    error: "cdpUrl must be a valid WebSocket URL (ws:// or wss://)",
                });
            }

            // Gọi service để xử lý business logic
            const result = await this.stagehandService.executeWorkflow(
                cdpUrl,
                workflow
            );

            return res.json({
                success: true,
                message: "Stagehand ran successfully!",
                data: result,
            });
        } catch (err) {
            console.error("Error in runStagehand:", err);

            // Phân loại lỗi để trả về status code phù hợp
            if (err.message.includes("StagehandNotInitializedError")) {
                return res.status(503).json({
                    success: false,
                    error: "Browser connection failed. Please check cdpUrl and try again.",
                    details: err.message,
                });
            }

            if (
                err.message.includes("Connection refused") ||
                err.message.includes("ECONNREFUSED")
            ) {
                return res.status(503).json({
                    success: false,
                    error: "Cannot connect to browser. Please ensure browser is running.",
                    details: err.message,
                });
            }

            return res.status(500).json({
                success: false,
                error: err.message,
            });
        }
    };
}

export default new StagehandController();
