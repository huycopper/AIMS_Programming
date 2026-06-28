import { ConflictException, Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Product, ProductStatus } from '../entities/product.entity.js';
import {
  ProductHistory,
  ProductHistoryActionType,
} from '../entities/product-history.entity.js';

export interface StockMovementItem {
  productId: string;
  productTitle?: string;
  quantity: number;
}

export interface StockMovementOrder {
  orderId: string;
  items?: StockMovementItem[];
}

export interface StockConflict {
  productId: string;
  title: string;
  requested: number;
  available: number;
}

export interface StockMovementResult {
  productId: string;
  title: string;
  requested: number;
  previousStock: number;
  newStock: number;
}

@Injectable()
export class ProductStockMovementControl {
  async deductForApprovedOrder(
    manager: EntityManager,
    order: StockMovementOrder,
    performedBy: string,
  ): Promise<StockMovementResult[]> {
    const quantities = this.aggregateOrderQuantities(order.items || []);
    const productRepo = manager.getRepository(Product);
    const historyRepo = manager.getRepository(ProductHistory);
    const products = new Map<string, Product>();
    const conflicts: StockConflict[] = [];

    for (const [productId, requested] of quantities) {
      const product = await this.findProductForStockUpdate(
        productRepo,
        productId,
      );

      if (!product) {
        conflicts.push({
          productId,
          title: this.orderItemTitle(order, productId),
          requested,
          available: 0,
        });
        continue;
      }

      products.set(productId, product);
      const available = Number(product.stockQuantity);
      if (product.status !== ProductStatus.ACTIVE || available < requested) {
        conflicts.push({
          productId,
          title: product.title,
          requested,
          available,
        });
      }
    }

    if (conflicts.length > 0) {
      throw new ConflictException({
        message: 'Insufficient or unavailable stock for order approval.',
        code: 'STOCK_CONFLICT',
        conflicts,
      });
    }

    const results: StockMovementResult[] = [];

    for (const [productId, requested] of quantities) {
      const product = products.get(productId)!;
      const oldSnapshot = this.productSnapshot(product);
      const previousStock = Number(product.stockQuantity);
      product.stockQuantity = previousStock - requested;
      await productRepo.save(product);

      const newSnapshot = this.productSnapshot(product);
      await historyRepo.save(
        historyRepo.create({
          productId,
          performedBy,
          actionType: ProductHistoryActionType.STOCK_ADJUST,
          oldValueSnapshot: oldSnapshot,
          newValueSnapshot: newSnapshot,
          reason: `Order approved: ${order.orderId}`,
        }),
      );

      results.push({
        productId,
        title: product.title,
        requested,
        previousStock,
        newStock: Number(product.stockQuantity),
      });
    }

    return results;
  }

  private aggregateOrderQuantities(
    items: StockMovementItem[],
  ): Map<string, number> {
    return items.reduce((map, item) => {
      map.set(
        item.productId,
        (map.get(item.productId) || 0) + Number(item.quantity),
      );
      return map;
    }, new Map<string, number>());
  }

  private async findProductForStockUpdate(
    productRepo: Repository<Product>,
    productId: string,
  ): Promise<Product | null> {
    return productRepo
      .createQueryBuilder('lockedProduct')
      .setLock('pessimistic_write')
      .where('lockedProduct.productId = :productId', { productId })
      .getOne();
  }

  private orderItemTitle(order: StockMovementOrder, productId: string): string {
    return (
      (order.items || []).find((item) => item.productId === productId)
        ?.productTitle || productId
    );
  }

  private productSnapshot(product: Product): Record<string, unknown> {
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
    };
  }
}
