import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Tenant slug already exists');

    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        currency: dto.currency ?? 'USD',
        timezone: dto.timezone ?? 'UTC',
      },
    });
  }

  async findAll(dto: PaginationDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = dto.search
      ? { OR: [{ name: { contains: dto.search, mode: 'insensitive' } }, { slug: { contains: dto.search, mode: 'insensitive' } }] }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.tenant.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { branches: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, dto: Partial<CreateTenantDto>) {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: {
        name: dto.name,
        currency: dto.currency,
        timezone: dto.timezone,
      },
    });
  }

  async suspend(id: string) {
    await this.findOne(id);
    return this.prisma.tenant.update({ where: { id }, data: { isActive: false } });
  }

  async activate(id: string) {
    await this.findOne(id);
    return this.prisma.tenant.update({ where: { id }, data: { isActive: true } });
  }

  async getStats() {
    const [tenants, activeTenants] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { isActive: true } }),
    ]);
    return { tenants, activeTenants };
  }

  async findForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { tenant: true },
    });
    const tenants = memberships.map((m) => m.tenant).filter(Boolean);
    return { tenants };
  }
}
