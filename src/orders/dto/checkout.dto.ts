import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { PaymentMethod } from '../../common/enums/payment-method.enum';

export class CheckoutDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsNotEmpty()
  @IsUUID()
  addressId: string;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    default: PaymentMethod.CASH_ON_DELIVERY,
    example: PaymentMethod.CASH_ON_DELIVERY,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod = PaymentMethod.CASH_ON_DELIVERY;
}
