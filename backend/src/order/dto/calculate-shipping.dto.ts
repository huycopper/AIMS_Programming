import {
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsOptional,
  IsEmail,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Represents a single cart item for shipping calculation.
 */
export class CartItemDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  productTitle?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  weight: number;

  @IsNumber()
  @Min(0)
  currentPrice: number;
}

/**
 * DTO for shipping fee calculation request.
 * The frontend sends delivery info + cart items so the backend
 * can compute the shipping fee securely.
 */
export class CalculateShippingDto {
  @IsNotEmpty()
  @IsString()
  province: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  cartItems: CartItemDto[];
}

/**
 * DTO for the full place-order request, combining delivery info with cart.
 */
export class PlaceOrderDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^(\+84|0)\d{9,10}$/, {
    message: 'Phone number must be a valid Vietnamese phone number',
  })
  phone: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  province: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  cartItems: CartItemDto[];
}
