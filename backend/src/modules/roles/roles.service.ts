import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export const SYSTEM_PERMISSIONS = [
  { code: 'products.read', name: 'View Products', module: 'products' },
  { code: 'products.create', name: 'Create Products', module: 'products' },
  { code: 'products.update', name: 'Update Products', module: 'products' },
  { code: 'products.delete', name: 'Delete Products', module: 'products' },
  { code: 'products.barcode.generate', name: 'Generate Barcodes', module: 'products' },
  { code: 'products.barcode.print', name: 'Print Barcodes', module: 'products' },
  { code: 'inventory.read', name: 'View Inventory', module: 'inventory' },
  { code: 'inventory.adjust', name: 'Adjust Stock', module: 'inventory' },
  { code: 'inventory.transfer.create', name: 'Create Transfers', module: 'inventory' },
  { code: 'inventory.transfer.approve', name: 'Approve Transfers', module: 'inventory' },
  { code: 'inventory.stock-count.create', name: 'Create Stock Counts', module: 'inventory' },
  { code: 'inventory.stock-count.approve', name: 'Approve Stock Counts', module: 'inventory' },
  { code: 'sales.read', name: 'View Sales', module: 'sales' },
  { code: 'sales.create', name: 'Create Sales', module: 'sales' },
  { code: 'sales.void', name: 'Void Sales', module: 'sales' },
  { code: 'purchasing.read', name: 'View Purchasing', module: 'purchasing' },
  { code: 'purchasing.suppliers.create', name: 'Manage Suppliers', module: 'purchasing' },
  { code: 'purchasing.orders.create', name: 'Create Purchase Orders', module: 'purchasing' },
  { code: 'purchasing.orders.approve', name: 'Approve Purchase Orders', module: 'purchasing' },
  { code: 'purchasing.orders.receive', name: 'Receive Goods', module: 'purchasing' },
  { code: 'reports.dashboard', name: 'View Dashboard', module: 'reports' },
  { code: 'reports.sales', name: 'View Sales Reports', module: 'reports' },
  { code: 'reports.inventory', name: 'View Inventory Reports', module: 'reports' },
  { code: 'reports.purchasing', name: 'View Purchase Reports', module: 'reports' },
  { code: 'users.read', name: 'View Users', module: 'users' },
  { code: 'users.invite', name: 'Invite Users', module: 'users' },
  { code: 'users.update', name: 'Update Users', module: 'users' },
  { code: 'users.delete', name: 'Remove Users', module: 'users' },
  { code: 'branches.read', name: 'View Branches', module: 'branches' },
  { code: 'branches.create', name: 'Create Branches', module: 'branches' },
  { code: 'branches.update', name: 'Update Branches', module: 'branches' },
  { code: 'branches.delete', name: 'Delete Branches', module: 'branches' },
];

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async seedPermissions() {
    const results: any[] = [];
    for (const perm of SYSTEM_PERMISSIONS) {
      const result = await this.prisma.permission.upsert({
        where: { code: perm.code },
        create: { code: perm.code, name: perm.name, module: perm.module },
        update: { name: perm.name, module: perm.module },
      });
      results.push(result);
    }
    return results;
  }

  async findAll(tenantId: string) {
    return this.prisma.role.findMany({
      where: { OR: [{ tenantId }, { tenantId: null, isSystem: true }] },
      include: { permissions: { include: { permission: true } }, _count: { select: { memberships: true } } },
    });
  }

  async findAllPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { name: 'asc' }] });
  }

  async findOne(tenantId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, OR: [{ tenantId }, { tenantId: null, isSystem: true }] },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(tenantId: string, dto: { name: string; description?: string; permissionCodes?: string[] }) {
    const permissions = dto.permissionCodes
      ? await this.prisma.permission.findMany({ where: { code: { in: dto.permissionCodes } } })
      : [];

    return this.prisma.role.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        permissions: {
          create: permissions.map(p => ({ permissionId: p.id })),
        },
      },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async update(tenantId: string, id: string, dto: { name?: string; description?: string; permissionCodes?: string[] }) {
    await this.findOne(tenantId, id);

    if (dto.permissionCodes !== undefined) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      const permissions = await this.prisma.permission.findMany({ where: { code: { in: dto.permissionCodes } } });
      await this.prisma.rolePermission.createMany({
        data: permissions.map(p => ({ roleId: id, permissionId: p.id })),
      });
    }

    return this.prisma.role.update({
      where: { id },
      data: { name: dto.name, description: dto.description },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async remove(tenantId: string, id: string) {
    const role = await this.findOne(tenantId, id);
    if (role.isSystem) throw new Error('Cannot delete system roles');
    return this.prisma.role.delete({ where: { id } });
  }
}
