export class BaseResponseType {
  status = '';
  success = false;
  message = '';
}

export class ResponseFormat<T> extends BaseResponseType {
  data?: T;
}

export class Ok<Type> extends BaseResponseType {
  data?: Type;
}

export class BadRequest extends BaseResponseType {
  error?: unknown;
  errorCode?: string;
}

export class NotFound extends BaseResponseType {
  error?: unknown;
  errorCode?: string;
}
