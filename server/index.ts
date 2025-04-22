import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { globalErrorHandler, logError } from "./utils/errorHandler";

const app = express();
app.use(express.json({
  limit: '10mb',
  // Add error handling for JSON parsing errors
  verify: (req: Request, res: Response, buf, encoding) => {
    try {
      JSON.parse(buf.toString());
    } catch (e: any) {
      res.status(400).json({ 
        status: 'fail',
        message: 'Invalid JSON provided',
        error: e.message
      });
      throw e;
    }
  }
}));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Capture JSON responses for logging
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Log response details on completion
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const statusCode = res.statusCode;
      // Colorize status code in logs
      const statusText = statusCode >= 500 ? `\x1b[31m${statusCode}\x1b[0m` : // Red for 5xx
                         statusCode >= 400 ? `\x1b[33m${statusCode}\x1b[0m` : // Yellow for 4xx
                         statusCode >= 300 ? `\x1b[36m${statusCode}\x1b[0m` : // Cyan for 3xx
                         `\x1b[32m${statusCode}\x1b[0m`; // Green for 2xx

      let logLine = `${req.method} ${path} ${statusText} in ${duration}ms`;
      
      // Include response data in log (truncated if too large)
      if (capturedJsonResponse) {
        const responseStr = JSON.stringify(capturedJsonResponse);
        if (responseStr.length > 80) {
          logLine += ` :: ${responseStr.slice(0, 77)}...`;
        } else {
          logLine += ` :: ${responseStr}`;
        }
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    // 404 handler for API routes
    app.use('/api/*', (req, res) => {
      res.status(404).json({
        status: 'fail',
        message: `API endpoint not found: ${req.originalUrl}`,
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    app.use(globalErrorHandler);

    // Set up Vite for development or serve static files in production
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start the server
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`WordPress to Markdown Converter API serving on port ${port}`);
    });

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      logError(error, 'uncaughtException');
      console.error('UNCAUGHT EXCEPTION 💥 Shutting down...');
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      if (reason instanceof Error) {
        logError(reason, 'unhandledRejection');
      } else {
        console.error('[ERROR] Unhandled rejection:', reason);
      }
      console.error('UNHANDLED REJECTION 💥 Shutting down...');
      process.exit(1);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
