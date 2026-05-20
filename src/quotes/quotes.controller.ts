import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  Res,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { QuotesService, CreateQuoteDto, CalculateDto } from './quotes.service';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
// import { RolesGuard } from '../auth/roles.guard';
import { RolesGuard } from 'src/jwt/jwt-auth.guard';
// import { Roles } from '../auth/roles.decorator';
import { Roles } from 'src/jwt/jwt-auth.guard';
// import { UserRole } from '../users/user.entity';
import { UserRole } from 'src/users/entities/user.entity';
// import { QuoteStatus } from './quote.entity';
import { QuoteStatus } from './entities/quote.entity';
import { PdfService } from '../pdf/pdf.service';
import { TemplatesService } from '../templates/templates.service';
import { calculateMaterials, sqmToMetres, SqmConversion } from './calculation.engine';

@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly pdfService: PdfService,
    private readonly templatesService: TemplatesService,
  ) {}

  /** POST /api/quotes/calculate — live calculation, nothing saved */
  @Post('calculate')
  calculate(@Body() dto: CalculateDto) {
    return this.quotesService.calculate(dto);
  }

  /** POST /api/quotes — save a quote */
  @Post()
  create(@Body() dto: CreateQuoteDto, @Request() req) {
    return this.quotesService.create(dto, req.user.sub);
  }

  /** GET /api/quotes — list (admin sees all; user sees own) */
  @Get()
  findAll(@Request() req) {
    return this.quotesService.findAll(req.user.sub, req.user.role);
  }

  /** GET /api/quotes/:id */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.quotesService.findOne(id, req.user.sub, req.user.role);
  }

  /** PATCH /api/quotes/:id/status — admin only */
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: QuoteStatus,
  ) {
    return this.quotesService.updateStatus(id, status);
  }

  /** GET /api/quotes/:id/pdf — download PDF for a saved quote */
  @Get(':id/pdf')
  async downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Res() res: Response,
  ) {
    const quote = await this.quotesService.findOne(id, req.user.sub, req.user.role);
    const { calc, sqmInfo, template } = JSON.parse(quote.calculationJson);

    const createdAt = new Date(quote.createdAt);
    const validDate = new Date(createdAt);
    validDate.setDate(validDate.getDate() + (template.quoteValidity || 30));

    const buffer = await this.pdfService.generatePdfBuffer({
      quoteNumber: quote.quoteNumber,
      date:        createdAt.toLocaleDateString('en-GB'),
      validUntil:  validDate.toLocaleDateString('en-GB'),
      client: {
        name:        quote.clientName    || '',
        address:     quote.clientAddress || '',
        phone:       quote.clientPhone   || '',
        email:       quote.clientEmail   || '',
        projectSite: quote.projectSite   || '',
      },
      metres:  quote.metres,
      height:  quote.height,
      sqm:     quote.sqm,
      sqmInfo: sqmInfo ?? undefined,
      calc,
      template,
    });

    const isPdf = buffer.length > 4 && buffer[0] === 0x25 && buffer[1] === 0x50;
    const ext   = isPdf ? 'pdf' : 'html';
    res.setHeader('Content-Type', isPdf ? 'application/pdf' : 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Quote_${quote.quoteNumber}.${ext}"`);
    res.setHeader('Content-Length', buffer.length);
    res.status(HttpStatus.OK).send(buffer);
  }

  /** POST /api/quotes/preview-pdf — generate PDF without saving */
  @Post('preview-pdf')
  async previewPdf(@Body() dto: CreateQuoteDto, @Request() req, @Res() res: Response) {
    const template = await this.templatesService.findActive();

    let metres: number;
    let sqmInfo: SqmConversion | undefined;

    if (dto.sqm && !dto.metres) {
      const conv = sqmToMetres(dto.sqm);
      sqmInfo = conv;
      metres  = conv.perimeter;
    } else {
      metres = dto.metres as number;
    }

    const calc        = calculateMaterials(metres, dto.height, template);
    const quoteNumber = `FP-${Date.now().toString().slice(-7)}`;
    const now         = new Date();
    const validDate   = new Date(now);
    validDate.setDate(validDate.getDate() + (template.quoteValidity || 30));

    const buffer = await this.pdfService.generatePdfBuffer({
      quoteNumber,
      date:       now.toLocaleDateString('en-GB'),
      validUntil: validDate.toLocaleDateString('en-GB'),
      client: {
        name:        dto.clientName    || '',
        address:     dto.clientAddress || '',
        phone:       dto.clientPhone   || '',
        email:       dto.clientEmail   || '',
        projectSite: dto.projectSite   || '',
      },
      metres,
      height:  dto.height,
      sqm:     dto.sqm,
      sqmInfo,
      calc,
      template,
    });

    const isPdf = buffer.length > 4 && buffer[0] === 0x25 && buffer[1] === 0x50;
    const ext   = isPdf ? 'pdf' : 'html';
    res.setHeader('Content-Type', isPdf ? 'application/pdf' : 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Quote_${quoteNumber}.${ext}"`);
    res.setHeader('Content-Length', buffer.length);
    res.status(HttpStatus.OK).send(buffer);
  }
}