import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Vitamin C Serum' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'vitamin-c-serum' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'Face serum for glowing skin' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 18.5 })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ example: 20, default: 0 })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ example: 'https://example.com/serum.jpg' })
  @IsOptional()
  @IsString()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;
}
