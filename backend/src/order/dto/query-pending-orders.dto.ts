import { Transform } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

const toPositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.floor(parsed));
};

export class QueryPendingOrdersDto {
  @Transform(({ value }) => toPositiveInt(value, 1))
  @IsInt()
  @Min(1)
  page = 1;

  @Transform(({ value }) => Math.min(toPositiveInt(value, 30), 30))
  @IsInt()
  @Min(1)
  limit = 30;
}
