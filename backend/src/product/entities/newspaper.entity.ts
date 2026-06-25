import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity.js';

/**
 * Newspaper entity — maps exactly to the `newspapers` table
 * as defined in DatabaseDescription.md.
 */
@Entity('newspapers')
export class Newspaper {
  @PrimaryColumn('uuid', { name: 'product_id' })
  productId: string;

  @Column({ name: 'editor_in_chief', type: 'varchar', length: 255 })
  editorInChief: string;

  @Column({ name: 'publisher', type: 'varchar', length: 255 })
  publisher: string;

  @Column({ name: 'publication_date', type: 'date' })
  publicationDate: Date;

  @Column({
    name: 'issue_number',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  issueNumber: string | null;

  @Column({
    name: 'publication_frequency',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  publicationFrequency: string | null;

  @Column({ name: 'issn', type: 'varchar', length: 100, nullable: true })
  issn: string | null;

  @Column({ name: 'language', type: 'varchar', length: 100, nullable: true })
  language: string | null;

  @Column({ name: 'sections', type: 'jsonb', nullable: true })
  sections: string[] | null;

  @OneToOne(() => Product, (product) => product.newspaper, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
