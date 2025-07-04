import express from "express";
import cors from "cors";
import routes from "./src/routes/index.js";
import { errorHandler } from "./src/middleware/errorHandler.js";

const app = express();

// Middleware
app.use(
    cors({
        origin: process.env.CORS_ORIGIN || "http://localhost:4000",
    })
);
app.use(express.json());

// Routes
app.use(routes);

// Error handling middleware (phải đặt cuối cùng)
app.use(errorHandler);

export default app;
