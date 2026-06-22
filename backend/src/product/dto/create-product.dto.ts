import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProductStatus, ProductType } from '../entities/product.entity.js';

export enum BookCoverType {
  PAPERBACK = 'PAPERBACK',
  HARDCOVER = 'HARDCOVER',
}

export enum DvdDiscType {
  BLU_RAY = 'BLU_RAY',
  HD_DVD = 'HD_DVD',
}

export class BookPayloadDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  authors: string[];

  @IsEnum(BookCoverType)
  coverType: BookCoverType;

  @IsString()
  @IsNotEmpty()
  publisher: string;

  @IsISO8601()
  publicationDate: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numberOfPages?: number;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  genre?: string;
}

export class CdTrackDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  length?: string;
}

export class CdPayloadDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  artists: string[];

  @IsString()
  @IsNotEmpty()
  recordLabel: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CdTrackDto)
  tracks: CdTrackDto[];

  @IsString()
  @IsNotEmpty()
  genre: string;

  @IsOptional()
  @IsISO8601()
  releaseDate?: string;
}

export class DvdPayloadDto {
  @IsEnum(DvdDiscType)
  discType: DvdDiscType;

  @IsString()
  @IsNotEmpty()
  director: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  runtime: number;

  @IsString()
  @IsNotEmpty()
  studio: string;

  @IsString()
  @IsNotEmpty()
  language: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  subtitles: string[];

  @IsOptional()
  @IsISO8601()
  releaseDate?: string;

  @IsOptional()
  @IsString()
  genre?: string;
}

export class NewspaperPayloadDto {
  @IsString()
  @IsNotEmpty()
  editorInChief: string;

  @IsString()
  @IsNotEmpty()
  publisher: string;

  @IsISO8601()
  publicationDate: string;

  @IsOptional()
  @IsString()
  issueNumber?: string;

  @IsOptional()
  @IsString()
  publicationFrequency?: string;

  @IsOptional()
  @IsString()
  issn?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sections?: string[];
}

export class CreateProductDto {
  @IsEnum(ProductType)
  productType: ProductType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsOptional()
  @IsString()
  generalDescription?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  height: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  width: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  length: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weight: number;

  @IsString()
  @IsNotEmpty()
  barcode: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  originalValue: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentPrice: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockQuantity: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

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

export type ProductSubtypePayload =
  | BookPayloadDto
  | CdPayloadDto
  | DvdPayloadDto
  | NewspaperPayloadDto;

export type ProductSubtypeKey = 'book' | 'cd' | 'dvd' | 'newspaper';
