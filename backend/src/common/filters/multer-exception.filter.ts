import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { MulterError } from "multer";

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MulterExceptionFilter.name);

  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.BAD_REQUEST;
    let message = "File upload error";

    // Handle specific multer errors
    switch (exception.code) {
      case "LIMIT_FILE_SIZE":
        message = "Ukuran file melebihi batas maksimal. Gambar maks 10MB, dokumen maks 5MB.";
        break;
      case "LIMIT_FILE_COUNT":
        message = "Terlalu banyak file. Maksimal 10 file per upload.";
        break;
      case "LIMIT_UNEXPECTED_FILE":
        message = "Field file tidak valid";
        break;
      default:
        message = exception.message || message;
    }

    this.logger.error({
      timestamp: new Date().toISOString(),
      status,
      message,
      code: exception.code,
      path: request.url,
      method: request.method,
    });

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
