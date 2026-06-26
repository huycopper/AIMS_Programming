import { IsNotEmpty, IsString } from 'class-validator';

export class CompletePasswordResetDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  newPassword: string;
}
