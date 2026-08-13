import { IsEmail, IsEnum, IsString, IsUUID } from 'class-validator';
import { TokenType } from 'src/shared/enum';

export class ResendTokenDto {
  @IsString()
  @IsUUID()
  previousTokenId: string;
}

export class RequestTokenByEmailDto {
  @IsString()
  @IsEmail()
  email: string;

  @IsEnum(TokenType)
  type: TokenType;
}
