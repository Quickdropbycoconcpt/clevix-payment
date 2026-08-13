import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
