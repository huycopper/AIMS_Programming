import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { ProductService } from './product.service.js';
import { SearchProductsDto } from './dto/search-products.dto.js';

/**
 * ProductController — Boundary class (BCE pattern) for the backend.
 * Exposes REST endpoints for product browsing and searching.
 * No authentication required for these read-only operations (as per story constraints).
 */
@Controller('api/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  /**
   * GET /api/products/random
   * AC-1: Returns 20 random ACTIVE products.
   */
  @Get('random')
  async getRandomProducts() {
    return this.productService.findRandom(20);
  }

  /**
   * GET /api/products
   * AC-2: Search and filter products by title, category, price range.
   * Query params: search, category, minPrice, maxPrice, page, limit
   */
  @Get()
  async searchProducts(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    dto: SearchProductsDto,
  ) {
    return this.productService.searchProducts(dto);
  }
}
