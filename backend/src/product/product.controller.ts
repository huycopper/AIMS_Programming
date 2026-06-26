import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ProductService } from './product.service.js';
import { SearchProductsDto } from './dto/search-products.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { BulkDeleteProductsDto } from './dto/bulk-delete-products.dto.js';
import { QueryProductHistoriesDto } from './dto/query-product-histories.dto.js';
import { JwtAuthGuard } from '../auth/control/jwt-auth.guard.js';
import { RolesGuard } from '../auth/control/roles.guard.js';
import { Roles } from '../auth/control/roles.decorator.js';

/**
 * ProductController - Boundary class (BCE pattern) for product catalog APIs.
 * Public reads remain unauthenticated. Manager writes use JwtAuthGuard + RolesGuard.
 */
@Controller('api/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('random')
  async getRandomProducts(@Query('category') category?: string) {
    return this.productService.findRandom(20, category);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_MANAGER')
  async getAdminProducts(
    @Req() req: any,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    dto: SearchProductsDto,
  ) {
    return this.productService.findAdminProducts(dto, req.user.userId);
  }

  @Get(':productId')
  async getProductById(@Param('productId') productId: string) {
    return this.productService.findActiveById(productId);
  }

  @Get(':productId/histories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_MANAGER')
  async getProductHistories(
    @Param('productId') productId: string,
    @Req() req: any,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    dto: QueryProductHistoriesDto,
  ) {
    return this.productService.getProductHistories(
      productId,
      dto,
      req.user.userId,
    );
  }

  @Post('bulk-delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_MANAGER')
  async bulkDeleteProducts(
    @Req() req: any,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: BulkDeleteProductsDto,
  ) {
    return this.productService.bulkDeleteProducts(dto, req.user.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_MANAGER')
  async createProduct(
    @Req() req: any,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateProductDto,
  ) {
    return this.productService.createProduct(dto, req.user.userId);
  }

  @Patch(':productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_MANAGER')
  async updateProduct(
    @Param('productId') productId: string,
    @Req() req: any,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(productId, dto, req.user.userId);
  }

  @Get()
  async searchProducts(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    dto: SearchProductsDto,
  ) {
    return this.productService.searchProducts(dto);
  }
}
