import { IsNotEmpty, IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { SettlementStatus } from '@prisma/client';

export class SubmitSettlementDto {
  @IsNotEmpty()
  @IsString()
  requestId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
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
