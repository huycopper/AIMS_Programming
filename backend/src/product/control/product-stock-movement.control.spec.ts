import { ConflictException } from '@nestjs/common';
import { ProductStockMovementControl } from './product-stock-movement.control.js';
import {
  Product,
  ProductStatus,
  ProductType,
} from '../entities/product.entity.js';
import {
  ProductHistory,
  ProductHistoryActionType,
} from '../entities/product-history.entity.js';

describe('ProductStockMovementControl', () => {
  const manager = {
    getRepository: jest.fn(),
  };
  const productRepo = {
    createQueryBuilder: jest.fn(),
    save: jest.fn(async (entity) => entity),
  };
  const historyRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (entity) => entity),
  };
  const productLockQueryBuilder = {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  let control: ProductStockMovementControl;

  beforeEach(() => {
    jest.clearAllMocks();
    productRepo.createQueryBuilder.mockReturnValue(productLockQueryBuilder);
    manager.getRepository.mockImplementation((entity) => {
      if (entity === Product) {
        return productRepo;
      }
      if (entity === ProductHistory) {
        return historyRepo;
      }
      return {};
    });
    control = new ProductStockMovementControl();
  });

  it('deducts aggregated approved order stock and records STOCK_ADJUST history', async () => {
    const product = makeProduct({ stockQuantity: 7 });
    productLockQueryBuilder.getOne.mockResolvedValue(product);

    const result = await control.deductForApprovedOrder(
      manager as any,
      {
        orderId: 'order-1',
        items: [
          {
            productId: 'product-1',
            productTitle: 'Book',
            quantity: 2,
          },
          {
            productId: 'product-1',
            productTitle: 'Book',
            quantity: 3,
          },
        ],
      },
      'manager-1',
    );

    expect(productLockQueryBuilder.setLock).toHaveBeenCalledWith(
      'pessimistic_write',
    );
    expect(product.stockQuantity).toBe(2);
    expect(productRepo.save).toHaveBeenCalledTimes(1);
    expect(historyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'product-1',
        performedBy: 'manager-1',
        actionType: ProductHistoryActionType.STOCK_ADJUST,
        reason: 'Order approved: order-1',
        oldValueSnapshot: expect.objectContaining({ stockQuantity: 7 }),
        newValueSnapshot: expect.objectContaining({ stockQuantity: 2 }),
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        productId: 'product-1',
        requested: 5,
        previousStock: 7,
        newStock: 2,
      }),
    ]);
  });

  it('blocks approval stock movement when any product is missing and changes nothing', async () => {
    productLockQueryBuilder.getOne.mockResolvedValue(null);

    await expect(
      control.deductForApprovedOrder(
        manager as any,
        {
          orderId: 'order-1',
          items: [
            {
              productId: 'missing-product',
              productTitle: 'Missing Book',
              quantity: 1,
            },
          ],
        },
        'manager-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(productRepo.save).not.toHaveBeenCalled();
    expect(historyRepo.save).not.toHaveBeenCalled();
  });

  it('blocks approval stock movement for inactive products', async () => {
    const product = makeProduct({
      status: ProductStatus.DEACTIVATED,
      stockQuantity: 10,
    });
    productLockQueryBuilder.getOne.mockResolvedValue(product);

    await expect(
      control.deductForApprovedOrder(
        manager as any,
        {
          orderId: 'order-1',
          items: [
            { productId: 'product-1', productTitle: 'Book', quantity: 1 },
          ],
        },
        'manager-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(product.stockQuantity).toBe(10);
    expect(productRepo.save).not.toHaveBeenCalled();
    expect(historyRepo.save).not.toHaveBeenCalled();
  });

  it('rolls back all stock changes when one product has insufficient stock', async () => {
    const enoughProduct = makeProduct({
      productId: 'product-1',
      title: 'Book A',
      stockQuantity: 5,
    });
    const lowProduct = makeProduct({
      productId: 'product-2',
      title: 'Book B',
      stockQuantity: 1,
    });
    productLockQueryBuilder.getOne
      .mockResolvedValueOnce(enoughProduct)
      .mockResolvedValueOnce(lowProduct);

    await expect(
      control.deductForApprovedOrder(
        manager as any,
        {
          orderId: 'order-1',
          items: [
            { productId: 'product-1', productTitle: 'Book A', quantity: 2 },
            { productId: 'product-2', productTitle: 'Book B', quantity: 2 },
          ],
        },
        'manager-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(enoughProduct.stockQuantity).toBe(5);
    expect(lowProduct.stockQuantity).toBe(1);
    expect(productRepo.save).not.toHaveBeenCalled();
    expect(historyRepo.save).not.toHaveBeenCalled();
  });

  function makeProduct(overrides: Partial<Product> = {}): Product {
    return {
      productId: 'product-1',
      productType: ProductType.BOOK,
      title: 'Book',
      category: 'Book',
      generalDescription: null,
      height: 1,
      width: 1,
      length: 1,
      weight: 1,
      barcode: 'barcode-1',
      originalValue: 50000,
      currentPrice: 50000,
      stockQuantity: 5,
      status: ProductStatus.ACTIVE,
      createdAt: new Date('2026-06-23T00:00:00Z'),
      updatedAt: new Date('2026-06-23T00:00:00Z'),
      ...overrides,
    } as Product;
  }
});
