import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyBvnDto {
  @IsString()
  @IsNotEmpty()
  bvn: string;
}
