import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SearchProductsDto } from './dto/search-products.dto.js';
import {
  CreateProductDto,
  ProductSubtypeKey,
} from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { BulkDeleteProductsDto } from './dto/bulk-delete-products.dto.js';
import { QueryProductHistoriesDto } from './dto/query-product-histories.dto.js';
import {
  Product,
  ProductStatus,
  ProductType,
} from './entities/product.entity.js';
import { Book } from './entities/book.entity.js';
import { Cd } from './entities/cd.entity.js';
import { Dvd } from './entities/dvd.entity.js';
import { Newspaper } from './entities/newspaper.entity.js';
import {
  ProductHistory,
  ProductHistoryActionType,
} from './entities/product-history.entity.js';

type ProductWithSubtypes = Product & {
  book?: Book | null;
  cd?: Cd | null;
  dvd?: Dvd | null;
  newspaper?: Newspaper | null;
};

type BulkDeleteResult = {
  productId: string;
  status: 'DELETED' | 'DEACTIVATED' | 'REJECTED';
  message: string;
};

/**
 * ProductService - Control class (BCE pattern).
 * Orchestrates public product reads and Product Manager catalog operations.
 */
@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductHistory)
    private readonly productHistoryRepository: Repository<ProductHistory>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * AC-1: Returns 20 random ACTIVE products (books, newspapers, CDs, DVDs).
   * Uses PostgreSQL RANDOM() for randomisation.
   */
  async findRandom(count = 20, category?: string): Promise<Product[]> {
    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.book', 'book')
      .leftJoinAndSelect('product.cd', 'cd')
      .leftJoinAndSelect('product.dvd', 'dvd')
      .leftJoinAndSelect('product.newspaper', 'newspaper')
      .where('product.status = :status', { status: ProductStatus.ACTIVE });

    if (category) {
      qb.andWhere('product.category = :category', { category });
    }

    return qb.orderBy('RANDOM()').limit(count).getMany();
  }

  /**
   * Search / filter products for the customer catalog.
   * Public reads must only expose ACTIVE products.
   */
  async searchProducts(
    dto: SearchProductsDto,
  ): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    const { search, category, minPrice, maxPrice, page = 1, limit = 20 } = dto;

    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.book', 'book')
      .leftJoinAndSelect('product.cd', 'cd')
      .leftJoinAndSelect('product.dvd', 'dvd')
      .leftJoinAndSelect('product.newspaper', 'newspaper')
      .where('product.status = :status', { status: ProductStatus.ACTIVE });

    if (search) {
      qb.andWhere(
        '(product.title ILIKE :search OR product.category ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (category) {
      const categories = this.parseCategoryFilter(category);
      if (categories.length === 1) {
        qb.andWhere('product.category = :category', {
          category: categories[0],
        });
      } else if (categories.length > 1) {
        qb.andWhere('product.category IN (:...categories)', { categories });
      }
    }

    if (minPrice !== undefined) {
      qb.andWhere('product.currentPrice >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      qb.andWhere('product.currentPrice <= :maxPrice', { maxPrice });
    }

    qb.orderBy('product.createdAt', 'DESC');

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total, page, limit };
  }

  async findActiveById(productId: string): Promise<ProductWithSubtypes> {
    const product = await this.productRepository.findOne({
      where: { productId, status: ProductStatus.ACTIVE },
      relations: { book: true, cd: true, dvd: true, newspaper: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found or unavailable.');
    }

    return product;
  }

  async findAdminProducts(
    dto: SearchProductsDto,
    performedBy: string,
  ): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    const { search, category, minPrice, maxPrice, page = 1, limit = 20 } = dto;

    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.book', 'book')
      .leftJoinAndSelect('product.cd', 'cd')
      .leftJoinAndSelect('product.dvd', 'dvd')
      .leftJoinAndSelect('product.newspaper', 'newspaper');

    if (search) {
      qb.andWhere(
        '(product.title ILIKE :search OR product.category ILIKE :search OR product.barcode ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (category) {
      qb.andWhere('product.category = :category', { category });
    }
    if (minPrice !== undefined) {
      qb.andWhere('product.currentPrice >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      qb.andWhere('product.currentPrice <= :maxPrice', { maxPrice });
    }

    qb.orderBy('product.updatedAt', 'DESC');

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total, page, limit };
  }

  async createProduct(
    dto: CreateProductDto,
    performedBy: string,
  ): Promise<Product> {
    this.validatePriceRange(dto.originalValue, dto.currentPrice);
    this.validateSubtypePayload(dto.productType, dto, true);

    return this.dataSource.transaction(async (manager) => {
      const product = manager.getRepository(Product).create({
        productType: dto.productType,
        title: dto.title,
        category: dto.category,
        generalDescription: dto.generalDescription ?? null,
        height: dto.height,
        width: dto.width,
        length: dto.length,
        weight: dto.weight,
        barcode: dto.barcode,
        originalValue: dto.originalValue,
        currentPrice: dto.currentPrice,
        stockQuantity: dto.stockQuantity,
        status: ProductStatus.ACTIVE,
      });
      const savedProduct = await manager.getRepository(Product).save(product);

      await this.saveMatchingSubtype(manager, savedProduct.productId, dto);
      const fullProduct = await this.findProductOrFail(
        manager,
        savedProduct.productId,
      );

      await this.recordHistory(manager, {
        productId: fullProduct.productId,
        performedBy,
        actionType: ProductHistoryActionType.CREATE,
        oldValueSnapshot: null,
        newValueSnapshot: this.snapshot(fullProduct),
        reason: null,
      });

      return fullProduct;
    });
  }

  async updateProduct(
    productId: string,
    dto: UpdateProductDto,
    performedBy: string,
  ): Promise<Product> {
    return this.dataSource.transaction(async (manager) => {
      const existing = await this.findProductOrFail(manager, productId);
      const oldSnapshot = this.snapshot(existing);
      const nextProductType = dto.productType ?? existing.productType;
      const nextOriginalValue =
        dto.originalValue ?? Number(existing.originalValue);
      const nextCurrentPrice =
        dto.currentPrice ?? Number(existing.currentPrice);
      const stockChanged =
        dto.stockQuantity !== undefined &&
        dto.stockQuantity !== Number(existing.stockQuantity);

      this.validatePriceRange(nextOriginalValue, nextCurrentPrice);
      this.validateSubtypePayload(
        nextProductType,
        dto,
        false,
        existing.productType,
      );

      if (stockChanged && !dto.stockAdjustmentReason?.trim()) {
        throw new BadRequestException(
          'Stock adjustment reason is required when stockQuantity changes.',
        );
      }

      const productRepo = manager.getRepository(Product);
      const merged = productRepo.merge(existing, {
        productType: nextProductType,
        title: dto.title ?? existing.title,
        category: dto.category ?? existing.category,
        generalDescription:
          dto.generalDescription !== undefined
            ? dto.generalDescription
            : existing.generalDescription,
        height: dto.height ?? Number(existing.height),
        width: dto.width ?? Number(existing.width),
        length: dto.length ?? Number(existing.length),
        weight: dto.weight ?? Number(existing.weight),
        barcode: dto.barcode ?? existing.barcode,
        originalValue: nextOriginalValue,
        currentPrice: nextCurrentPrice,
        stockQuantity: dto.stockQuantity ?? Number(existing.stockQuantity),
        status: existing.status,
      });

      await productRepo.save(merged);

      if (nextProductType !== existing.productType) {
        this.requireSubtypeForType(nextProductType, dto);
        await this.deleteAllSubtypeRows(manager, productId);
        await this.saveMatchingSubtype(manager, productId, dto);
      } else if (this.countSubtypePayloads(dto) > 0) {
        await this.saveMatchingSubtype(manager, productId, dto);
      }

      const fullProduct = await this.findProductOrFail(manager, productId);
      const newSnapshot = this.snapshot(fullProduct);

      await this.recordHistory(manager, {
        productId,
        performedBy,
        actionType: ProductHistoryActionType.UPDATE,
        oldValueSnapshot: oldSnapshot,
        newValueSnapshot: newSnapshot,
        reason: null,
      });

      if (stockChanged) {
        await this.recordHistory(manager, {
          productId,
          performedBy,
          actionType: ProductHistoryActionType.STOCK_ADJUST,
          oldValueSnapshot: oldSnapshot,
          newValueSnapshot: newSnapshot,
          reason: dto.stockAdjustmentReason!.trim(),
        });
      }

      return fullProduct;
    });
  }

  async bulkDeleteProducts(
    dto: BulkDeleteProductsDto,
    performedBy: string,
  ): Promise<{ results: BulkDeleteResult[] }> {
    const uniqueIds = [...new Set(dto.productIds)];

    if (uniqueIds.length !== dto.productIds.length) {
      throw new BadRequestException('Duplicate product ids are not allowed.');
    }
    if (uniqueIds.length > 10) {
      throw new BadRequestException(
        'Cannot delete more than 10 products at once.',
      );
    }

    const dailyCount = await this.countTodayDeleteActions(performedBy);
    if (dailyCount + uniqueIds.length > 20) {
      throw new BadRequestException(
        'Product Manager cannot delete or deactivate more than 20 products per day.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const results: BulkDeleteResult[] = [];
      const productRepo = manager.getRepository(Product);

      for (const productId of uniqueIds) {
        const product = await this.findProduct(manager, productId);

        if (!product) {
          results.push({
            productId,
            status: 'REJECTED',
            message: 'Product not found.',
          });
          continue;
        }
        if (product.status !== ProductStatus.ACTIVE) {
          results.push({
            productId,
            status: 'REJECTED',
            message: 'Product is already unavailable for sale.',
          });
          continue;
        }

        const oldSnapshot = this.snapshot(product);
        const actionType =
          Number(product.stockQuantity) > 0
            ? ProductHistoryActionType.DEACTIVATE
            : ProductHistoryActionType.DELETE;
        product.status =
          actionType === ProductHistoryActionType.DEACTIVATE
            ? ProductStatus.DEACTIVATED
            : ProductStatus.DELETED;

        await productRepo.save(product);
        const updatedProduct = await this.findProductOrFail(manager, productId);

        await this.recordHistory(manager, {
          productId,
          performedBy,
          actionType,
          oldValueSnapshot: oldSnapshot,
          newValueSnapshot: this.snapshot(updatedProduct),
          reason: dto.reason?.trim() || null,
        });

        results.push({
          productId,
          status:
            actionType === ProductHistoryActionType.DEACTIVATE
              ? 'DEACTIVATED'
              : 'DELETED',
          message:
            actionType === ProductHistoryActionType.DEACTIVATE
              ? 'Product had stock and was deactivated.'
              : 'Product had zero stock and was marked deleted.',
        });
      }

      return { results };
    });
  }

  async getProductHistories(
    productId: string,
    dto: QueryProductHistoriesDto,
    performedBy: string,
  ): Promise<ProductHistory[]> {
    const qb = this.productHistoryRepository
      .createQueryBuilder('history')
      .where('history.productId = :productId', { productId });

    if (dto.actionType) {
      qb.andWhere('history.actionType = :actionType', {
        actionType: dto.actionType,
      });
    }
    if (dto.from) {
      qb.andWhere('history.actionTime >= :from', {
        from: new Date(dto.from),
      });
    }
    if (dto.to) {
      qb.andWhere('history.actionTime <= :to', {
        to: new Date(dto.to),
      });
    }

    return qb.orderBy('history.actionTime', 'DESC').getMany();
  }

  private validatePriceRange(
    originalValue: number,
    currentPrice: number,
  ): void {
    if (
      currentPrice < originalValue * 0.3 ||
      currentPrice > originalValue * 1.5
    ) {
      throw new BadRequestException(
        'Current price must be between 30% and 150% of original value.',
      );
    }
  }

  private validateSubtypePayload(
    productType: ProductType,
    payload: Partial<CreateProductDto & UpdateProductDto>,
    requireSubtype: boolean,
    existingType?: ProductType,
  ): void {
    const payloadCount = this.countSubtypePayloads(payload);

    if (payloadCount > 1) {
      throw new BadRequestException(
        'Create or update request must include at most one subtype payload.',
      );
    }

    if (requireSubtype || productType !== existingType) {
      this.requireSubtypeForType(productType, payload);
    }

    if (payloadCount === 1 && !this.hasSubtypePayload(productType, payload)) {
      throw new BadRequestException(
        'Subtype payload must match the selected productType.',
      );
    }
  }

  private requireSubtypeForType(
    productType: ProductType,
    payload: Partial<CreateProductDto & UpdateProductDto>,
  ): void {
    if (!this.hasSubtypePayload(productType, payload)) {
      throw new BadRequestException(
        'A matching subtype payload is required for the selected productType.',
      );
    }
  }

  private countSubtypePayloads(
    payload: Partial<CreateProductDto & UpdateProductDto>,
  ): number {
    return this.subtypeKeys().filter((key) => payload[key] !== undefined)
      .length;
  }

  private hasSubtypePayload(
    productType: ProductType,
    payload: Partial<CreateProductDto & UpdateProductDto>,
  ): boolean {
    return payload[this.subtypeKeyForType(productType)] !== undefined;
  }

  private subtypeKeyForType(productType: ProductType): ProductSubtypeKey {
    switch (productType) {
      case ProductType.BOOK:
        return 'book';
      case ProductType.CD:
        return 'cd';
      case ProductType.DVD:
        return 'dvd';
      case ProductType.NEWSPAPER:
        return 'newspaper';
    }
  }

  private subtypeKeys(): ProductSubtypeKey[] {
    return ['book', 'cd', 'dvd', 'newspaper'];
  }

  private async saveMatchingSubtype(
    manager: EntityManager,
    productId: string,
    payload: Partial<CreateProductDto & UpdateProductDto>,
  ): Promise<void> {
    if (payload.book) {
      await manager.getRepository(Book).save({ productId, ...payload.book });
    } else if (payload.cd) {
      await manager.getRepository(Cd).save({ productId, ...payload.cd });
    } else if (payload.dvd) {
      await manager.getRepository(Dvd).save({ productId, ...payload.dvd });
    } else if (payload.newspaper) {
      await manager
        .getRepository(Newspaper)
        .save({ productId, ...payload.newspaper });
    }
  }

  private async deleteAllSubtypeRows(
    manager: EntityManager,
    productId: string,
  ): Promise<void> {
    await Promise.all([
      manager.getRepository(Book).delete({ productId }),
      manager.getRepository(Cd).delete({ productId }),
      manager.getRepository(Dvd).delete({ productId }),
      manager.getRepository(Newspaper).delete({ productId }),
    ]);
  }

  private async findProductOrFail(
    manager: EntityManager,
    productId: string,
  ): Promise<ProductWithSubtypes> {
    const product = await this.findProduct(manager, productId);
    if (!product) {
      throw new NotFoundException('Product not found.');
    }
    return product;
  }

  private async findProduct(
    manager: EntityManager,
    productId: string,
  ): Promise<ProductWithSubtypes | null> {
    return manager.getRepository(Product).findOne({
      where: { productId },
      relations: { book: true, cd: true, dvd: true, newspaper: true },
    });
  }

  private parseCategoryFilter(category: string): string[] {
    return category
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  private snapshot(product: ProductWithSubtypes): Record<string, unknown> {
    return {
      productId: product.productId,
      productType: product.productType,
      title: product.title,
      category: product.category,
      generalDescription: product.generalDescription,
      height: Number(product.height),
      width: Number(product.width),
      length: Number(product.length),
      weight: Number(product.weight),
      barcode: product.barcode,
      originalValue: Number(product.originalValue),
      currentPrice: Number(product.currentPrice),
      stockQuantity: Number(product.stockQuantity),
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      book: product.book ?? null,
      cd: product.cd ?? null,
      dvd: product.dvd ?? null,
      newspaper: product.newspaper ?? null,
    };
  }

  private async recordHistory(
    manager: EntityManager,
    values: Pick<
      ProductHistory,
      | 'productId'
      | 'performedBy'
      | 'actionType'
      | 'oldValueSnapshot'
      | 'newValueSnapshot'
      | 'reason'
    >,
  ): Promise<void> {
    const historyRepo = manager.getRepository(ProductHistory);
    await historyRepo.save(historyRepo.create(values));
  }

  private async countTodayDeleteActions(performedBy: string): Promise<number> {
    const { start, end } = this.getSaigonDayRange(new Date());

    return this.productHistoryRepository
      .createQueryBuilder('history')
      .where('history.performedBy = :performedBy', { performedBy })
      .andWhere('history.actionType IN (:...actionTypes)', {
        actionTypes: [
          ProductHistoryActionType.DELETE,
          ProductHistoryActionType.DEACTIVATE,
        ],
      })
      .andWhere('history.actionTime >= :start', { start })
      .andWhere('history.actionTime < :end', { end })
      .getCount();
  }

  private getSaigonDayRange(now: Date): { start: Date; end: Date } {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Saigon',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const [year, month, day] = formatter.format(now).split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, day) - 7 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }
}
