import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findMembers(tenantId: string, dto: PaginationDto & { roleId?: string; status?: string }) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (dto.status === 'active') where.isActive = true;
    else if (dto.status === 'inactive') where.isActive = false;
    if (dto.roleId && dto.roleId !== 'all') where.roleId = dto.roleId;
    if (dto.search) {
      where.user = {
        OR: [
          { email: { contains: dto.search, mode: 'insensitive' } },
          { firstName: { contains: dto.search, mode: 'insensitive' } },
          { lastName: { contains: dto.search, mode: 'insensitive' } },
        ],
      };
    }

    const safeUserSelect = {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        phone: true,
        isActive: true,
        isSuperAdmin: true,
        lastLoginAt: true,
        createdAt: true,
      },
    };

    const [data, total] = await Promise.all([
      this.prisma.membership.findMany({
        where, skip, take: limit,
        include: { user: safeUserSelect, role: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.membership.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async inviteUser(tenantId: string, dto: { email: string; firstName: string; lastName: string; roleId: string; password?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });

    let user = existing;
    if (!user) {
      const password = dto.password ?? Math.random().toString(36).slice(-8) + 'A1!';
      const passwordHash = await bcrypt.hash(password, 12);
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          passwordHash,
        },
      });
    }

    const existingMembership = await this.prisma.membership.findFirst({ where: { userId: user.id, tenantId } });
    if (existingMembership) throw new ConflictException('User already a member');

    const safeUserSelect = {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        phone: true,
        isActive: true,
        isSuperAdmin: true,
        lastLoginAt: true,
        createdAt: true,
      },
    };

    return this.prisma.membership.create({
      data: { userId: user.id, tenantId, roleId: dto.roleId },
      include: { user: safeUserSelect, role: true },
    });
  }

  async updateMembership(tenantId: string, userId: string, dto: { roleId?: string; isActive?: boolean }) {
    const membership = await this.prisma.membership.findFirst({ where: { userId, tenantId } });
    if (!membership) throw new NotFoundException('Membership not found');

    const safeUserSelect = {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        phone: true,
        isActive: true,
        isSuperAdmin: true,
        lastLoginAt: true,
        createdAt: true,
      },
    };

    return this.prisma.membership.update({
      where: { id: membership.id },
      data: { roleId: dto.roleId, isActive: dto.isActive },
      include: { user: safeUserSelect, role: true },
    });
  }

  async removeMembership(tenantId: string, userId: string) {
    const membership = await this.prisma.membership.findFirst({ where: { userId, tenantId } });
    if (!membership) throw new NotFoundException('Membership not found');
    return this.prisma.membership.update({ where: { id: membership.id }, data: { isActive: false } });
  }
}
