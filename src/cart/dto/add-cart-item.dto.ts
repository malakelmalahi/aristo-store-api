import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsUUID, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 2, default: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;
}
