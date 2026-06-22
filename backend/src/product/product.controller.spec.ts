import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductStatus, ProductType } from './entities/product.entity';

describe('ProductController', () => {
  let controller: ProductController;

  const managerId = '11111111-1111-4111-8111-111111111111';
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
    findAdminProducts: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
    bulkDeleteProducts: jest.fn(),
    getProductHistories: jest.fn(),
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns 20 random public products', async () => {
    const products = Array.from({ length: 20 }, (_, i) => ({
      ...mockProduct,
      productId: `uuid-${i}`,
    }));
    mockProductService.findRandom.mockResolvedValue(products);

    const result = await controller.getRandomProducts();

    expect(result).toHaveLength(20);
    expect(mockProductService.findRandom).toHaveBeenCalledWith(20, undefined);
  });

  it('delegates public search params without manager identity', async () => {
    const searchResult = { data: [mockProduct], total: 1, page: 1, limit: 20 };
    mockProductService.searchProducts.mockResolvedValue(searchResult);

    const dto = { search: 'test', page: 1, limit: 20 };
    const result = await controller.searchProducts(dto);

    expect(result).toEqual(searchResult);
    expect(mockProductService.searchProducts).toHaveBeenCalledWith(dto);
  });

  it('passes temporary Product Manager identity to admin list', async () => {
    const searchResult = { data: [mockProduct], total: 1, page: 1, limit: 20 };
    mockProductService.findAdminProducts.mockResolvedValue(searchResult);

    await controller.getAdminProducts(managerId, { page: 1, limit: 20 });

    expect(mockProductService.findAdminProducts).toHaveBeenCalledWith(
      { page: 1, limit: 20 },
      managerId,
    );
  });

  it('passes one create product payload and manager identity', async () => {
    const dto = {
      productType: ProductType.BOOK,
      title: 'New Book',
      category: 'Books',
      height: 1,
      width: 1,
      length: 1,
      weight: 1,
      barcode: 'BC-1',
      originalValue: 100,
      currentPrice: 100,
      stockQuantity: 3,
      book: {
        authors: ['Author'],
        coverType: 'PAPERBACK',
        publisher: 'Publisher',
        publicationDate: '2026-01-01',
      },
    } as any;
    mockProductService.createProduct.mockResolvedValue(mockProduct);

    await controller.createProduct(managerId, dto);

    expect(mockProductService.createProduct).toHaveBeenCalledWith(
      dto,
      managerId,
    );
  });

  it('passes bulk delete request to service', async () => {
    const dto = { productIds: ['11111111-1111-4111-8111-111111111111'] };
    const response = {
      results: [{ productId: dto.productIds[0], status: 'DELETED' }],
    };
    mockProductService.bulkDeleteProducts.mockResolvedValue(response);

    const result = await controller.bulkDeleteProducts(managerId, dto);

    expect(result).toEqual(response);
    expect(mockProductService.bulkDeleteProducts).toHaveBeenCalledWith(
      dto,
      managerId,
    );
  });
});
