import winston from "winston";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === "production"
      ? winston.format.json()        // CloudWatch reads JSON
      : winston.format.prettyPrint() // Local — human-readable output
  ),
  transports: [new winston.transports.Console()],
});
