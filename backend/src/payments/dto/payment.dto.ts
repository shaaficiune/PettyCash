import { IsNotEmpty, IsString, IsOptional, IsNumber, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class RecordPaymentDto {
  @IsNotEmpty()
  @IsString()
  requestId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  @Max(50, { message: 'Payment amount cannot exceed the maximum petty cash limit of $50' })
  amountPaid: number;

  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;
}
