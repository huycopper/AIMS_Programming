import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProductStatus, ProductType } from '../entities/product.entity.js';
import {
  BookPayloadDto,
  CdPayloadDto,
  DvdPayloadDto,
  NewspaperPayloadDto,
} from './create-product.dto.js';

export class UpdateProductDto {
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  category?: string;

  @IsOptional()
  @IsString()
  generalDescription?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  height?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  width?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  length?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  barcode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  originalValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsString()
  stockAdjustmentReason?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BookPayloadDto)
  book?: BookPayloadDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CdPayloadDto)
  cd?: CdPayloadDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DvdPayloadDto)
  dvd?: DvdPayloadDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NewspaperPayloadDto)
  newspaper?: NewspaperPayloadDto;
}
