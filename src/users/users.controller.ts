import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
// import { RolesGuard } from '../auth/roles.guard';
import { RolesGuard } from 'src/jwt/jwt-auth.guard';
// import { Roles } from '../auth/roles.decorator';
import { Roles } from 'src/jwt/jwt-auth.guard';
// import { UserRole } from './user.entity';
import { UserRole } from './entities/user.entity';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @IsEmail() email: string;
  @IsString() name: string;
  @IsString() @MinLength(6) password: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
}

export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
}