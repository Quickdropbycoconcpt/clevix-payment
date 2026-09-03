import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { IsBigIntAmountString } from 'src/shared/validators/is-bigint-amount-string.validator';

export class CardDto {
  @IsString()
  @IsNotEmpty()
  cardInformation: string;

  @IsBigIntAmountString()
  amount: string;

  @IsString()
  @IsNotEmpty()
  reference: string;
}

export class CardPaymentDto {
  @ApiProperty({ example: '1000' })
  @IsBigIntAmountString()
  amount: string;

  @ApiProperty({ example: 'rosapay-01919' })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiProperty({ example: 'rosapay-01919' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '5060990580000217499' })
  @IsString()
  @IsNotEmpty()
  cardNumber: string;

  @ApiProperty({ example: '1111' })
  @IsString()
  @Matches(/^\d{4}$/, {
    message: 'Card PIN must be exactly 4 digits.',
  })
  cardPin: string;

  @ApiProperty({ example: '111' })
  @IsString()
  @Matches(/^\d{3,4}$/, {
    message: 'CVV must be 3 or 4 digits.',
  })
  cvv2: string;

  @ApiProperty({
    example: '0350',
    description: 'Expiry date in MMYY format',
  })
  @IsString()
  @Matches(/^(0[1-9]|1[0-2])\d{2}$/, {
    message: 'Expiry date must be in MMYY format.',
  })
  expiryDate: string;

  @ApiProperty({ example: 'Payment for electronics' })
  @IsString()
  narration: string;
}

export class ValidateCardOtpDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiProperty({ example: 'rosapay-01919' })
  @IsString()
  @IsNotEmpty()
  reference: string;
}
