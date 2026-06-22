import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductController } from './product.controller.js';
import { ProductService } from './product.service.js';
import { Product } from './entities/product.entity.js';
import { Book } from './entities/book.entity.js';
import { Cd } from './entities/cd.entity.js';
import { Dvd } from './entities/dvd.entity.js';
import { Newspaper } from './entities/newspaper.entity.js';
import { ProductHistory } from './entities/product-history.entity.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Book,
      Cd,
      Dvd,
      Newspaper,
      ProductHistory,
    ]),
    AuthModule,
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
