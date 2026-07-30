import {
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsString,
  Matches,
} from 'class-validator';

export class CardPaymentIntentDto {
  @IsNumberString()
  @Matches(/^[1-9]\d*$/, {
    message: 'amount must be a positive integer string',
  })
  amount: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  cardNumber: string;

  @IsString()
  @Matches(/^\d{4}$/, {
    message: 'Card PIN must be exactly 4 digits.',
  })
  cardPin: string;

  @IsString()
  @Matches(/^\d{3,4}$/, {
    message: 'CVV must be 3 or 4 digits.',
  })
  cvv2: string;

  @IsString()
  @Matches(/^(0[1-9]|1[0-2])\d{2}$/, {
    message: 'Expiry date must be in MMYY format.',
  })
  expiryDate: string;

  @IsString()
  @IsNotEmpty()
  narration: string;
}
