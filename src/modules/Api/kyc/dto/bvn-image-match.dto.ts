import { IsNotEmpty, IsString } from 'class-validator';

export class BvnImageMatchDto {
  @IsString()
  @IsNotEmpty()
  bvn: string;

  @IsString()
  @IsNotEmpty()
  base64Image: string;
}
