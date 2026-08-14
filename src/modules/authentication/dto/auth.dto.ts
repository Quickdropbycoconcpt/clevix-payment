import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({ example: 'Ada' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Lovelace' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'Clevix Labs' })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ example: '8012345678' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ example: '234' })
  @IsString()
  @IsNotEmpty()
  diaCode: string;

  @ApiProperty({ example: 'founder@clevix.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'No 4 williams street ikirun' })
  @IsString()
  businessAddress: string;

  @ApiProperty({ minLength: 8, example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'aa3ae4e0-3ae5-46d3-a748-dd152e1a676f' })
  @IsUUID()
  @IsNotEmpty()
  countryId: string;

  @ApiProperty({ example: '178a6b51-bf34-4d73-a0a3-856937625174' })
  @IsUUID()
  @IsNotEmpty()
  stateId: string;

  @IsOptional()
  @ApiPropertyOptional({
    example: 'f8bca2f4-2199-468b-9614-362104e7ee5e',
  })
  @IsUUID()
  @IsNotEmpty()
  lgId: string;
}

export class LoginDto {
  @ApiProperty({ example: 'founder@clevix.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, example: 'StrongPass123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class ApiLoginDto {
  @ApiProperty({ example: '3465789' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ minLength: 8, example: 'StrongPass123!' })
  @IsString()
  @IsNotEmpty()
  secretKey: string;

  @ApiProperty({ minLength: 8, example: '15' })
  @IsNumber()
  @IsPositive()
  duration: number;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ minLength: 8, example: 'NewStrongPass123!' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
