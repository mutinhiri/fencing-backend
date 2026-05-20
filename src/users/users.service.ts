import { Injectable, OnModuleInit, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    // Seed default admin on first run
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@fencepro.co.zw';
    const existing = await this.usersRepo.findOne({ where: { email: adminEmail } });
    if (!existing) {
      const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', 10);
      await this.usersRepo.save({
        email: adminEmail,
        name: 'System Admin',
        password: hashed,
        role: UserRole.ADMIN,
      });
      console.log(`✅ Admin seeded: ${adminEmail}`);
    }
  }

  async findAll(): Promise<Omit<User, 'password'>[]> {
    const users = await this.usersRepo.find({ order: { createdAt: 'DESC' } });
    return users.map(({ password, ...u }) => u as any);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async create(dto: { email: string; name: string; password: string; role?: UserRole }) {
    const exists = await this.findByEmail(dto.email);
    if (exists) throw new ConflictException('Email already registered');
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({ ...dto, password: hashed });
    const saved = await this.usersRepo.save(user);
    const { password, ...result } = saved;
    return result;
  }

  async update(id: number, dto: Partial<{ name: string; email: string; role: UserRole; isActive: boolean }>) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    Object.assign(user, dto);
    const saved = await this.usersRepo.save(user);
    const { password, ...result } = saved;
    return result;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }
}