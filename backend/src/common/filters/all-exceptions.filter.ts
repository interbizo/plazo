import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let errors = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, any>;
        message = resp["message"] || message;
        errors = resp["errors"] || null;
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof Error) {
      // Don't expose internal error messages to clients
      this.logger.error(exception.stack);
    }

    // Only log 5xx as ERROR, 4xx as WARN (they are expected client errors)
    const logPayload = {
      timestamp: new Date().toISOString(),
      status,
      message,
      path: request.url,
      method: request.method,
    };

    if (status >= 500) {
      this.logger.error(logPayload);
    } else if (status === 401 || status === 403) {
      // Auth errors — only log in debug to reduce noise
      this.logger.debug(logPayload);
    } else if (status >= 400) {
      this.logger.warn(logPayload);
    }

    response.status(status).json({
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
