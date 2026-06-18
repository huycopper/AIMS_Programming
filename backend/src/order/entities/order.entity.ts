import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

/**
 * DeliveryInfo entity — stores customer delivery information for an order.
 * Maps to the BCE Entity layer for the Place Order use case.
 */
@Entity('delivery_info')
export class DeliveryInfo {
  @PrimaryGeneratedColumn('uuid', { name: 'delivery_info_id' })
  deliveryInfoId: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'phone', type: 'varchar', length: 20 })
  phone: string;

  @Column({ name: 'email', type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'province', type: 'varchar', length: 100 })
  province: string;

  @Column({ name: 'address', type: 'text' })
  address: string;

  @Column({ name: 'note', type: 'text', nullable: true })
  note: string | null;
}

/**
 * Order entity — represents a customer order in the AIMS system.
 * Links to DeliveryInfo and contains order-level totals.
 */
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid', { name: 'order_id' })
  orderId: string;

  @OneToOne(() => DeliveryInfo, { eager: true, cascade: true })
  @JoinColumn({ name: 'delivery_info_id' })
  deliveryInfo: DeliveryInfo;

  @Column({ name: 'subtotal', type: 'numeric', precision: 14, scale: 2 })
  subtotal: number;

  @Column({ name: 'vat', type: 'numeric', precision: 14, scale: 2 })
  vat: number;

  @Column({ name: 'shipping_fee', type: 'numeric', precision: 14, scale: 2 })
  shippingFee: number;

  @Column({ name: 'total_amount', type: 'numeric', precision: 14, scale: 2 })
  totalAmount: number;

  @Column({ name: 'total_weight', type: 'numeric', precision: 10, scale: 2 })
  totalWeight: number;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 50,
    default: 'PENDING',
  })
  status: string;

  @OneToMany(() => OrderItem, (item) => item.order, {
    eager: true,
    cascade: true,
  })
  items: OrderItem[];

  @Column({
    name: 'order_view_token',
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: true,
  })
  orderViewToken: string;

  @Column({
    name: 'cancel_token',
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: true,
  })
  cancelToken: string;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}

/**
 * OrderItem entity — represents a single line item within an order.
 */
import { ManyToOne } from 'typeorm';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid', { name: 'order_item_id' })
  orderItemId: string;

  @ManyToOne(() => Order, (order) => order.items)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'product_title', type: 'varchar', length: 255 })
  productTitle: string;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 14, scale: 2 })
  unitPrice: number;

  @Column({ name: 'weight', type: 'numeric', precision: 10, scale: 2 })
  weight: number;
}
