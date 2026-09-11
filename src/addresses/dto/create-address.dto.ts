import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'Malak Elmalahi' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: '0590000000' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Hebron' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ example: 'Al Ain Street' })
  @IsNotEmpty()
  @IsString()
  street: string;

  @ApiPropertyOptional({ example: '12' })
  @IsOptional()
  @IsString()
  building?: string;

  @ApiPropertyOptional({ example: 'Second floor' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
