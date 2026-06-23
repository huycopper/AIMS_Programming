import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module.js';
import {
  readStaffSeedConfig,
  seedStaffAccounts,
} from './auth/seed/staff-seed.js';

async function bootstrap() {
  console.log('Starting NestJS application context for staff seeding...');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const dataSource = app.get(DataSource);
    const config = readStaffSeedConfig(process.env);

    if (!config) {
      throw new Error(
        'Missing staff seed configuration. Set all six SEED_* staff credential variables before running seed:staff.',
      );
    }

    console.log('Seeding staff accounts...');
    await seedStaffAccounts(dataSource, config);
    console.log('Staff accounts seeded successfully.');
  } catch (error: any) {
    console.error('Failed to seed staff accounts:', error.message);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
