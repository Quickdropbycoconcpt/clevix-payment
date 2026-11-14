import { HttpException, HttpStatus } from '@nestjs/common';
import { STATUS_CODES } from 'node:http';
import { ERROR_MESSAGES, ErrorCode } from './error-codes';

export class AppException extends HttpException {
  readonly errorCode: ErrorCode;

  constructor(errorCode: ErrorCode, status: HttpStatus, message?: string) {
    super(
      {
        ...HttpException.createBody(
          message ?? ERROR_MESSAGES[errorCode],
          STATUS_CODES[status] ?? 'Error',
          status,
        ),
        errorCode,
      },
      status,
    );

    this.errorCode = errorCode;
  }
}
