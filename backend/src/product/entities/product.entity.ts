import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { Book } from './book.entity.js';
import { Cd } from './cd.entity.js';
import { Dvd } from './dvd.entity.js';
import { Newspaper } from './newspaper.entity.js';
import { ColumnNumericTransformer } from '../../utils/column-numeric-transformer.js';

/**
 * Product entity — maps exactly to the `products` table
 * as defined in DatabaseDescription.md.
 *
 * Constraints:
 * - CHECK (height >= 0 AND width >= 0 AND length >= 0 AND weight >= 0)
 * - CHECK (original_value >= 0)
 * - CHECK (current_price >= 0)
 * - CHECK (current_price >= original_value * 0.30)
 * - CHECK (current_price <= original_value * 1.50)
 * - CHECK (stock_quantity >= 0)
 * - CHECK (status <> 'DELETED' OR stock_quantity = 0)
 */

export enum ProductType {
  BOOK = 'BOOK',
  CD = 'CD',
  DVD = 'DVD',
  NEWSPAPER = 'NEWSPAPER',
}

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVATED = 'DEACTIVATED',
  DELETED = 'DELETED',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid', { name: 'product_id' })
  productId: string;

  @Column({
    name: 'product_type',
    type: 'enum',
    enum: ProductType,
  })
  productType: ProductType;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'category', type: 'varchar', length: 100 })
  category: string;

  @Column({ name: 'general_description', type: 'text', nullable: true })
  generalDescription: string | null;

  @Column({ name: 'height', type: 'numeric', precision: 10, scale: 2, transformer: new ColumnNumericTransformer() })
  height: number;

  @Column({ name: 'width', type: 'numeric', precision: 10, scale: 2, transformer: new ColumnNumericTransformer() })
  width: number;

  @Column({ name: 'length', type: 'numeric', precision: 10, scale: 2, transformer: new ColumnNumericTransformer() })
  length: number;

  @Column({ name: 'weight', type: 'numeric', precision: 10, scale: 2, transformer: new ColumnNumericTransformer() })
  weight: number;

  @Column({ name: 'barcode', type: 'varchar', length: 100, unique: true })
  barcode: string;

  @Column({ name: 'original_value', type: 'numeric', precision: 14, scale: 2, transformer: new ColumnNumericTransformer() })
  originalValue: number;

  @Column({ name: 'current_price', type: 'numeric', precision: 14, scale: 2, transformer: new ColumnNumericTransformer() })
  currentPrice: number;

  @Column({ name: 'stock_quantity', type: 'int' })
  stockQuantity: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
  })
  status: ProductStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  // Relations to sub-type tables
  @OneToOne(() => Book, (book) => book.product, { eager: true, nullable: true })
  book?: Book;

  @OneToOne(() => Cd, (cd) => cd.product, { eager: true, nullable: true })
  cd?: Cd;

  @OneToOne(() => Dvd, (dvd) => dvd.product, { eager: true, nullable: true })
  dvd?: Dvd;

  @OneToOne(() => Newspaper, (newspaper) => newspaper.product, {
    eager: true,
    nullable: true,
  })
  newspaper?: Newspaper;
}
