import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProductService } from './product.service';
import { Product, ProductStatus, ProductType } from './entities/product.entity';
import { Book } from './entities/book.entity';
import { Cd } from './entities/cd.entity';
import { Dvd } from './entities/dvd.entity';
import { Newspaper } from './entities/newspaper.entity';
import {
  ProductHistory,
  ProductHistoryActionType,
} from './entities/product-history.entity';

describe('ProductService', () => {
  let service: ProductService;
  let productRepository: any;
  let historyRepository: any;
  let dataSource: any;
  let manager: any;
  let txProductRepository: any;
  let txHistoryRepository: any;
  const managerId = '11111111-1111-4111-8111-111111111111';

  const queryBuilder = {
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

  const historyQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getCount: jest.fn(),
  };

  const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
    productId: '22222222-2222-4222-8222-222222222222',
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
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  const validCreateDto = () =>
    ({
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
    }) as any;

  beforeEach(() => {
    Object.values(queryBuilder).forEach((fn: any) => fn.mockClear());
    Object.values(historyQueryBuilder).forEach((fn: any) => fn.mockClear());
    queryBuilder.leftJoinAndSelect.mockReturnValue(queryBuilder);
    queryBuilder.where.mockReturnValue(queryBuilder);
    queryBuilder.andWhere.mockReturnValue(queryBuilder);
    queryBuilder.orderBy.mockReturnValue(queryBuilder);
    queryBuilder.limit.mockReturnValue(queryBuilder);
    queryBuilder.skip.mockReturnValue(queryBuilder);
    queryBuilder.take.mockReturnValue(queryBuilder);
    historyQueryBuilder.where.mockReturnValue(historyQueryBuilder);
    historyQueryBuilder.andWhere.mockReturnValue(historyQueryBuilder);
    historyQueryBuilder.orderBy.mockReturnValue(historyQueryBuilder);
    historyQueryBuilder.getCount.mockResolvedValue(0);

    productRepository = {
      createQueryBuilder: jest.fn(() => queryBuilder),
    };
    historyRepository = {
      createQueryBuilder: jest.fn(() => historyQueryBuilder),
    };
    txProductRepository = {
      create: jest.fn((value) => ({
        productId: '33333333-3333-4333-8333-333333333333',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        ...value,
      })),
      save: jest.fn(async (value) => value),
      findOne: jest.fn(),
      merge: jest.fn((target, value) => Object.assign(target, value)),
    };
    txHistoryRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const subtypeRepository = {
      save: jest.fn(async (value) => value),
      delete: jest.fn(async () => ({ affected: 1 })),
    };
    manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Product) {
          return txProductRepository;
        }
        if (entity === ProductHistory) {
          return txHistoryRepository;
        }
        if ([Book, Cd, Dvd, Newspaper].includes(entity)) {
          return subtypeRepository;
        }
        return {};
      }),
    };
    dataSource = {
      query: jest.fn().mockResolvedValue([{ user_id: managerId }]),
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    service = new ProductService(
      productRepository,
      historyRepository,
      dataSource as DataSource,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('keeps public random products limited to ACTIVE rows with subtype joins', async () => {
    const products = [createMockProduct()];
    queryBuilder.getMany.mockResolvedValue(products);

    const result = await service.findRandom(20);

    expect(result).toEqual(products);
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'product.status = :status',
      { status: ProductStatus.ACTIVE },
    );
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'product.book',
      'book',
    );
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'product.cd',
      'cd',
    );
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'product.dvd',
      'dvd',
    );
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'product.newspaper',
      'newspaper',
    );
  });

  it('keeps public search limited to ACTIVE rows and category matches category field', async () => {
    queryBuilder.getCount.mockResolvedValue(1);
    queryBuilder.getMany.mockResolvedValue([createMockProduct()]);

    await service.searchProducts({ category: 'Fiction', page: 1, limit: 20 });

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'product.status = :status',
      { status: ProductStatus.ACTIVE },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'product.category = :category',
      { category: 'Fiction' },
    );
  });

  it('rejects current price outside 30%-150% original value', async () => {
    await expect(
      service.createProduct(
        { ...validCreateDto(), currentPrice: 151 },
        managerId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects subtype payloads that do not match productType', async () => {
    const dto = validCreateDto();
    delete dto.book;
    dto.cd = {
      artists: ['Artist'],
      recordLabel: 'Label',
      tracks: [{ title: 'Track' }],
      genre: 'Pop',
    };

    await expect(service.createProduct(dto, managerId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('creates product, matching subtype, and CREATE history in one transaction', async () => {
    const saved = createMockProduct({
      productId: '33333333-3333-4333-8333-333333333333',
      book: { authors: ['Author'] } as any,
    });
    txProductRepository.findOne.mockResolvedValue(saved);

    const result = await service.createProduct(validCreateDto(), managerId);

    expect(result).toEqual(saved);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(txHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: saved.productId,
        performedBy: managerId,
        actionType: ProductHistoryActionType.CREATE,
        oldValueSnapshot: null,
        newValueSnapshot: expect.objectContaining({
          productId: saved.productId,
        }),
      }),
    );
  });

  it('requires an explicit reason when stockQuantity changes', async () => {
    txProductRepository.findOne.mockResolvedValue(createMockProduct());

    await expect(
      service.updateProduct(
        '22222222-2222-4222-8222-222222222222',
        { stockQuantity: 9 },
        managerId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records UPDATE and STOCK_ADJUST histories when stock changes with reason', async () => {
    const before = createMockProduct({ stockQuantity: 10 });
    const after = createMockProduct({ stockQuantity: 9 });
    txProductRepository.findOne
      .mockResolvedValueOnce(before)
      .mockResolvedValueOnce(after);

    await service.updateProduct(
      before.productId,
      { stockQuantity: 9, stockAdjustmentReason: 'Damaged item' },
      managerId,
    );

    expect(txHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: ProductHistoryActionType.UPDATE }),
    );
    expect(txHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: ProductHistoryActionType.STOCK_ADJUST,
        reason: 'Damaged item',
      }),
    );
  });

  it('rejects bulk delete requests above 10 product ids', async () => {
    const productIds = Array.from(
      { length: 11 },
      (_, index) =>
        `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
    );

    await expect(
      service.bulkDeleteProducts({ productIds }, managerId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects bulk delete requests that exceed daily count of 20', async () => {
    historyQueryBuilder.getCount.mockResolvedValue(19);
    const productIds = [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ];

    await expect(
      service.bulkDeleteProducts({ productIds }, managerId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deactivates stock-positive products and marks zero-stock products deleted', async () => {
    const stocked = createMockProduct({
      productId: '11111111-1111-4111-8111-111111111111',
      stockQuantity: 5,
    });
    const stockedAfter = createMockProduct({
      ...stocked,
      status: ProductStatus.DEACTIVATED,
    });
    const zeroStock = createMockProduct({
      productId: '22222222-2222-4222-8222-222222222222',
      stockQuantity: 0,
    });
    const zeroAfter = createMockProduct({
      ...zeroStock,
      status: ProductStatus.DELETED,
    });
    txProductRepository.findOne
      .mockResolvedValueOnce(stocked)
      .mockResolvedValueOnce(stockedAfter)
      .mockResolvedValueOnce(zeroStock)
      .mockResolvedValueOnce(zeroAfter);

    const result = await service.bulkDeleteProducts(
      { productIds: [stocked.productId, zeroStock.productId] },
      managerId,
    );

    expect(result.results).toEqual([
      expect.objectContaining({ status: 'DEACTIVATED' }),
      expect.objectContaining({ status: 'DELETED' }),
    ]);
    expect(txHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: ProductHistoryActionType.DEACTIVATE,
      }),
    );
    expect(txHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: ProductHistoryActionType.DELETE }),
    );
  });

  it('queries histories by product with action and date filters', async () => {
    const histories = [
      {
        historyId: 'h1',
        productId: 'p1',
        actionType: ProductHistoryActionType.UPDATE,
      },
    ];
    historyQueryBuilder.getMany.mockResolvedValue(histories);

    const result = await service.getProductHistories(
      'p1',
      {
        actionType: ProductHistoryActionType.UPDATE,
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
      },
      managerId,
    );

    expect(result).toEqual(histories);
    expect(historyQueryBuilder.where).toHaveBeenCalledWith(
      'history.productId = :productId',
      { productId: 'p1' },
    );
    expect(historyQueryBuilder.andWhere).toHaveBeenCalledWith(
      'history.actionType = :actionType',
      { actionType: ProductHistoryActionType.UPDATE },
    );
  });
});
