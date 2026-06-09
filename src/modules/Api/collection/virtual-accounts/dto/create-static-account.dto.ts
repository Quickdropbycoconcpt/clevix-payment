import { IsNotEmpty, IsString } from 'class-validator';

export enum AccountType {
  INDIVIDUAL = 'INDIVIDUAL',
  CORPORATE = 'CORPORATE',
}
export class CreateIndividualStaticAccountDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  bvn: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  dob: string;

  @IsString()
  @IsNotEmpty()
  nin: string;

  @IsString()
  @IsNotEmpty()
  address: string;
}

export class CreateCorporateStaticAccountDto {
  @IsString()
  @IsNotEmpty()
  bvn: string;

  @IsString()
  @IsNotEmpty()
  incorporationDate: string;

  @IsString()
  @IsNotEmpty()
  businessType: string;

  @IsString()
  @IsNotEmpty()
  rcNumber: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  nin: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  address: string;
}
