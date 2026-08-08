import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IdentificationType } from '../entity/business-reps.entity';
import { OrganizationType } from 'src/shared/enum';

class BusinessRepresentativeDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  documentKey: string;

  @IsBoolean()
  isPrimaryContact: boolean;

  @IsEnum(IdentificationType)
  identityType: IdentificationType;

  @IsString()
  @IsNotEmpty()
  idNumber: string;
}

class BusinessDocuments {
  @IsString()
  fileKey: string;

  @IsString()
  documentName: string;
}

export class BusinessDocumentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessDocuments)
  documents: BusinessDocuments[];
}

export class SubmitBusinessInfoDto {
  @IsEmail()
  businessEmailAddress: string;

  @IsString()
  registrationNumber: string;

  @IsString()
  addressOne: string;

  @IsString()
  @IsOptional()
  addressTwo: string;

  @IsEnum(OrganizationType)
  businessType: OrganizationType;

  @IsString()
  city: string;
}

export class BusinessRepresentativesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessRepresentativeDto)
  representatives: BusinessRepresentativeDto[];
}
