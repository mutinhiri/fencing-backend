import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
// import { LocalAuthGuard } from './local-auth.guard';
import { LocalAuthGuard } from 'src/jwt/jwt-auth.guard';
// import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user.sub);
  }
}