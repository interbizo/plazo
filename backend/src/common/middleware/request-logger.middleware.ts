import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private logger = new Logger('RequestLogger');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, headers } = req;
    
    // Only log admin endpoints
    if (originalUrl.startsWith('/api/admin')) {
      this.logger.log(`${method} ${originalUrl}`);
      this.logger.debug(`Headers: ${JSON.stringify({
        authorization: headers.authorization ? 'Present' : 'Missing',
        'content-type': headers['content-type'],
        origin: headers.origin,
      })}`);
    }
    
    next();
  }
}
