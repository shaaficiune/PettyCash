import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class InitFundDto {
  @IsNotEmpty()
  @IsString()
  companyId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  year: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  openingBalance: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  additionalFunding: number;
}

export class CloseFundDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  additionalFunding?: number;
}
