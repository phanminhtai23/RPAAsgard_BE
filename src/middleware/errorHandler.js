export const errorHandler = (err, req, res, next) => {
    console.error("Error:", err.stack);

    // Xử lý các loại lỗi khác nhau
    if (err.name === "ValidationError") {
        return res.status(400).json({
            success: false,
            error: "Validation Error",
            details: err.message,
        });
    }

    if (err.name === "UnauthorizedError") {
        return res.status(401).json({
            success: false,
            error: "Unauthorized",
        });
    }

    // Lỗi mặc định
    res.status(err.status || 500).json({
        success: false,
        error: err.message || "Internal Server Error",
    });
};
