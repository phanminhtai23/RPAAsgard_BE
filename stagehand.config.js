"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
var StagehandConfig = {
    verbose: 1 /* Verbosity level for logging: 0 = silent, 1 = info, 2 = all */,
    domSettleTimeoutMs: 30000 /* Timeout for DOM to settle in milliseconds */,
    // LLM configuration
    modelName: "google/gemini-2.0-flash" /* Name of the model to use */,
    modelClientOptions: {
        apiKey: process.env.GOOGLE_API_KEY,
    } /* Configuration options for the model client */,
    // Browser configuration
    env: "LOCAL" /* Environment to run in: LOCAL or BROWSERBASE */,
    apiKey: process.env.BROWSERBASE_API_KEY /* API key for authentication */,
    projectId: process.env.BROWSERBASE_PROJECT_ID /* Project identifier */,
    browserbaseSessionID: undefined /* Session ID for resuming Browserbase sessions */,
    browserbaseSessionCreateParams: {
        projectId: process.env.BROWSERBASE_PROJECT_ID,
        browserSettings: {
            blockAds: true,
            viewport: {
                width: 1024,
                height: 768,
            },
        },
    },
    localBrowserLaunchOptions: {
        // "wss://connect.steel.dev?sessionId=e71e4bdc-4440-409a-995a-e76b750fb0df"
        cdpUrl: "ws://localhost:3000/",
        viewport: {
            width: 1024,
            height: 768,
        },
    } /* Configuration options for the local browser */,
    logInferenceToFile: true,
};
exports.default = StagehandConfig;
