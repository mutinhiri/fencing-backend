import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('pricing_templates')
export class PricingTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'Default Template' })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  // Company info
  @Column({ default: 'FencePro Zimbabwe' })
  companyName: string;

  @Column({ default: '123 Industrial Road, Harare' })
  companyAddress: string;

  @Column({ default: '+263 77 000 0000' })
  companyPhone: string;

  @Column({ default: 'info@fencepro.co.zw' })
  companyEmail: string;

  @Column({ default: 30 })
  quoteValidity: number;

  @Column({ type: 'float', default: 15 })
  vatPercent: number;

  // Labour
  @Column({ type: 'float', default: 1 })
  labourPerMetre: number;

  // Round post prices per height
  @Column({ type: 'float', default: 8 })
  roundPost_height_1_8: number;

  @Column({ type: 'float', default: 7 })
  roundPost_height_1_5: number;

  @Column({ type: 'float', default: 6 })
  roundPost_height_1_2: number;

  // Standard post prices per height
  @Column({ type: 'float', default: 3.5 })
  standardPost_height_1_8: number;

  @Column({ type: 'float', default: 3 })
  standardPost_height_1_5: number;

  @Column({ type: 'float', default: 2.5 })
  standardPost_height_1_2: number;

  // Other materials
  @Column({ type: 'float', default: 2 })
  supportingPostPrice: number;

  @Column({ type: 'float', default: 0.15 })
  strainWirePerMetre: number;

  @Column({ type: 'float', default: 2.5 })
  tyingWirePerKg: number;

  @Column({ type: 'float', default: 10 })
  cementPerBag: number;

  @Column({ type: 'float', default: 4 })
  quarryPerWheelbarrow: number;

  @Column({ type: 'float', default: 3 })
  sandPerWheelbarrow: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}