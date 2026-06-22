import { IsEnum, IsISO8601, IsOptional } from 'class-validator';
import { ProductHistoryActionType } from '../entities/product-history.entity.js';

export class QueryProductHistoriesDto {
  @IsOptional()
  @IsEnum(ProductHistoryActionType)
  actionType?: ProductHistoryActionType;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
