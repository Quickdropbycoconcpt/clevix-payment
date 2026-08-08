import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsString()
  @IsNotEmpty()
  businessAddress: string;

  @IsString()
  @IsNotEmpty()
  businessPhone: string;

  @IsUUID()
  countryId: string;

  @IsUUID()
  stateId: string;

  @IsOptional()
  @IsUUID()
  lgId?: string;
}
