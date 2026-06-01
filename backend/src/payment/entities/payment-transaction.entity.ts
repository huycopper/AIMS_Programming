import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from '../../order/entities/order.entity.js';

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid', { name: 'payment_transaction_id' })
  paymentTransactionId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'transaction_ref', type: 'varchar', length: 255, nullable: true })
  transactionRef: string;

  @Column({ name: 'amount', type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column({ name: 'payment_method', type: 'varchar', length: 50 })
  paymentMethod: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 50,
    default: 'PENDING',
  })
  status: string;

  @Column({ name: 'payment_details', type: 'json', nullable: true })
  paymentDetails: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
