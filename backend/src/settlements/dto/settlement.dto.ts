import { IsNotEmpty, IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { SettlementStatus } from '@prisma/client';

export class SubmitSettlementDto {
  @IsNotEmpty()
  @IsString()
  requestId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(50, { message: 'Expense settlement cannot exceed the maximum petty cash limit of $50' })
  actualExpenseAmount: number;

  @IsNotEmpty()
  @IsNumber()
  remainingBalance: number; // Balance (Refund or claim)

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReviewSettlementDto {
  @IsNotEmpty()
  @IsEnum(SettlementStatus)
  status: SettlementStatus; // APPROVED, REJECTED
}
