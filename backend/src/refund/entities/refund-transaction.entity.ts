import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { PaymentTransaction } from '../../payment/entities/payment-transaction.entity.js';

@Entity('refund_transactions')
export class RefundTransaction {
  @PrimaryGeneratedColumn('uuid', { name: 'refund_transaction_id' })
  refundTransactionId: string;

  @OneToOne(() => PaymentTransaction)
  @JoinColumn({ name: 'payment_transaction_id' })
  paymentTransaction: PaymentTransaction;

  @Column({ name: 'refund_amount', type: 'numeric', precision: 14, scale: 2 })
  refundAmount: number;

  @Column({ name: 'refund_reason', type: 'text', nullable: true })
  refundReason: string;

  @Column({ name: 'refund_datetime', type: 'timestamp' })
  refundDatetime: Date;

  @Column({
    name: 'refund_status',
    type: 'varchar',
    length: 50,
  })
  refundStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'MANUAL_REQUIRED';

  @Column({
    name: 'refund_method',
    type: 'varchar',
    length: 50,
  })
  refundMethod: 'PAYPAL_API' | 'MANUAL_BANK_TRANSFER';

  @Column({ name: 'manual_refund_note', type: 'text', nullable: true })
  manualRefundNote: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
