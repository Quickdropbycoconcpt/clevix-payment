export class CardInput {
  amount: string;

  environment: string;

  pin: string;

  cardNumber: string;

  cvv2: string;

  expiryDate: string;

  reference: string;

  customerId: string;
}

export class CardOtpInput {
  otp: string;

  environment: string;

  reference: string;
}

export class CardInitiationResponse {
  success: boolean;

  code: string;

  message: string;

  redirectUrl?: string;

  requiredOtp: boolean;

  raw?: unknown;
}

export class CardOtpResponse {
  success: boolean;

  code: string;

  message: string;

  raw?: unknown;
}

export class CardWebhookEvent {
  reference: string;

  providerReference: string;
}
