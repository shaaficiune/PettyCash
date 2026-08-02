import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class InitFundDto {
  @IsNotEmpty()
  @IsString()
  companyId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNotEmpty()
  @IsNumber()
  year: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  openingBalance: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  additionalFunding: number;
}

export class CloseFundDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalFunding?: number;
}
