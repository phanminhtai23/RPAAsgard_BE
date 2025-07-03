import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { Stagehand, LogLine } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config.js";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/v1/sessions/logs" });

let wsClients: Set<any> = new Set();

wss.on("connection", (ws) => {
    wsClients.add(ws);
    console.log("WebSocket client connected!");

    ws.on("close", () => {
        wsClients.delete(ws);
    });
});

app.use(cors({
    origin: "http://localhost:3001"
}));

app.use(express.json());

app.post("/api/run-stagehand", async (req, res) => {
    try {
        const workflow: any[] = req.body;

        const stagehand = new Stagehand({
            ...StagehandConfig,
            logger: (logLine: LogLine) => {
                // Gửi logLine cho tất cả client WebSocket đang kết nối
                for (const client of wsClients) {
                    if (client.readyState === 1) {
                        // 1 = OPEN
                        client.send(JSON.stringify(logLine));
                    }
                }
                // Log ra console như cũ
                console.log("category", logLine.category);
                console.log("message", logLine.message);
            },
        });
        await stagehand.init();

        const page = stagehand.page;

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
                stepError = (err as Error).message;
            }

            // Gửi tín hiệu về client qua WebSocket
            const stepResult = {
                type: "stepResult",
                data: {
                    step: i,
                    method: jsonData["method"],
                    status: stepStatus,
                    error: stepError,
                    timestamp: new Date().toISOString(),
                }
            };
            for (const client of wsClients) {
                if (client.readyState === 1) {
                    client.send(JSON.stringify(stepResult));
                }
            }
        }

        await stagehand.close();
        res.json({ success: true, message: "Stagehand ran successfully!" });
    } catch (err) {
        const error = err as Error;
        res.status(500).json({ success: false, error: error.message });
    }
});


server.listen(4000, () => {
    console.log("Backend API + WebSocket running on http://localhost:4000");
});
