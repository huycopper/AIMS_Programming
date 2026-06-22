// file này dùng nạp dữ liệu seed
// dùng lệnh npm run seed để nạp dữ liệu từ file seed_50_products.sql
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import {
  readStaffSeedConfig,
  seedStaffAccounts,
} from './auth/seed/staff-seed.js';

async function bootstrap() {
  console.log('🔄 Đang khởi tạo ứng dụng NestJS...');
  const app = await NestFactory.createApplicationContext(AppModule);

  console.log('📦 Đang lấy kết nối Database...');
  const dataSource = app.get(DataSource);

  const sqlPath = path.join(process.cwd(), 'seed_50_products.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('🚀 Đang chạy script Seeding dữ liệu sản phẩm...');
  try {
    await dataSource.query(sql);
    console.log('✅ Đã đổ dữ liệu sản phẩm thành công vào Database!');
  } catch (error) {
    console.error('❌ Lỗi khi đổ dữ liệu sản phẩm:', error.message);
  }

  console.log('🚀 Đang kiểm tra cấu hình seed nhân viên...');
  try {
    const config = readStaffSeedConfig(process.env);
    if (config) {
      console.log('🔄 Đang chạy script Seeding dữ liệu nhân viên...');
      await seedStaffAccounts(dataSource, config);
      console.log('✅ Đã đổ dữ liệu nhân viên thành công vào Database!');
    } else {
      console.log(
        'ℹ️ Bỏ qua seeding dữ liệu nhân viên (thiếu cấu hình môi trường/credentials).',
      );
    }
  } catch (error) {
    console.error('❌ Lỗi khi seeding nhân viên:', error.message);
  } finally {
    await app.close();
  }
}

bootstrap();
