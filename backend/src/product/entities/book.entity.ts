import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity.js';

/**
 * Book entity — maps exactly to the `books` table
 * as defined in DatabaseDescription.md.
 */
@Entity('books')
export class Book {
  @PrimaryColumn('uuid', { name: 'product_id' })
  productId: string;

  @Column({ name: 'authors', type: 'jsonb' })
  authors: string[];

  @Column({ name: 'cover_type', type: 'varchar', length: 50 })
  coverType: string; // PAPERBACK or HARDCOVER

  @Column({ name: 'publisher', type: 'varchar', length: 255 })
  publisher: string;

  @Column({ name: 'publication_date', type: 'date' })
  publicationDate: Date;

  @Column({ name: 'number_of_pages', type: 'int', nullable: true })
  numberOfPages: number | null;

  @Column({ name: 'language', type: 'varchar', length: 100, nullable: true })
  language: string | null;

  @Column({ name: 'genre', type: 'varchar', length: 100, nullable: true })
  genre: string | null;

  @OneToOne(() => Product, (product) => product.book, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
