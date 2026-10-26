import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { CreateTenantDto, UpdateTenantDto, UpdateBranchQuotaDto } from './dto/admin.dto';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async getStats() {
    const [
      totalTenants,
      activeTenants,
      totalUsers,
      totalProducts,
      totalSales,
      salesVolumeAggregate,
      subscriptions,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.sale.count({ where: { status: 'COMPLETED' } }),
      this.prisma.sale.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { total: true },
      }),
      this.prisma.subscription.findMany({
        where: { status: 'active' },
        include: { plan: true },
      }),
    ]);

    const suspendedTenants = totalTenants - activeTenants;
    const totalGmvQar = Number(salesVolumeAggregate._sum?.total || 0);

    // Calculate subscription plan breakdown
    const planCounts: Record<string, number> = {
      STARTER: 0,
      GROWTH: 0,
      ENTERPRISE: 0,
    };

    for (const sub of subscriptions) {
      const planName = (sub.plan?.name || 'ENTERPRISE').toUpperCase();
      if (planName.includes('STARTER')) planCounts.STARTER++;
      else if (planName.includes('GROWTH')) planCounts.GROWTH++;
      else planCounts.ENTERPRISE++;
    }

    // Process memory & system info
    const memUsage = process.memoryUsage();
    const systemHealth = {
      status: 'HEALTHY',
      database: 'CONNECTED',
      uptimeSeconds: Math.floor(process.uptime()),
      memoryRssMb: Math.round(memUsage.rss / 1024 / 1024),
      memoryHeapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
      platformVersion: 'v1.5.0 Enterprise',
      nodeVersion: process.version,
    };

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalUsers,
      totalProducts,
      totalSales,
      totalGmvQar,
      planCounts,
      systemHealth,
    };
  }

  async findTenants(dto: PaginationDto) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { slug: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              memberships: true,
              products: true,
              sales: true,
              branches: true,
              warehouses: true,
            },
          },
          branches: {
            where: { isDefault: true },
            take: 1,
            select: { id: true, name: true, city: true, code: true },
          },
          subscriptions: {
            where: { status: 'active' },
            include: { plan: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    const formatted = tenants.map((t) => {
      const activeSub = t.subscriptions?.[0];
      const planName = activeSub?.plan?.name || (t.slug === 'demo-store' ? 'ENTERPRISE' : 'GROWTH');
      const maxBranches = Number((t as any).maxBranches ?? 3);
      const extraBranches = Number((t as any).extraBranches ?? 0);
      const totalAllowed = maxBranches + extraBranches;
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        isActive: t.isActive,
        currency: t.currency || 'QAR',
        plan: planName.toUpperCase(),
        primaryCity: t.branches?.[0]?.city || 'Doha',
        primaryBranchCode: t.branches?.[0]?.code || 'MAIN',
        createdAt: t.createdAt,
        _count: t._count,
        branchQuota: {
          current: t._count.branches,
          base: maxBranches,
          extra: extraBranches,
          totalAllowed,
          remaining: Math.max(0, totalAllowed - t._count.branches),
          isLimitReached: t._count.branches >= totalAllowed,
          allowExtraBranches: Boolean((t as any).allowExtraBranches ?? false),
        },
      };
    });

    return paginate(formatted, total, page, limit);
  }

  async getTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            memberships: true,
            products: true,
            sales: true,
            branches: true,
            warehouses: true,
          },
        },
        branches: {
          include: {
            warehouses: true,
            membershipBranches: {
              include: {
                membership: {
                  include: {
                    user: {
                      select: { id: true, email: true, firstName: true, lastName: true },
                    },
                    role: true,
                  },
                },
              },
            },
          },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
                createdAt: true,
              },
            },
            role: true,
          },
          take: 10,
        },
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async createTenant(dto: CreateTenantDto) {
    const rawSlug = (dto.slug || dto.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32);

    let finalSlug = rawSlug || 'store-' + Math.floor(1000 + Math.random() * 9000);
    const existing = await this.prisma.tenant.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      finalSlug = `${finalSlug}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const currency = dto.currency || 'QAR';
    const city = dto.city || 'Doha';
    const targetPlan = (dto.plan || 'GROWTH').toUpperCase();

    // 1. Create Tenant Record
    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name.trim(),
        slug: finalSlug,
        currency,
        timezone: 'Asia/Qatar',
        locale: 'en-QA',
        isActive: true,
      },
    });

    // 2. Ensure Subscription Plan exists and link Subscription
    let plan = await this.prisma.subscriptionPlan.findFirst({
      where: { name: targetPlan },
    });
    if (!plan) {
      plan = await this.prisma.subscriptionPlan.create({
        data: {
          name: targetPlan,
          description: `${targetPlan} Tier Plan for InventoryOS SaaS`,
          price: targetPlan === 'STARTER' ? 299 : targetPlan === 'GROWTH' ? 799 : 1999,
          currency: 'QAR',
          maxBranches: targetPlan === 'STARTER' ? 1 : targetPlan === 'GROWTH' ? 5 : 50,
          maxUsers: targetPlan === 'STARTER' ? 3 : targetPlan === 'GROWTH' ? 15 : 100,
          maxProducts: targetPlan === 'STARTER' ? 1000 : targetPlan === 'GROWTH' ? 10000 : 100000,
        },
      });
    }

    await this.prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        status: 'active',
        startDate: new Date(),
      },
    });

    // 3. Create Default Primary Branch
    const branchCode = 'BR-' + finalSlug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'MAIN';
    const branch = await this.prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: `${dto.name} Main Hub`,
        code: branchCode,
        city,
        isDefault: true,
        isActive: true,
      },
    });

    // 4. Create Default Warehouse
    await this.prisma.warehouse.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        name: 'Main Storage Warehouse',
        code: `WH-${branchCode}-01`,
        isDefault: true,
        isActive: true,
      },
    });

    // 5. Create System Owner Role
    const allPermissions = await this.prisma.permission.findMany();
    const ownerRole = await this.prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Owner',
        description: 'Organization Primary Administrator',
        isSystem: true,
        permissions: {
          create: allPermissions.map((p) => ({ permissionId: p.id })),
        },
      },
    });

    // 6. Create Primary Admin User
    const adminEmail = dto.adminEmail.toLowerCase().trim();
    const rawPassword = dto.adminPassword || 'Store' + Math.floor(100000 + Math.random() * 900000) + '!';
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    const nameParts = (dto.adminName || 'Store Admin').trim().split(' ');
    const firstName = nameParts[0] || 'Store';
    const lastName = nameParts.slice(1).join(' ') || 'Admin';

    let user = await this.prisma.user.findUnique({ where: { email: adminEmail } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          firstName,
          lastName,
          isActive: true,
        },
      });
    } else if (dto.adminPassword) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, firstName, lastName },
      });
    }

    // 7. Link Membership & Branch Access
    const membership = await this.prisma.membership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        roleId: ownerRole.id,
      },
    });

    await this.prisma.membershipBranch.create({
      data: {
        membershipId: membership.id,
        branchId: branch.id,
      },
    });

    // 8. Optional Welcome Email Dispatch
    let emailSent = false;
    if (dto.sendWelcomeEmail !== false) {
      try {
        const subject = `Welcome to InventoryOS Qatar — ${dto.name} Provisioned`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
              <h2 style="color: #0f172a; margin: 0; font-size: 20px;">InventoryOS Enterprise SaaS — Qatar</h2>
              <p style="color: #2563eb; font-weight: bold; font-size: 13px; margin: 4px 0 0 0;">New Store Organization Provisioned</p>
            </div>
            <p style="color: #334155; font-size: 14px;">Hello <strong>${firstName} ${lastName}</strong>,</p>
            <p style="color: #334155; font-size: 14px;">Your organization <strong>${dto.name}</strong> has been created with subscription tier <strong>${targetPlan}</strong>.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <h3 style="color: #0f172a; font-size: 14px; margin-top: 0; margin-bottom: 12px;">Login Credentials</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px 0; color: #64748b;">Organization:</td>
                  <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #0f172a;">${dto.name}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px 0; color: #64748b;">Plan:</td>
                  <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #2563eb;">${targetPlan}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px 0; color: #64748b;">Login Username:</td>
                  <td style="padding: 8px 0; font-family: monospace; font-weight: bold; text-align: right; color: #0f172a;">${adminEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Temporary Password:</td>
                  <td style="padding: 8px 0; font-family: monospace; font-weight: bold; text-align: right; color: #059669; font-size: 14px;">${rawPassword}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin: 24px 0;">
              <a href="http://localhost:3000/login" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                Sign in to Store Dashboard
              </a>
            </div>
            <p style="color: #64748b; font-size: 12px; margin-top: 20px;">Doha, State of Qatar &bull; InventoryOS Multi-Tenant Architecture</p>
          </div>
        `;
        const res = await this.mailService.sendMail([adminEmail], subject, html, tenant.id);
        emailSent = res.success;
      } catch (err: any) {
        this.logger.error(`Failed to send tenant welcome email: ${err.message}`);
      }
    }

    return {
      success: true,
      tenant,
      adminUser: {
        id: user.id,
        email: user.email,
        name: `${firstName} ${lastName}`,
        temporaryPassword: rawPassword,
        emailSent,
      },
    };
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name.trim();
    if (dto.currency) updateData.currency = dto.currency;
    if (typeof dto.isActive === 'boolean') updateData.isActive = dto.isActive;
    if (dto.maxBranches !== undefined) updateData.maxBranches = dto.maxBranches;
    if (dto.extraBranches !== undefined) updateData.extraBranches = dto.extraBranches;
    if (typeof dto.allowExtraBranches === 'boolean') updateData.allowExtraBranches = dto.allowExtraBranches;

    if (dto.slug && dto.slug !== tenant.slug) {
      const sanitized = dto.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
      const conflict = await this.prisma.tenant.findUnique({ where: { slug: sanitized } });
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Slug "${sanitized}" is already taken`);
      }
      updateData.slug = sanitized;
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: updateData,
    });

    // If plan update requested
    if (dto.plan) {
      const targetPlan = dto.plan.toUpperCase();
      let plan = await this.prisma.subscriptionPlan.findFirst({
        where: { name: targetPlan },
      });
      if (!plan) {
        plan = await this.prisma.subscriptionPlan.create({
          data: {
            name: targetPlan,
            description: `${targetPlan} Tier Plan for InventoryOS SaaS`,
            price: targetPlan === 'STARTER' ? 299 : targetPlan === 'GROWTH' ? 799 : 1999,
            currency: 'QAR',
          },
        });
      }

      await this.prisma.subscription.updateMany({
        where: { tenantId: id, status: 'active' },
        data: { status: 'cancelled' },
      });

      await this.prisma.subscription.create({
        data: {
          tenantId: id,
          planId: plan.id,
          status: 'active',
          startDate: new Date(),
        },
      });
    }

    return updated;
  }

  async updateBranchQuota(id: string, dto: UpdateBranchQuotaDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const updateData: any = {};
    if (dto.maxBranches !== undefined) updateData.maxBranches = Number(dto.maxBranches);
    if (dto.extraBranches !== undefined) updateData.extraBranches = Number(dto.extraBranches);
    if (typeof dto.allowExtraBranches === 'boolean') updateData.allowExtraBranches = dto.allowExtraBranches;

    const updated: any = await this.prisma.tenant.update({
      where: { id },
      data: updateData,
    });

    const currentBranches = await this.prisma.branch.count({
      where: { tenantId: id, isActive: true },
    });

    const totalAllowed = Number(updated.maxBranches ?? 3) + Number(updated.extraBranches ?? 0);

    return {
      success: true,
      tenantId: id,
      tenantName: updated.name,
      branchQuota: {
        current: currentBranches,
        base: Number(updated.maxBranches ?? 3),
        extra: Number(updated.extraBranches ?? 0),
        totalAllowed,
        remaining: Math.max(0, totalAllowed - currentBranches),
        isLimitReached: currentBranches >= totalAllowed,
        allowExtraBranches: Boolean(updated.allowExtraBranches),
      },
    };
  }

  async suspendTenant(id: string) {
    return this.prisma.tenant.update({ where: { id }, data: { isActive: false } });
  }

  async activateTenant(id: string) {
    return this.prisma.tenant.update({ where: { id }, data: { isActive: true } });
  }

  async deleteTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.slug === 'demo-store') {
      throw new ConflictException('Cannot delete the primary demo store');
    }

    // Subscriptions relation does not specify onDelete: Cascade, so remove them first
    await this.prisma.subscription.deleteMany({ where: { tenantId: id } });
    // Tenant cascades all other dependent models (branches, warehouses, products, sales, etc.)
    await this.prisma.tenant.delete({ where: { id } });
    return { success: true, message: `Tenant "${tenant.name}" deleted successfully` };
  }

  async getPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { subscriptions: { where: { status: 'active' } } },
        },
      },
    });

    if (plans.length === 0) {
      // Seed default plans
      const defaults = [
        {
          name: 'STARTER',
          description: 'Single boutique retail store with 1 POS terminal and up to 1,000 SKUs',
          price: 299,
          currency: 'QAR',
          interval: 'monthly',
          maxBranches: 1,
          maxUsers: 3,
          maxProducts: 1000,
        },
        {
          name: 'GROWTH',
          description: 'Multi-branch retail network with centralized warehouse distribution',
          price: 799,
          currency: 'QAR',
          interval: 'monthly',
          maxBranches: 5,
          maxUsers: 15,
          maxProducts: 10000,
        },
        {
          name: 'ENTERPRISE',
          description: 'Fleet store operations with unlimited branches, API keys, and webhooks',
          price: 1999,
          currency: 'QAR',
          interval: 'monthly',
          maxBranches: 50,
          maxUsers: 100,
          maxProducts: 100000,
        },
      ];

      for (const def of defaults) {
        await this.prisma.subscriptionPlan.create({ data: def });
      }

      return this.prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: { subscriptions: { where: { status: 'active' } } },
          },
        },
      });
    }

    return plans;
  }
}
