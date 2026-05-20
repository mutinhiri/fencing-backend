import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
// import { User } from '../users/user.entity';
import { User } from 'src/users/entities/user.entity';

export enum QuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

@Entity('quotes')
export class Quote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  quoteNumber: string;

  // Client info
  @Column({ nullable: true })
  clientName: string;

  @Column({ nullable: true })
  clientEmail: string;

  @Column({ nullable: true })
  clientPhone: string;

  @Column({ nullable: true })
  clientAddress: string;

  @Column({ nullable: true })
  projectSite: string;

  // Fence parameters
  @Column({ type: 'float' })
  metres: number;

  @Column({ nullable: true, type: 'float' })
  sqm: number;

  @Column({ default: '1.8' })
  height: string;

  // Calculated totals (snapshot at time of quote)
  @Column({ type: 'float' })
  subtotal: number;

  @Column({ type: 'float' })
  vat: number;

  @Column({ type: 'float' })
  grand: number;

  // Full calculation snapshot as JSON
  @Column({ type: 'text' })
  calculationJson: string;

  // Template snapshot
  @Column({ type: 'integer', nullable: true })
  templateId: number;

  @Column({ type: 'text', default: QuoteStatus.DRAFT })
  status: QuoteStatus;

  @Column({ nullable: true })
  notes: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  createdBy: User;

  @Column({ nullable: true })
  createdById: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}