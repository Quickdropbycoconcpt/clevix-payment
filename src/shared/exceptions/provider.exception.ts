import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCode } from './error-codes';

export type ProviderErrorContext = {
  provider: string;
  operation: string;
  providerCode?: string;
  providerMessage?: string;
  providerHttpStatus?: number;
};

export class ProviderException extends AppException {
  readonly context: ProviderErrorContext;

  constructor(
    errorCode: ErrorCode,
    context: ProviderErrorContext,
    message?: string,
  ) {
    super(errorCode, HttpStatus.BAD_REQUEST, message);

    this.context = context;
  }
}
