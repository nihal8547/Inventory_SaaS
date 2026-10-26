import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    const { accessToken, refreshToken } = await this.generateTokens(user.id);
    await this.saveRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { accessToken, refreshToken } = await this.generateTokens(user.id);
    await this.saveRefreshToken(user.id, refreshToken);

    // Get user memberships with roles
    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.id, isActive: true },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
        tenant: true,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
      memberships: memberships.map(m => ({
        tenantId: m.tenantId,
        tenantName: m.tenant.name,
        tenantSlug: m.tenant.slug,
        roleId: m.roleId,
        roleName: m.role.name,
        permissions: m.role.permissions.map(rp => rp.permission.code),
      })),
    };
  }

  async refreshTokens(refreshToken: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!session.user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    await this.prisma.userSession.delete({ where: { id: session.id } });

    const tokens = await this.generateTokens(session.userId);
    await this.saveRefreshToken(session.userId, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.userSession.deleteMany({
        where: { userId, refreshToken },
      });
    } else {
      await this.prisma.userSession.deleteMany({ where: { userId } });
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    const memberships = await this.prisma.membership.findMany({
      where: { userId, isActive: true },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
        tenant: true,
        branches: { include: { branch: true } },
      },
    });

    return {
      ...this.sanitizeUser(user),
      memberships: memberships.map(m => ({
        tenantId: m.tenantId,
        tenantName: m.tenant.name,
        tenantSlug: m.tenant.slug,
        roleId: m.roleId,
        roleName: m.role.name,
        permissions: m.role.permissions.map(rp => rp.permission.code),
        branches: m.branches.map(b => ({ id: b.branchId, name: b.branch.name })),
      })),
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.isActive) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  async getUserPermissions(userId: string, tenantId: string): Promise<string[]> {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (!membership) return [];
    return membership.role.permissions.map(rp => rp.permission.code);
  }

  private async generateTokens(userId: string) {
    const payload = { sub: userId };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRY', '7d'),
    });
    const refreshToken = uuidv4();
    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await this.prisma.userSession.create({
      data: { userId, refreshToken: token, expiresAt },
    });
  }

  private sanitizeUser(user: any) {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      phone: user.phone,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
