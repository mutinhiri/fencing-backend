import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingTemplate } from './template.entity';

@Injectable()
export class TemplatesService implements OnModuleInit {
  constructor(
    @InjectRepository(PricingTemplate)
    private readonly repo: Repository<PricingTemplate>,
  ) {}

  async onModuleInit() {
    const count = await this.repo.count();
    if (count === 0) {
      await this.repo.save(this.repo.create({ name: 'Default Template', isActive: true }));
      console.log('✅ Default pricing template created');
    }
  }

  async findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findActive(): Promise<PricingTemplate> {
    const t = await this.repo.findOne({ where: { isActive: true } });
    if (!t) throw new NotFoundException('No active template found');
    return t;
  }

  async findOne(id: number): Promise<PricingTemplate> {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  async create(dto: Partial<PricingTemplate>): Promise<PricingTemplate> {
    const template = this.repo.create(dto);
    return this.repo.save(template);
  }

  async update(id: number, dto: Partial<PricingTemplate>): Promise<PricingTemplate> {
    const template = await this.findOne(id);
    Object.assign(template, dto);
    return this.repo.save(template);
  }

  async setActive(id: number): Promise<PricingTemplate> {
    // Deactivate all others
    await this.repo.update({}, { isActive: false });
    // Activate the selected one
    await this.repo.update({ id }, { isActive: true });
    return this.findOne(id);
  }
}