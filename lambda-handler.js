import { Stagehand } from "@browserbasehq/stagehand";

/**
 * AWS Lambda Handler để chạy Stagehand automation
 * @param {Object} event - Lambda event object
 * @param {Object} context - Lambda context object
 * @returns {Object} Response object
 */
export const handler = async (event, context) => {
    console.log("🚀 Lambda Handler Started");
    console.log("Event:", JSON.stringify(event, null, 2));

    let stagehand = null;
    let isInitialized = false;

    try {
        // Parse input data
        const requestBody =
            typeof event.body === "string"
                ? JSON.parse(event.body)
                : event.body || event;

        const { cdpUrl, workflow, options = {} } = requestBody;

        // Validate input
        if (!workflow || !Array.isArray(workflow) || workflow.length === 0) {
            return createResponse(400, {
                success: false,
                error: "Workflow is required and must be a non-empty array",
            });
        }

        // Validate cdpUrl nếu có
        if (
            cdpUrl &&
            !cdpUrl.startsWith("ws://") &&
            !cdpUrl.startsWith("wss://")
        ) {
            return createResponse(400, {
                success: false,
                error: "cdpUrl must be a valid WebSocket URL (ws:// or wss://)",
            });
        }

        console.log(`🎯 Processing workflow with ${workflow.length} steps`);
        if (cdpUrl) {
            console.log(`🔗 Using CDP URL: ${cdpUrl}`);
        }

        // Execute workflow using Stagehand service logic
        const results = await executeStagehandWorkflow(
            cdpUrl,
            workflow,
            options
        );

        // Tính toán thống kê
        const totalSteps = results.length;
        const successfulSteps = results.filter(
            (r) => r.status === "success"
        ).length;
        const failedSteps = totalSteps - successfulSteps;

        console.log(
            `📊 Execution completed: ${successfulSteps}/${totalSteps} steps successful`
        );

        return createResponse(200, {
            success: true,
            message: "Workflow executed successfully",
            summary: {
                totalSteps,
                successfulSteps,
                failedSteps,
                executionTime: new Date().toISOString(),
            },
            results,
        });
    } catch (error) {
        console.error("💥 Handler Error:", error);

        // Phân loại lỗi để trả về status code phù hợp
        let statusCode = 500;
        let errorMessage = error.message;

        if (
            error.message.includes("Workflow") ||
            error.message.includes("validation") ||
            error.message.includes("cdpUrl")
        ) {
            statusCode = 400; // Bad Request
        } else if (
            error.message.includes("timeout") ||
            error.message.includes("connection")
        ) {
            statusCode = 503; // Service Unavailable
        }

        return createResponse(statusCode, {
            success: false,
            error: errorMessage,
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * Execute Stagehand workflow (tương tự StagehandService.executeWorkflow)
 * @param {string} cdpUrl - CDP WebSocket URL
 * @param {Array} workflow - Array of workflow steps
 * @param {Object} options - Additional options
 * @returns {Array} Results array
 */
async function executeStagehandWorkflow(cdpUrl, workflow, options = {}) {
    let stagehand = null;
    let isInitialized = false;

    try {
        // Configure Stagehand
        const stagehandConfig = {
            env: "LOCAL",
            enableCaching: false,
            headless: true,
            logger: (logLine) => {
                console.log(`[Stagehand] ${logLine}`);
            },
            ...options,
        };

        // Thêm CDP URL nếu có
        if (cdpUrl) {
            stagehandConfig.localBrowserLaunchOptions = {
                cdpUrl: cdpUrl,
                viewport: {
                    width: 1024,
                    height: 768,
                },
            };
        }

        // Initialize Stagehand
        console.log("�� Initializing Stagehand...");
        stagehand = new Stagehand(stagehandConfig);
        await stagehand.init();
        isInitialized = true;
        console.log("✅ Stagehand initialized successfully");

        const page = stagehand.page;
        const results = [];

        // Xử lý từng bước trong workflow (logic từ StagehandService)
        for (let i = 0; i < workflow.length; i++) {
            const jsonData = workflow[i];
            let stepStatus = "success";
            let stepError = null;
            let stepData = null;

            console.log(
                `📋 Executing step ${i + 1}/${workflow.length}:`,
                jsonData
            );

            try {
                // Xử lý theo format mới
                if (
                    jsonData.method === "navigate" ||
                    jsonData.description === "navigate"
                ) {
                    // Navigate step: {"description": "navigate", "method": "navigate", "arguments": ["https://youtube.com/"], "selector": ""}
                    const url = jsonData.arguments?.[0] || jsonData.url;
                    if (!url) {
                        throw new Error("URL is required for navigate action");
                    }
                    await page.goto(url);
                    stepData = { url };
                } else if (jsonData.action) {
                    // Action step: {"action": "click on the search box"}
                    await page.act(jsonData.action);
                    stepData = { action: jsonData.action };
                } else if (jsonData.method) {
                    // Method-based step với arguments
                    await executeMethodStep(page, jsonData);
                    stepData = {
                        method: jsonData.method,
                        arguments: jsonData.arguments,
                    };
                } else {
                    // Fallback: treat as action string
                    const actionString =
                        typeof jsonData === "string"
                            ? jsonData
                            : JSON.stringify(jsonData);
                    await page.act(actionString);
                    stepData = { action: actionString };
                }
            } catch (err) {
                stepStatus = "error";
                stepError = err.message;
                console.error(`❌ Step ${i + 1} failed:`, err.message);
            }

            // Tạo kết quả cho từng bước (format tương tự StagehandService)
            const stepResult = {
                step: i,
                method: jsonData.method || jsonData.description || "action",
                action: jsonData.action || jsonData.description,
                status: stepStatus,
                error: stepError,
                data: stepData,
                timestamp: new Date().toISOString(),
            };

            results.push(stepResult);
            console.log(
                `${stepStatus === "success" ? "✅" : "❌"} Step ${
                    i + 1
                } ${stepStatus}`
            );

            // Nếu bước này lỗi nghiêm trọng, dừng workflow
            if (
                stepStatus === "error" &&
                stepError.includes("StagehandNotInitializedError")
            ) {
                console.log("🛑 Stopping workflow due to critical error");
                break;
            }

            // Có thể dừng khi gặp lỗi nếu configured
            if (stepStatus === "error" && options.stopOnError === true) {
                console.log("🛑 Stopping workflow due to stopOnError option");
                break;
            }
        }

        return results;
    } catch (error) {
        console.error("💥 Error in executeStagehandWorkflow:", error);
        throw error;
    } finally {
        // Chỉ close khi Stagehand đã được khởi tạo thành công
        if (stagehand && isInitialized) {
            try {
                console.log("🧹 Cleaning up Stagehand...");
                await stagehand.close();
                console.log("✅ Stagehand cleanup completed");
            } catch (closeError) {
                console.error("⚠️ Error during cleanup:", closeError.message);
                // Không throw lỗi ở đây để tránh che lấp lỗi chính
            }
        }
    }
}

/**
 * Execute method-based step
 * @param {Object} page - Stagehand page object
 * @param {Object} stepData - Step data with method and arguments
 */
async function executeMethodStep(page, stepData) {
    const {
        method,
        arguments: args = [],
        selector = "",
        options = {},
    } = stepData;

    switch (method.toLowerCase()) {
        case "click":
            if (selector) {
                await page.click(selector);
            } else if (args[0]) {
                await page.act(`click on ${args[0]}`);
            } else {
                throw new Error(
                    "Selector or target is required for click method"
                );
            }
            break;

        case "type":
        case "fill":
            if (!selector && !args[0]) {
                throw new Error(
                    "Selector or target is required for type method"
                );
            }
            if (!args[1] && !args[0]) {
                throw new Error("Text value is required for type method");
            }

            if (selector) {
                await page.fill(selector, args[0] || "");
            } else {
                await page.act(`type "${args[1] || args[0]}" into ${args[0]}`);
            }
            break;

        case "extract":
            const instruction = args[0] || selector;
            if (!instruction) {
                throw new Error("Instruction is required for extract method");
            }

            const extractedData = await page.extract({
                instruction: instruction,
                schema: options.schema || undefined,
            });
            return extractedData;

        case "wait":
            const waitTime = args[0] || options.time || 1000;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            break;

        case "screenshot":
            const screenshot = await page.screenshot({
                fullPage: options.fullPage || false,
                type: "png",
            });
            return {
                screenshot: screenshot.toString("base64"),
                size: screenshot.length,
            };

        default:
            // Fallback: treat as action
            const actionString = `${method} ${args.join(
                " "
            )} ${selector}`.trim();
            await page.act(actionString);
    }
}

/**
 * Tạo response object chuẩn
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body
 * @returns {Object} Lambda response object
 */
function createResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers":
                "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "POST,OPTIONS",
        },
        body: JSON.stringify(body, null, 2),
    };
}

/**
 * Example input format:
 *
 * {
 *   "cdpUrl": "ws://localhost:3000/",
 *   "workflow": [
 *     {"description": "navigate", "method": "navigate", "arguments": ["https://youtube.com/"], "selector": ""},
 *     {"action": "click on the search box"},
 *     {"method": "type", "arguments": ["search box", "stagehand tutorial"], "selector": ""},
 *     {"action": "extract all video titles"}
 *   ],
 *   "options": {
 *     "stopOnError": true,
 *     "headless": true
 *   }
 * }
 */
