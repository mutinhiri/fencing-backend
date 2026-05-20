import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  Request,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import type { Response } from 'express';
import { PdfService, PdfQuoteData } from './pdf.service';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { QuotesService } from '../quotes/quotes.service';
import { TemplatesService } from '../templates/templates.service';
import { calculateMaterials, sqmToMetres, SqmConversion } from '../quotes/calculation.engine';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class GeneratePdfDto {
  @IsOptional() @IsString() clientName?: string;
  @IsOptional() @IsString() clientEmail?: string;
  @IsOptional() @IsString() clientPhone?: string;
  @IsOptional() @IsString() clientAddress?: string;
  @IsOptional() @IsString() projectSite?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsNumber() @Min(1) metres?: number;
  @IsOptional() @IsNumber() @Min(1) sqm?: number;
  @IsString() height: string;
}

@Controller('pdf')
@UseGuards(JwtAuthGuard)
export class PdfController {
  constructor(
    private readonly pdfService: PdfService,
    @Inject(forwardRef(() => QuotesService))
    private readonly quotesService: QuotesService,
    private readonly templatesService: TemplatesService,
  ) {}

  /**
   * POST /api/pdf/generate
   * Generate & download PDF from raw input (no saved quote required).
   */
  @Post('generate')
  async generateFromInput(@Body() dto: GeneratePdfDto, @Res() res: Response) {
    if (!dto.metres && !dto.sqm) {
      throw new BadRequestException('Provide either metres or sqm');
    }

    const { pdfData, quoteNumber } = await this.buildPdfData(dto);
    await this.sendPdfResponse(res, pdfData, quoteNumber);
  }

  /**
   * GET /api/pdf/quote/:id
   * Download PDF for a saved quote (ownership enforced).
   */
  @Get('quote/:id')
  async generateFromSavedQuote(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Res() res: Response,
  ) {
    const quote = await this.quotesService.findOne(id, req.user.sub, req.user.role);
    const { calc, sqmInfo, template } = JSON.parse(quote.calculationJson);

    const createdAt = new Date(quote.createdAt);
    const validDate = new Date(createdAt);
    validDate.setDate(validDate.getDate() + (template.quoteValidity || 30));

    const pdfData: PdfQuoteData = {
      quoteNumber: quote.quoteNumber,
      date: createdAt.toLocaleDateString('en-GB'),
      validUntil: validDate.toLocaleDateString('en-GB'),
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
    };

    await this.sendPdfResponse(res, pdfData, quote.quoteNumber);
  }

  /**
   * POST /api/pdf/html
   * Return raw HTML (for iframe preview / email embedding).
   */
  @Post('html')
  async getHtml(@Body() dto: GeneratePdfDto): Promise<{ html: string; quoteNumber: string }> {
    if (!dto.metres && !dto.sqm) {
      throw new BadRequestException('Provide either metres or sqm');
    }
    const { pdfData, quoteNumber } = await this.buildPdfData(dto);
    return { html: this.pdfService.buildHtml(pdfData), quoteNumber };
  }

  /**
   * GET /api/pdf/quote/:id/html
   * Return HTML string for a saved quote (inline preview).
   */
  @Get('quote/:id/html')
  async getSavedQuoteHtml(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<{ html: string; quoteNumber: string }> {
    const quote = await this.quotesService.findOne(id, req.user.sub, req.user.role);
    const { calc, sqmInfo, template } = JSON.parse(quote.calculationJson);

    const createdAt = new Date(quote.createdAt);
    const validDate = new Date(createdAt);
    validDate.setDate(validDate.getDate() + (template.quoteValidity || 30));

    const pdfData: PdfQuoteData = {
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
    };

    return { html: this.pdfService.buildHtml(pdfData), quoteNumber: quote.quoteNumber };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /** Shared logic: resolve metres/sqm, run calculation, build PdfQuoteData. */
  private async buildPdfData(dto: GeneratePdfDto): Promise<{ pdfData: PdfQuoteData; quoteNumber: string }> {
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

    const calc         = calculateMaterials(metres, dto.height, template);
    const quoteNumber  = `FP-${Date.now().toString().slice(-7)}`;
    const now          = new Date();
    const validDate    = new Date(now);
    validDate.setDate(validDate.getDate() + (template.quoteValidity || 30));

    const pdfData: PdfQuoteData = {
      quoteNumber,
      date:      now.toLocaleDateString('en-GB'),
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
    };

    return { pdfData, quoteNumber };
  }

  private async sendPdfResponse(
    res: Response,
    pdfData: PdfQuoteData,
    quoteNumber: string,
  ): Promise<void> {
    const buffer = await this.pdfService.generatePdfBuffer(pdfData);

    // %PDF magic bytes → real PDF; otherwise HTML fallback
    const isPdf =
      buffer.length > 4 &&
      buffer[0] === 0x25 && buffer[1] === 0x50 &&
      buffer[2] === 0x44 && buffer[3] === 0x46;

    const ext         = isPdf ? 'pdf' : 'html';
    const contentType = isPdf ? 'application/pdf' : 'text/html; charset=utf-8';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="Quote_${quoteNumber}.${ext}"`);
    res.setHeader('Content-Length', buffer.length);
    res.status(HttpStatus.OK).send(buffer);
  }
}