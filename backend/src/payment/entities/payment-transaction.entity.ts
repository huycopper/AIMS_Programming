import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../order/entities/order.entity.js';

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid', { name: 'transaction_id' })
  paymentTransactionId: string;

  /*
   * The current codebase has not introduced a persisted Invoice entity yet.
   * Until that exists, VietQR payments stay linked to orders while all payment
   * transaction columns follow the approved payment_transactions contract.
   */
  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'transaction_content', type: 'text', nullable: true })
  transactionContent: string | null;

  @Column({ name: 'transaction_datetime', type: 'timestamp' })
  transactionDatetime: Date;

  @Column({ name: 'amount', type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'PENDING' })
  status: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 50 })
  paymentMethod: string;

  @Column({ name: 'error_code', type: 'varchar', length: 100, nullable: true })
  errorCode: string | null;

  @Column({ name: 'gateway_transaction_ref', type: 'varchar', length: 255, nullable: true })
  gatewayTransactionRef: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  get transactionRef(): string | null {
    return this.gatewayTransactionRef;
  }

  set transactionRef(value: string | null) {
    this.gatewayTransactionRef = value;
  }
}
