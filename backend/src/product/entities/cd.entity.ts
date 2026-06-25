import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity.js';

/**
 * CD entity — maps exactly to the `cds` table
 * as defined in DatabaseDescription.md.
 */
@Entity('cds')
export class Cd {
  @PrimaryColumn('uuid', { name: 'product_id' })
  productId: string;

  @Column({ name: 'artists', type: 'jsonb' })
  artists: string[];

  @Column({ name: 'record_label', type: 'varchar', length: 255 })
  recordLabel: string;

  @Column({ name: 'tracks', type: 'jsonb' })
  tracks: Array<{ title: string; length?: string }>;

  @Column({ name: 'genre', type: 'varchar', length: 100 })
  genre: string;

  @Column({ name: 'release_date', type: 'date', nullable: true })
  releaseDate: Date | null;

  @OneToOne(() => Product, (product) => product.cd, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
