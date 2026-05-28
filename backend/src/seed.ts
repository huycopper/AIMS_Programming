// file này dùng nạp dữ liệu seed
// dùng lệnh npm run seed để nạp dữ liệu từ file seed_50_products.sql
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  console.log('🔄 Đang khởi tạo ứng dụng NestJS...');
  // Tạo NestJS context nhưng không mở port web (chỉ chạy script)
  const app = await NestFactory.createApplicationContext(AppModule);

  console.log('📦 Đang lấy kết nối Database...');
  const dataSource = app.get(DataSource); // DataSource chứa config database

  // Đường dẫn trỏ tới file SQL
  const sqlPath = path.join(process.cwd(), 'seed_50_products.sql'); // đường dẫn tới file seed_50_products.sql
  // process.cwd() Trả về thư mục nơi bạn mở terminal và gõ lệnh chạy chương trình. Nó sẽ thay đổi nếu bạn thay đổi vị trí chạy lệnh.
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('🚀 Đang chạy script Seeding dữ liệu...');
  try {
    await dataSource.query(sql);
    console.log('✅ Đã đổ dữ liệu rác thành công vào Database!');
  } catch (error) {
    console.error('❌ Lỗi khi đổ dữ liệu:', error.message);
  } finally {
    // Đóng ứng dụng lại sau khi xong
    await app.close();
  }
}

bootstrap();
