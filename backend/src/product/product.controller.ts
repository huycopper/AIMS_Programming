import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { ProductService } from './product.service.js';
import { SearchProductsDto } from './dto/search-products.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { BulkDeleteProductsDto } from './dto/bulk-delete-products.dto.js';
import { QueryProductHistoriesDto } from './dto/query-product-histories.dto.js';

/**
 * ProductController - Boundary class (BCE pattern) for product catalog APIs.
 * Public reads remain unauthenticated. Manager writes use a temporary
 * X-AIMS-User-Id adapter until RBAC is implemented in Epic 5.
 */
@Controller('api/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('random')
  async getRandomProducts(@Query('category') category?: string) {
    return this.productService.findRandom(20, category);
  }

  @Get('admin')
  async getAdminProducts(
    @Headers('x-aims-user-id') performedBy: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    dto: SearchProductsDto,
  ) {
    return this.productService.findAdminProducts(dto, performedBy);
  }

  @Get(':productId/histories')
  async getProductHistories(
    @Param('productId') productId: string,
    @Headers('x-aims-user-id') performedBy: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    dto: QueryProductHistoriesDto,
  ) {
    return this.productService.getProductHistories(productId, dto, performedBy);
  }

  @Post('bulk-delete')
  async bulkDeleteProducts(
    @Headers('x-aims-user-id') performedBy: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: BulkDeleteProductsDto,
  ) {
    return this.productService.bulkDeleteProducts(dto, performedBy);
  }

  @Post()
  async createProduct(
    @Headers('x-aims-user-id') performedBy: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateProductDto,
  ) {
    return this.productService.createProduct(dto, performedBy);
  }

  @Patch(':productId')
  async updateProduct(
    @Param('productId') productId: string,
    @Headers('x-aims-user-id') performedBy: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(productId, dto, performedBy);
  }

  @Get()
  async searchProducts(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    dto: SearchProductsDto,
  ) {
    return this.productService.searchProducts(dto);
  }
}
