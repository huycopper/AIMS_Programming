import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductStatus } from './entities/product.entity.js';
import { SearchProductsDto } from './dto/search-products.dto.js';

/**
 * ProductService — Control class (BCE pattern).
 * Orchestrates product queries: random browse & search/filter.
 */
@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) { }

  /**
   * AC-1: Returns 20 random ACTIVE products (books, newspapers, CDs, DVDs).
   * Uses PostgreSQL RANDOM() for randomisation.
   */
  async findRandom(count = 20, category?: string): Promise<Product[]> {
    const qb = this.productRepository
      .createQueryBuilder('product') // Truy vấn bảng product
      .leftJoinAndSelect('product.book', 'book') // Joins book table with product table
      .leftJoinAndSelect('product.cd', 'cd') // Joins cd table with product table
      .leftJoinAndSelect('product.dvd', 'dvd') // Joins dvd table with product table
      .leftJoinAndSelect('product.newspaper', 'newspaper') // Joins newspaper table with product table
      .where('product.status = :status', { status: ProductStatus.ACTIVE }); // Filter by status

    if (category) {
      const categories = category.split(',');
      qb.andWhere('product.productType IN (:...categories)', { categories });
    }

    return qb.orderBy('RANDOM()') // Random order
      .limit(count) // Limit the number of results
      .getMany(); // Get the results
  }

  /**
   * AC-2: Search / filter products.
   * - search: partial match on title (ILIKE) or exact match on category
   * - category: exact match filter
   * - minPrice / maxPrice: price range filter on currentPrice
   * Returns paginated results with total count.
   */
  async searchProducts(
    dto: SearchProductsDto, // SearchProductsDto is a DTO class that contains the search parameters
  ): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    const { search, category, minPrice, maxPrice, page = 1, limit = 20 } = dto;

    const qb = this.productRepository // qb có dạng Object{createQueryBuilder, leftJoinAndSelect, where, andWhere, orderBy, limit, skip, take, getMany, getCount}
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.book', 'book')
      .leftJoinAndSelect('product.cd', 'cd')
      .leftJoinAndSelect('product.dvd', 'dvd')
      .leftJoinAndSelect('product.newspaper', 'newspaper')
      .where('product.status = :status', { status: ProductStatus.ACTIVE });

    // Search by title (case-insensitive partial match) or category
    if (search) {
      qb.andWhere(
        '(product.title ILIKE :search OR product.category ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filter by product type enum values from the UI, or exact product category text.
    if (category) {
      const categories = category.split(',');
      const productTypes = ['BOOK', 'CD', 'DVD', 'NEWSPAPER'];
      if (categories.every((value) => productTypes.includes(value))) {
        qb.andWhere('product.productType IN (:...categories)', { categories });
      } else {
        qb.andWhere('product.category = :category', { category });
      }
    }

    // Filter by price range
    if (minPrice !== undefined) {
      qb.andWhere('product.currentPrice >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      qb.andWhere('product.currentPrice <= :maxPrice', { maxPrice });
    }

    // Default ordering
    qb.orderBy('product.createdAt', 'DESC');

    // Pagination
    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total, page, limit };
  }
}
