import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// import { Quote, QuoteStatus } from './quote.entity';
import { Quote, QuoteStatus } from './entities/quote.entity';
import { TemplatesService } from '../templates/templates.service';
import {
  calculateMaterials,
  sqmToMetres,
  QuoteCalculation,
  SqmConversion,
} from './calculation.engine';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CalculateDto {
  @IsOptional() @IsNumber() @Min(1) metres?: number;
  @IsOptional() @IsNumber() @Min(1) sqm?: number;
  @IsString() height: string;
}

export class CreateQuoteDto {
  @IsOptional() @IsString() clientName?: string;
  @IsOptional() @IsString() clientEmail?: string;
  @IsOptional() @IsString() clientPhone?: string;
  @IsOptional() @IsString() clientAddress?: string;
  @IsOptional() @IsString() projectSite?: string;
  @IsOptional() @IsNumber() @Min(1) metres?: number;
  @IsOptional() @IsNumber() sqm?: number;
  @IsString() height: string;
  @IsOptional() @IsString() notes?: string;
}

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote)
    private readonly repo: Repository<Quote>,
    private readonly templatesService: TemplatesService,
  ) {}

  private generateQuoteNumber(): string {
    return `FP-${Date.now().toString().slice(-7)}`;
  }

  /** Resolve metres/sqm into a concrete number + optional sqm info. */
  private resolveMetres(dto: { metres?: number; sqm?: number }): {
    metres: number;
    sqmInfo?: SqmConversion;
  } {
    if (dto.sqm && !dto.metres) {
      const sqmInfo = sqmToMetres(dto.sqm);
      return { metres: sqmInfo.perimeter, sqmInfo };
    }
    return { metres: dto.metres as number };
  }

  async calculate(dto: CalculateDto): Promise<{ calc: QuoteCalculation; sqmInfo?: SqmConversion }> {
    const template = await this.templatesService.findActive();
    const { metres, sqmInfo } = this.resolveMetres(dto);
    const calc = calculateMaterials(metres, dto.height, template);
    return { calc, sqmInfo };
  }

  async create(dto: CreateQuoteDto, userId: number): Promise<Quote> {
    const template = await this.templatesService.findActive();
    const { metres, sqmInfo } = this.resolveMetres(dto);
    const calc = calculateMaterials(metres, dto.height, template);

    const quote = this.repo.create({
      quoteNumber:    this.generateQuoteNumber(),
      clientName:     dto.clientName,
      clientEmail:    dto.clientEmail,
      clientPhone:    dto.clientPhone,
      clientAddress:  dto.clientAddress,
      projectSite:    dto.projectSite,
      metres,
      sqm:            dto.sqm,
      height:         dto.height,
      subtotal:       calc.subtotal,
      vat:            calc.vat,
      grand:          calc.grand,
      calculationJson: JSON.stringify({ calc, sqmInfo: sqmInfo ?? null, template }),
      templateId:     template.id,
      notes:          dto.notes,
      createdById:    userId,
      status:         QuoteStatus.DRAFT,
    });

    return this.repo.save(quote);
  }

  async findAll(userId: number, role: string): Promise<Quote[]> {
    if (role === 'admin') {
      return this.repo.find({ order: { createdAt: 'DESC' }, relations: ['createdBy'] });
    }
    return this.repo.find({ where: { createdById: userId }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: number, userId: number, role: string): Promise<Quote> {
    const quote = await this.repo.findOne({ where: { id }, relations: ['createdBy'] });
    if (!quote) throw new NotFoundException('Quote not found');
    if (role !== 'admin' && quote.createdById !== userId) {
      throw new NotFoundException('Quote not found');
    }
    return quote;
  }

  async updateStatus(id: number, status: QuoteStatus): Promise<Quote> {
    const quote = await this.repo.findOne({ where: { id } });
    if (!quote) throw new NotFoundException('Quote not found');
    quote.status = status;
    return this.repo.save(quote);
  }
}