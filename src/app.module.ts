import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TemplatesModule } from './templates/templates.module';
import { QuotesModule } from './quotes/quotes.module';
import { User } from './users/user.entity';
import { PricingTemplate } from './templates/template.entity';
import { Quote } from './quotes/quote.entity';
import { PdfModule } from './pdf/pdf.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DB_PATH || './fencing.sqlite',
      entities: [User, PricingTemplate, Quote],
      synchronize: true, // auto-migrate in dev; use migrations in prod
    }),
    AuthModule,
    UsersModule,
    TemplatesModule,
    QuotesModule,
    PdfModule,
  ],
})
export class AppModule {}