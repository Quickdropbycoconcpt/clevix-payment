import { HttpException } from '@nestjs/common';

export function HttpServerResponse(
  statusCode: number,
  responseMessage: string,
  responseBody: object,
) {
  // console.log('hi');
  // HttpException
  return {
    statusCode,
    responseMessage,
    responseBody,
  };
}

export class HttpError extends HttpException {
  constructor(statusCode: number, responseMessage: string) {
    super(responseMessage, statusCode);
  }
}
