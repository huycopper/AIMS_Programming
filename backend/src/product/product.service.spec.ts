import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product, ProductStatus, ProductType } from './entities/product.entity';
import { Repository, SelectQueryBuilder } from 'typeorm';

/**
 * Unit tests for ProductService (Control class — BCE pattern).
 * Tests AC-1 (random products) and AC-2 (search/filter) endpoints.
 */
describe('ProductService', () => {
  let service: ProductService;
  let repo: Repository<Product>;

  // Mock query builder
  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getCount: jest.fn(),
  };

  const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
    productId: 'uuid-1',
    productType: ProductType.BOOK,
    title: 'Test Book',
    category: 'Fiction',
    generalDescription: 'A test book',
    height: 20,
    width: 15,
    length: 3,
    weight: 0.5,
    barcode: '1234567890',
    originalValue: 100000,
    currentPrice: 120000,
    stockQuantity: 10,
    status: ProductStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    repo = module.get<Repository<Product>>(getRepositoryToken(Product));

    // Reset all mocks
    Object.values(mockQueryBuilder).forEach((fn) => fn.mockClear());
    // Re-set return values
    mockQueryBuilder.leftJoinAndSelect.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.andWhere.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.limit.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.skip.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.take.mockReturnValue(mockQueryBuilder);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findRandom (AC-1)', () => {
    it('should return 20 random ACTIVE products', async () => {
      const mockProducts = Array.from({ length: 20 }, (_, i) =>
        createMockProduct({ productId: `uuid-${i}` }),
      );
      mockQueryBuilder.getMany.mockResolvedValue(mockProducts);

      const result = await service.findRandom(20);

      expect(result).toHaveLength(20);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'product.status = :status',
        { status: ProductStatus.ACTIVE },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('RANDOM()');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
    });

    it('should join all sub-type tables (book, cd, dvd, newspaper)', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findRandom(20);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.book',
        'book',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.cd',
        'cd',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.dvd',
        'dvd',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.newspaper',
        'newspaper',
      );
    });
  });

  describe('searchProducts (AC-2)', () => {
    it('should filter by search query on title and category (ILIKE)', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(5);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.searchProducts({ search: 'Harry' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(product.title ILIKE :search OR product.category ILIKE :search)',
        { search: '%Harry%' },
      );
    });

    it('should filter by exact category', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(3);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.searchProducts({ category: 'Fiction' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.category = :category',
        { category: 'Fiction' },
      );
    });

    it('should filter by price range (minPrice / maxPrice)', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(2);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.searchProducts({
        minPrice: 50000,
        maxPrice: 200000,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.currentPrice >= :minPrice',
        { minPrice: 50000 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.currentPrice <= :maxPrice',
        { maxPrice: 200000 },
      );
    });

    it('should return paginated results with total count', async () => {
      const mockProducts = [createMockProduct()];
      mockQueryBuilder.getCount.mockResolvedValue(50);
      mockQueryBuilder.getMany.mockResolvedValue(mockProducts);

      const result = await service.searchProducts({
        search: 'test',
        page: 2,
        limit: 10,
      });

      expect(result).toEqual({
        data: mockProducts,
        total: 50,
        page: 2,
        limit: 10,
      });
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10); // (2-1) * 10
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should default to page 1 and limit 20 if not specified', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.searchProducts({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should only return ACTIVE products', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.searchProducts({});

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'product.status = :status',
        { status: ProductStatus.ACTIVE },
      );
    });
  });
});
