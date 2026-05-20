import { Module, forwardRef } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';
import { QuotesModule } from '../quotes/quotes.module';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [
    forwardRef(() => QuotesModule),
    TemplatesModule,
  ],
  providers: [PdfService],
  controllers: [PdfController],
  exports: [PdfService],
})
export class PdfModule {}