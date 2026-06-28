import { IsString, IsEmail, Length, IsArray, ArrayNotEmpty, IsEnum } from 'class-validator';

export class CreateAdminUserDto {
  @IsString()
  @Length(1, 100)
  username: string;

  @IsEmail()
  @Length(1, 255)
  email: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(['ADMIN', 'PRODUCT_MANAGER'], { each: true })
  roles: ('ADMIN' | 'PRODUCT_MANAGER')[];
}
