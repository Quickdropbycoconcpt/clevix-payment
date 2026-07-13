import { IsBase64, IsNotEmpty, IsString } from 'class-validator';

export class BvnImageMatchDto {
  @IsString()
  @IsNotEmpty()
  bvn: string;

  @IsString()
  // @IsBase64()
  @IsNotEmpty()
  base64Image: string;
}
