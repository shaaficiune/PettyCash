import { IsNotEmpty, IsString, IsOptional, IsNumber, IsEnum, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Priority, RequestStatus } from '@prisma/client';

export enum RequestType {
  CASH_ADVANCE = 'CASH_ADVANCE',
  CASH_SALES = 'CASH_SALES',
  INVOICE_PAYMENT = 'INVOICE_PAYMENT',
  OFFICE_EXPENSE = 'OFFICE_EXPENSE',
  FUEL = 'FUEL',
  TRANSPORT = 'TRANSPORT',
  MAINTENANCE = 'MAINTENANCE',
  UTILITIES = 'UTILITIES',
  PURCHASE = 'PURCHASE',
  EMERGENCY_EXPENSE = 'EMERGENCY_EXPENSE',
  OTHER = 'OTHER',
}

export class AttachmentDto {
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @IsString()
  fileUrl: string;

  @IsNotEmpty()
  @IsString()
  fileType: string;

  @IsNotEmpty()
  @IsNumber()
  fileSize: number;
}

export class CreateRequestDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  regionId?: string;

  @IsOptional()
  @IsString()
  budgetHeadId?: string;

  @IsOptional()
  @IsString()
  costCenter?: string;

  @IsOptional()
  @IsEnum(RequestType)
  requestType?: RequestType;

  @IsOptional()
  @IsString()
  vendorName?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsNotEmpty()
  @IsString()
  purpose: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  requestedAmount: number;

  @IsNotEmpty()
  @IsString()
  currency: string;

  @IsNotEmpty()
  @IsEnum(Priority)
  priority: Priority;

  @IsNotEmpty()
  @IsDateString()
  requiredDate: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus; // Can be DRAFT or PENDING_APPROVAL on creation
}

export class UpdateRequestDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  regionId?: string;

  @IsOptional()
  @IsString()
  budgetHeadId?: string;

  @IsOptional()
  @IsString()
  // costCenter already defined above

  @IsOptional()
  @IsEnum(RequestType)
  requestType?: RequestType;

  @IsOptional()
  @IsString()
  vendorName?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  costCenter?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  requestedAmount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsDateString()
  requiredDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus; // e.g. change to PENDING_APPROVAL from DRAFT
}

export class ReviewRequestDto {
  @IsNotEmpty()
  @IsEnum(RequestStatus)
  status: RequestStatus; // APPROVED, REJECTED, CORRECTION_REQUIRED

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsNumber()
  approvedAmount?: number; // Accountant can modify approved amount
}
