import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyNinDto {
  @IsString()
  @IsNotEmpty()
  nin: string;
}
