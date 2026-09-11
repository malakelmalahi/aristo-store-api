import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Skincare' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'Products for skin care' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/skincare.jpg' })
  @IsOptional()
  @IsString()
  @IsUrl()
  imageUrl?: string;
}
