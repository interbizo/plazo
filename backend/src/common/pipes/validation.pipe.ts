import { Injectable, PipeTransform, BadRequestException } from "@nestjs/common";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

@Injectable()
export class ValidationPipe implements PipeTransform {
  async transform(value: any, metadata: any) {
    if (!metadata.type) {
      return value;
    }

    const object = plainToInstance(metadata.type, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const messages = errors.map((error) => ({
        field: error.property,
        errors: error.constraints ? Object.values(error.constraints) : [],
      }));
      throw new BadRequestException({
        message: "Validation failed",
        errors: messages,
      });
    }

    return object;
  }
}
