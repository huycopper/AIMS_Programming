import { IsArray, ArrayNotEmpty, IsEnum } from 'class-validator';

export class UpdateUserRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(['ADMIN', 'PRODUCT_MANAGER'], { each: true })
  roles: ('ADMIN' | 'PRODUCT_MANAGER')[];
}
