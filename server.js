import http from "http";
import app from "./app.js";
import { wsHandler } from "./src/websocket/wsHandler.js";

const HOST = process.env.HOST ?? "localhost";
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

// Tạo HTTP server
const server = http.createServer(app);

// Khởi tạo WebSocket
wsHandler.initialize(server);

// Start server
server.listen(PORT, HOST, () => {
    console.log(`🚀 Backend API running on http://${HOST}:${PORT}`);
    console.log(`🔌 WebSocket server ready at ws://${HOST}:${PORT}/`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close(() => {
        console.log("HTTP server closed");
    });
});
