import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CollectionProvider } from 'src/modules/Api/collection/adapters/contracts/collection-adapter.types';

export class CreateTerminalDto {
  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @IsEnum(CollectionProvider)
  provider: CollectionProvider;

  @ApiPropertyOptional({
    description: 'Terminal id assigned by the acquiring provider, if known',
  })
  @IsOptional()
  @IsString()
  providerTerminalId?: string;
}
