import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity.js';

export enum ProductHistoryActionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  DEACTIVATE = 'DEACTIVATE',
  STOCK_ADJUST = 'STOCK_ADJUST',
}

@Entity('product_histories')
export class ProductHistory {
  @PrimaryGeneratedColumn('uuid', { name: 'history_id' })
  historyId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'performed_by', type: 'uuid' })
  performedBy: string;

  @Column({
    name: 'action_type',
    type: 'enum',
    enum: ProductHistoryActionType,
  })
  actionType: ProductHistoryActionType;

  @CreateDateColumn({ name: 'action_time', type: 'timestamp' })
  actionTime: Date;

  @Column({ name: 'old_value_snapshot', type: 'jsonb', nullable: true })
  oldValueSnapshot: Record<string, unknown> | null;

  @Column({ name: 'new_value_snapshot', type: 'jsonb', nullable: true })
  newValueSnapshot: Record<string, unknown> | null;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason: string | null;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
