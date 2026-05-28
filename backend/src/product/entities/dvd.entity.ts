import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity.js';

/**
 * DVD entity — maps exactly to the `dvds` table
 * as defined in DatabaseDescription.md.
 */
@Entity('dvds')
export class Dvd {
  @PrimaryColumn('uuid', { name: 'product_id' })
  productId: string;

  @Column({ name: 'disc_type', type: 'varchar', length: 50 })
  discType: string; // BLU_RAY or HD_DVD

  @Column({ name: 'director', type: 'varchar', length: 255 })
  director: string;

  @Column({ name: 'runtime', type: 'int' })
  runtime: number;

  @Column({ name: 'studio', type: 'varchar', length: 255 })
  studio: string;

  @Column({ name: 'language', type: 'varchar', length: 100 })
  language: string;

  @Column({ name: 'subtitles', type: 'jsonb' })
  subtitles: string[];

  @Column({ name: 'release_date', type: 'date', nullable: true })
  releaseDate: Date | null;

  @Column({ name: 'genre', type: 'varchar', length: 100, nullable: true })
  genre: string | null;

  @OneToOne(() => Product, (product) => product.dvd, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
