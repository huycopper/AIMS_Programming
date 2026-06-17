import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class TransactionSyncDto {
  @IsString()
  @IsNotEmpty()
  bankaccount: string;

  @Type(() => Number)
  @IsNumber()
  amount: number;

  @IsString()
  @IsIn(['C', 'D'])
  transType: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  transactionid: string;

  @Type(() => Number)
  @IsNumber()
  transactiontime: number;

  @IsString()
  @IsNotEmpty()
  referencenumber: string;

  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsOptional()
  @IsString()
  sign?: string;

  @IsOptional()
  @IsString()
  terminalCode?: string;

  @IsOptional()
  @IsString()
  urlLink?: string;

  @IsOptional()
  @IsString()
  serviceCode?: string;

  @IsOptional()
  @IsString()
  subTerminalCode?: string;
}

export interface VietQRResponseBody {
  error: boolean;
  errorReason: string | null;
  toastMessage: string;
  object: { reftransactionid: string } | null;
}

export interface TransactionSyncResult {
  statusCode: number;
  body: VietQRResponseBody;
}
