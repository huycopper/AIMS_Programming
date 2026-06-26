import { IsOptional, IsString, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAdminUsersDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'DEACTIVATED', 'BLOCKED'])
  status?: 'ACTIVE' | 'DEACTIVATED' | 'BLOCKED';

  @IsOptional()
  @IsEnum(['ADMIN', 'PRODUCT_MANAGER'])
  role?: 'ADMIN' | 'PRODUCT_MANAGER';
}
