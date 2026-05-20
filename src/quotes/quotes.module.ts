import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { forwardRef } from '@nestjs/common';
// import { Quote } from './quote.entity';
import { Quote } from './entities/quote.entity';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { TemplatesModule } from '../templates/templates.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quote]),
    TemplatesModule,
    forwardRef(() => PdfModule),
  ],
  providers: [QuotesService],
  controllers: [QuotesController],
  exports: [QuotesService],
})
export class QuotesModule {}