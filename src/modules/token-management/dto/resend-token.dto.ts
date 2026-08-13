import { IsString, IsUUID } from 'class-validator';

export class ResendTokenDto {
  @IsString()
  @IsUUID()
  previousTokenId: string;
}
