import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class UpdateUserStatusDto {
  @IsEnum(['ACTIVE', 'DEACTIVATED', 'BLOCKED'])
  status: 'ACTIVE' | 'DEACTIVATED' | 'BLOCKED';

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  reason?: string;
}
