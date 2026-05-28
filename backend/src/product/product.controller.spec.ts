import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductStatus, ProductType } from './entities/product.entity';

/**
 * Unit tests for ProductController (Boundary class — BCE pattern).
 * Verifies correct delegation to ProductService and correct response structure.
 */
describe('ProductController', () => {
  let controller: ProductController;
  let service: ProductService;

  const mockProduct = {
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
  };

  const mockProductService = {
    findRandom: jest.fn(),
    searchProducts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /api/products/random', () => {
    it('should return 20 random products (AC-1)', async () => {
      const products = Array.from({ length: 20 }, (_, i) => ({
        ...mockProduct,
        productId: `uuid-${i}`,
      }));
      mockProductService.findRandom.mockResolvedValue(products);

      const result = await controller.getRandomProducts();

      expect(result).toHaveLength(20);
      expect(mockProductService.findRandom).toHaveBeenCalledWith(20);
    });
  });

  describe('GET /api/products', () => {
    it('should search products with query params (AC-2)', async () => {
      const searchResult = {
        data: [mockProduct],
        total: 1,
        page: 1,
        limit: 20,
      };
      mockProductService.searchProducts.mockResolvedValue(searchResult);

      const dto = { search: 'test', page: 1, limit: 20 };
      const result = await controller.searchProducts(dto);

      expect(result).toEqual(searchResult);
      expect(mockProductService.searchProducts).toHaveBeenCalledWith(dto);
    });

    it('should support price range filtering', async () => {
      const searchResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      };
      mockProductService.searchProducts.mockResolvedValue(searchResult);

      const dto = { minPrice: 50000, maxPrice: 200000, page: 1, limit: 20 };
      const result = await controller.searchProducts(dto);

      expect(result.data).toEqual([]);
      expect(mockProductService.searchProducts).toHaveBeenCalledWith(dto);
    });
  });
});
