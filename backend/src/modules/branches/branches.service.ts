import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBranchDto, AssignBranchStaffDto, ResendStaffCredentialsDto } from './dto/create-branch.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class BranchesService {
  private readonly logger = new Logger(BranchesService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async getQuota(tenantId: string) {
    const tenant: any = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    const current = await this.prisma.branch.count({
      where: { tenantId, isActive: true },
    });
    const base = Number(tenant?.maxBranches ?? 3);
    const extra = Number(tenant?.extraBranches ?? 0);
    const totalAllowed = base + extra;

    return {
      current,
      base,
      extra,
      totalAllowed,
      remaining: Math.max(0, totalAllowed - current),
      isLimitReached: current >= totalAllowed,
      allowExtraBranches: Boolean(tenant?.allowExtraBranches ?? false),
    };
  }

  async create(tenantId: string, dto: CreateBranchDto) {
    // 1. Enforce strict organizer branch quota
    const tenant: any = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    const currentBranchCount = await this.prisma.branch.count({
      where: { tenantId, isActive: true },
    });
    const allowedLimit = Number(tenant?.maxBranches ?? 3) + Number(tenant?.extraBranches ?? 0);

    if (currentBranchCount >= allowedLimit) {
      throw new BadRequestException(
        `Branch quota exceeded. Your organization is permitted a maximum of ${allowedLimit} branches (${currentBranchCount} currently active). Please contact the SaaS Super Admin to expand your branch allocation.`
      );
    }

    const code = (dto.code ?? dto.name.toUpperCase().replace(/\s+/g, '-')).substring(0, 20);

    const existing = await this.prisma.branch.findFirst({ where: { tenantId, code } });
    if (existing) throw new ConflictException('Branch code already exists');

    if (dto.isDefault) {
      await this.prisma.branch.updateMany({ where: { tenantId }, data: { isDefault: false } });
    }

    const branch = await this.prisma.branch.create({
      data: {
        tenantId,
        name: dto.name,
        code,
        address: dto.address,
        city: dto.city,
        phone: dto.phone,
        email: dto.email,
        isDefault: dto.isDefault ?? false,
      },
    });

    // Auto-create default warehouse for this branch
    const whCode = `WH-${code}`.substring(0, 20);
    const existingWh = await this.prisma.warehouse.findFirst({ where: { tenantId, code: whCode } });
    if (!existingWh) {
      await this.prisma.warehouse.create({
        data: {
          tenantId,
          branchId: branch.id,
          name: `${dto.name} Warehouse`,
          code: whCode,
          isDefault: true,
        },
      });
    }

    // If manager credentials provided, create user and assign to branch
    let managerUser: any = null;
    if (dto.managerEmail && dto.managerPassword) {
      const email = dto.managerEmail.toLowerCase().trim();
      const passwordHash = await bcrypt.hash(dto.managerPassword, 12);
      const nameParts = (dto.managerName || 'Branch Manager').trim().split(' ');
      const firstName = nameParts[0] || 'Branch';
      const lastName = nameParts.slice(1).join(' ') || 'Manager';

      let user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email,
            passwordHash,
            firstName,
            lastName,
            isActive: true,
          },
        });
      }

      // Find or assign role
      const targetRoleName = dto.roleName || 'Manager';
      let role = await this.prisma.role.findFirst({
        where: { tenantId, name: targetRoleName },
      });
      if (!role) {
        role = await this.prisma.role.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'asc' },
        });
      }

      if (role) {
        const membership = await this.prisma.membership.upsert({
          where: { userId_tenantId: { userId: user.id, tenantId } },
          create: { userId: user.id, tenantId, roleId: role.id },
          update: { roleId: role.id },
        });

        await this.prisma.membershipBranch.upsert({
          where: {
            membershipId_branchId: {
              membershipId: membership.id,
              branchId: branch.id,
            },
          },
          create: { membershipId: membership.id, branchId: branch.id },
          update: {},
        });

        let mailResult: any = null;
        if (dto.sendCredentialsEmail !== false) {
          mailResult = await this.sendBranchCredentialsEmail(
            branch,
            user.email,
            dto.managerPassword,
            `${user.firstName} ${user.lastName}`,
            role.name,
            tenantId,
          );
        }

        managerUser = {
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: role.name,
          emailSent: mailResult?.emailSent ?? false,
        };
      }
    }

    return {
      ...branch,
      managerUser,
    };
  }

  async findAll(tenantId: string, dto: PaginationDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { code: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        include: {
          warehouses: true,
          _count: {
            select: {
              warehouses: true,
              stockBalances: true,
              sales: true,
              membershipBranches: true,
            },
          },
          membershipBranches: {
            include: {
              membership: {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      firstName: true,
                      lastName: true,
                      phone: true,
                      isActive: true,
                    },
                  },
                  role: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.branch.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId },
      include: {
        warehouses: true,
        _count: {
          select: {
            warehouses: true,
            stockBalances: true,
            sales: true,
            membershipBranches: true,
          },
        },
        membershipBranches: {
          include: {
            membership: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    isActive: true,
                  },
                },
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateBranchDto>) {
    const branch = await this.findOne(tenantId, id);

    if (dto.isDefault) {
      await this.prisma.branch.updateMany({ where: { tenantId }, data: { isDefault: false } });
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.isDefault !== undefined) updateData.isDefault = dto.isDefault;

    const updatedBranch = await this.prisma.branch.update({
      where: { id },
      data: updateData,
    });

    let managerUser: any = null;

    // Determine target manager email
    let managerEmail = dto.managerEmail?.toLowerCase().trim();
    if (!managerEmail) {
      const existingMB = branch.membershipBranches?.[0]?.membership;
      if (existingMB?.user?.email) {
        managerEmail = existingMB.user.email;
      }
    }

    // If manager password change is provided during update
    if (managerEmail && dto.managerPassword) {
      const email = managerEmail;
      const passwordHash = await bcrypt.hash(dto.managerPassword, 12);
      const nameParts = (dto.managerName || 'Branch Manager').trim().split(' ');
      const firstName = nameParts[0] || 'Branch';
      const lastName = nameParts.slice(1).join(' ') || 'Manager';

      let user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email,
            passwordHash,
            firstName,
            lastName,
            isActive: true,
          },
        });
      } else {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash,
            ...(dto.managerName ? { firstName, lastName } : {}),
          },
        });
      }

      const targetRoleName = dto.roleName || 'Manager';
      let role = await this.prisma.role.findFirst({
        where: { tenantId, name: targetRoleName },
      });
      if (!role) {
        role = await this.prisma.role.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'asc' },
        });
      }

      if (role) {
        const membership = await this.prisma.membership.upsert({
          where: { userId_tenantId: { userId: user.id, tenantId } },
          create: { userId: user.id, tenantId, roleId: role.id },
          update: { roleId: role.id },
        });

        await this.prisma.membershipBranch.upsert({
          where: {
            membershipId_branchId: {
              membershipId: membership.id,
              branchId: id,
            },
          },
          create: { membershipId: membership.id, branchId: id },
          update: {},
        });
      }

      let mailResult: any = null;
      if (dto.sendCredentialsEmail !== false) {
        mailResult = await this.sendBranchCredentialsEmail(
          updatedBranch,
          user.email,
          dto.managerPassword,
          `${user.firstName} ${user.lastName}`,
          role?.name || targetRoleName,
          tenantId,
        );
      }

      managerUser = {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: role?.name || targetRoleName,
        passwordChanged: true,
        emailSent: mailResult?.emailSent ?? false,
      };
    }

    const reloaded = await this.findOne(tenantId, id);
    return {
      ...reloaded,
      managerUser,
    };
  }

  async setDefault(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.branch.updateMany({ where: { tenantId }, data: { isDefault: false } });
    return this.prisma.branch.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async remove(tenantId: string, id: string) {
    const branch = await this.findOne(tenantId, id);
    if (branch.isDefault) throw new ConflictException('Cannot delete the default branch');
    return this.prisma.branch.update({ where: { id }, data: { isActive: false } });
  }

  async createWarehouse(tenantId: string, branchId: string, dto: { name: string; code?: string }) {
    await this.findOne(tenantId, branchId);
    const code = dto.code ?? dto.name.toUpperCase().replace(/\s+/g, '-').substring(0, 20);
    const existing = await this.prisma.warehouse.findFirst({ where: { tenantId, code } });
    if (existing) throw new ConflictException('Warehouse code already exists');
    return this.prisma.warehouse.create({ data: { tenantId, branchId, name: dto.name, code } });
  }

  async getWarehouses(tenantId: string, branchId: string) {
    await this.findOne(tenantId, branchId);
    return this.prisma.warehouse.findMany({ where: { tenantId, branchId, isActive: true } });
  }

  async sendBranchCredentialsEmail(
    branch: { name: string; code: string },
    email: string,
    password: string,
    name: string,
    roleName: string,
    tenantId: string,
  ) {
    try {
      const subject = `[Credentials] Access Details for ${branch.name} — InventoryOS Qatar`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #0f172a; margin: 0; font-size: 20px;">InventoryOS Qatar — Store Access Granted</h2>
            <p style="color: #2563eb; font-weight: bold; font-size: 13px; margin: 4px 0 0 0;">Welcome to ${branch.name} (${branch.code})</p>
          </div>
          <p style="color: #334155; font-size: 14px;">Hello <strong>${name}</strong>,</p>
          <p style="color: #334155; font-size: 14px;">Your access account has been created for store branch <strong>${branch.name}</strong> with role <strong>${roleName}</strong>.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h3 style="color: #0f172a; font-size: 14px; margin-top: 0; margin-bottom: 12px;">Login Credentials</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b;">Store Branch:</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #0f172a;">${branch.name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b;">Assigned Role:</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #2563eb;">${roleName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b;">Login Username:</td>
                <td style="padding: 8px 0; font-family: monospace; font-weight: bold; text-align: right; color: #0f172a;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Temporary Password:</td>
                <td style="padding: 8px 0; font-family: monospace; font-weight: bold; text-align: right; color: #059669; font-size: 14px;">${password}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="http://localhost:3000/login" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
              Sign in to POS & Inventory Terminal
            </a>
          </div>

          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">For system security, please update your password after logging in for the first time.</p>
          <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
            <p style="margin: 0;">InventoryOS Enterprise SaaS — Doha, State of Qatar</p>
          </div>
        </div>
      `;

      const result = await this.mailService.sendMail([email], subject, html, tenantId);
      this.logger.log(`Credentials email sent to ${email} for branch ${branch.name}`);
      return { emailSent: result.success, messageId: result.messageId, error: result.error };
    } catch (err: any) {
      this.logger.error(`Failed to send credentials email to ${email}: ${err.message}`);
      return { emailSent: false, error: err.message };
    }
  }

  async getBranchStaff(tenantId: string, branchId: string) {
    await this.findOne(tenantId, branchId);
    const membershipBranches = await this.prisma.membershipBranch.findMany({
      where: { branchId },
      include: {
        membership: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                isActive: true,
                createdAt: true,
              },
            },
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    return membershipBranches.map((mb) => ({
      membershipId: mb.membershipId,
      branchId: mb.branchId,
      user: mb.membership.user,
      role: mb.membership.role,
      isActive: mb.membership.isActive,
    }));
  }

  async assignBranchStaff(tenantId: string, branchId: string, dto: AssignBranchStaffDto) {
    const branch = await this.findOne(tenantId, branchId);
    const email = dto.email.toLowerCase().trim();
    const nameParts = (dto.name || 'Branch Staff').trim().split(' ');
    const firstName = nameParts[0] || 'Branch';
    const lastName = nameParts.slice(1).join(' ') || 'Staff';

    let user = await this.prisma.user.findUnique({ where: { email } });
    const rawPassword = dto.password || 'Staff123!';
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          isActive: true,
        },
      });
    } else if (dto.password) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, firstName, lastName },
      });
    }

    const targetRoleName = dto.roleName || 'Cashier';
    let role = await this.prisma.role.findFirst({
      where: { tenantId, name: targetRoleName },
    });
    if (!role) {
      role = await this.prisma.role.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
      });
    }

    const membership = await this.prisma.membership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId } },
      create: { userId: user.id, tenantId, roleId: role!.id },
      update: { roleId: role!.id },
    });

    await this.prisma.membershipBranch.upsert({
      where: {
        membershipId_branchId: {
          membershipId: membership.id,
          branchId,
        },
      },
      create: { membershipId: membership.id, branchId },
      update: {},
    });

    let mailResult: any = { emailSent: false };
    if (dto.sendCredentialsEmail !== false) {
      mailResult = await this.sendBranchCredentialsEmail(
        branch,
        user.email,
        rawPassword,
        `${user.firstName} ${user.lastName}`,
        role?.name || 'Staff',
        tenantId,
      );
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: role?.name || 'Staff',
      },
      mailResult,
    };
  }

  async removeBranchStaff(tenantId: string, branchId: string, userId: string) {
    await this.findOne(tenantId, branchId);
    const membership = await this.prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });
    if (!membership) throw new NotFoundException('Staff membership not found');

    await this.prisma.membershipBranch.deleteMany({
      where: {
        membershipId: membership.id,
        branchId,
      },
    });

    return { success: true, message: 'User access removed from branch' };
  }

  async resendStaffCredentials(tenantId: string, branchId: string, dto: ResendStaffCredentialsDto) {
    const branch = await this.findOne(tenantId, branchId);
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ id: dto.userId }, { email: dto.userId.toLowerCase().trim() }],
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const membership = await this.prisma.membership.findFirst({
      where: { userId: user.id, tenantId },
      include: { role: true },
    });
    if (!membership) throw new NotFoundException('User is not a member of this tenant');

    const rawPassword = dto.newPassword || 'Store' + Math.floor(100000 + Math.random() * 900000) + '!';
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    let mailResult: any = { emailSent: false };
    if (dto.sendEmail !== false) {
      mailResult = await this.sendBranchCredentialsEmail(
        branch,
        user.email,
        rawPassword,
        `${user.firstName} ${user.lastName}`,
        membership.role?.name || 'Staff',
        tenantId,
      );
    }

    return {
      success: true,
      message: dto.sendEmail !== false
        ? `Credentials sent to ${user.email}`
        : `Password updated successfully for ${user.email}`,
      temporaryPassword: rawPassword,
      mailResult,
    };
  }
}
