import { Stagehand } from "@browserbasehq/stagehand";
import stagehandConfig from "../config/stagehand.config.js";
import { wsHandler } from "../websocket/wsHandler.js";

export class StagehandService {
    async executeWorkflow(cdpUrl, workflow) {
        let stagehand = null;
        let isInitialized = false;

        try {
            // Khởi tạo Stagehand
            stagehand = new Stagehand({
                ...stagehandConfig,
                env: "LOCAL",
                localBrowserLaunchOptions: {
                    cdpUrl: cdpUrl,
                    viewport: {
                        width: 1024,
                        height: 768,
                    },
                },
                logger: (logLine) => {
                    // Gửi log qua WebSocket
                    wsHandler.broadcast(logLine);
                },
            });

            // Khởi tạo Stagehand và đánh dấu trạng thái
            await stagehand.init();
            isInitialized = true;

            const page = stagehand.page;
            const results = [];

            // Xử lý từng bước trong workflow
            for (let i = 0; i < workflow.length; i++) {
                const jsonData = workflow[i];
                let stepStatus = "success";
                let stepError = null;

                try {
                    if (jsonData["method"] === "navigate") {
                        await page.goto(jsonData["arguments"][0]);
                    } else {
                        await page.act(jsonData);
                    }
                } catch (err) {
                    stepStatus = "error";
                    stepError = err.message;
                    console.error(`Error in step ${i}:`, err);
                }

                // Tạo kết quả cho từng bước
                const stepResult = {
                    step: i,
                    method: jsonData["method"],
                    status: stepStatus,
                    error: stepError,
                    timestamp: new Date().toISOString(),
                };

                results.push(stepResult);

                // Gửi kết quả qua WebSocket
                wsHandler.broadcastStepResult(stepResult);

                // Nếu bước này lỗi nghiêm trọng, dừng workflow
                if (
                    stepStatus === "error" &&
                    stepError.includes("StagehandNotInitializedError")
                ) {
                    break;
                }
            }

            return results;
        } catch (error) {
            console.error("Error in executeWorkflow:", error);

            // Gửi thông báo lỗi qua WebSocket
            wsHandler.broadcast({
                type: "error",
                message: error.message,
                timestamp: new Date().toISOString(),
            });

            throw error;
        } finally {
            // Chỉ close khi Stagehand đã được khởi tạo thành công
            if (stagehand && isInitialized) {
                try {
                    await stagehand.close();
                } catch (closeError) {
                    console.error("Error closing Stagehand:", closeError);
                    // Không throw lỗi ở đây để tránh che lấp lỗi chính
                }
            }
        }
    }
}
