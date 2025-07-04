import { WebSocketServer } from "ws";

class WebSocketHandler {
    constructor() {
        this.wss = null;
        this.clients = new Set();
    }

    initialize(server) {
        this.wss = new WebSocketServer({ server, path: "/" });

        this.wss.on("connection", (ws) => {
            this.clients.add(ws);
            console.log(
                "WebSocket client connected! Total clients:",
                this.clients.size
            );
            
            ws.on("close", () => {
                this.clients.delete(ws);
                console.log(
                    "WebSocket client disconnected. Total clients:",
                    this.clients.size
                );
            });

            ws.on("error", (error) => {
                console.error("WebSocket error:", error);
            });

            // Gửi message chào mừng
            ws.send(
                JSON.stringify({
                    type: "connection",
                    message: "Connected to Stagehand WebSocket",
                    timestamp: new Date().toISOString(),
                })
            );
        });
    }

    broadcast(data) {
        const message = JSON.stringify(data);
        this.clients.forEach((client) => {
            if (client.readyState === 1) {
                // OPEN state
                client.send(message);
            }
        });
    }

    broadcastStepResult(stepResult) {
        this.broadcast({
            type: "stepResult",
            data: stepResult,
        });
    }
}

export const wsHandler = new WebSocketHandler();
