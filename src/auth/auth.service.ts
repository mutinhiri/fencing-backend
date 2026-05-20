import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
// import { User } from '../users/user.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) return null;
    const valid = await this.usersService.validatePassword(user, password);
    if (!valid) return null;
    const { password: _, ...result } = user;
    return result as any;
  }

  async login(user: Omit<User, 'password'>) {
    const payload = { sub: user.id, email: user.email, role: user.role, name: user.name };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  async getProfile(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();
    const { password, ...result } = user;
    return result;
  }
}