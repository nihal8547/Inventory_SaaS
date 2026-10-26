import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SYSTEM_PERMISSIONS = [
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

async function main() {
  console.log('--- STARTING COMPREHENSIVE SEEDING ---');

  // 1. Seed Permissions
  console.log('Seeding system permissions...');
  for (const perm of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      create: { code: perm.code, name: perm.name, module: perm.module },
      update: { name: perm.name, module: perm.module },
    });
  }
  const allPermissions = await prisma.permission.findMany();
  console.log(`✓ Seeded ${allPermissions.length} permissions`);

  // 2. Super Admin User
  const defaultPasswordHash = await bcrypt.hash('Admin123!', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@inventory.com' },
    create: {
      email: 'admin@inventory.com',
      passwordHash: defaultPasswordHash,
      firstName: 'System',
      lastName: 'SuperAdmin',
      isSuperAdmin: true,
      isActive: true,
    },
    update: { isSuperAdmin: true, isActive: true },
  });
  console.log(`✓ Super Admin: ${superAdmin.email}`);

  // 3. Demo Tenant (Standardized to QAR Currency)
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-store' },
    create: {
      name: 'Qatar Retail Hypermarket Group',
      slug: 'demo-store',
      currency: 'QAR',
      timezone: 'Asia/Qatar',
      locale: 'en-QA',
      isActive: true,
    },
    update: {
      currency: 'QAR',
      timezone: 'Asia/Qatar',
      locale: 'en-QA',
    },
  });
  console.log(`✓ Tenant: ${tenant.name} (${tenant.slug}) [Currency: ${tenant.currency}]`);

  // 4. Roles
  const ownerRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Owner' } },
    create: {
      tenantId: tenant.id,
      name: 'Owner',
      description: 'Full administrative access',
      isSystem: true,
      permissions: { create: allPermissions.map((p) => ({ permissionId: p.id })) },
    },
    update: {},
  });

  const managerRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Manager' } },
    create: {
      tenantId: tenant.id,
      name: 'Manager',
      description: 'Store operations & inventory manager',
      permissions: {
        create: allPermissions
          .filter((p) => !p.code.includes('delete') && !p.code.includes('branches.delete'))
          .map((p) => ({ permissionId: p.id })),
      },
    },
    update: {},
  });

  const cashierRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Cashier' } },
    create: {
      tenantId: tenant.id,
      name: 'Cashier',
      description: 'Point of Sale & Checkout access',
      permissions: {
        create: allPermissions
          .filter((p) =>
            ['sales.read', 'sales.create', 'products.read', 'inventory.read', 'reports.dashboard'].includes(p.code)
          )
          .map((p) => ({ permissionId: p.id })),
      },
    },
    update: {},
  });

  // 5. Team Users & Memberships
  const teamUsers = [
    { email: 'owner@demo-store.com', first: 'Nasser', last: 'Al-Kuwari', role: ownerRole },
    { email: 'manager@demo-store.com', first: 'Tariq', last: 'Mahmoud', role: managerRole },
    { email: 'cashier@demo-store.com', first: 'Fatima', last: 'Zahra', role: cashierRole },
  ];

  const createdTeamUsers: any[] = [];
  for (const tu of teamUsers) {
    const u = await prisma.user.upsert({
      where: { email: tu.email },
      create: {
        email: tu.email,
        passwordHash: defaultPasswordHash,
        firstName: tu.first,
        lastName: tu.last,
        isActive: true,
      },
      update: { isActive: true },
    });
    createdTeamUsers.push(u);

    await prisma.membership.upsert({
      where: { userId_tenantId: { userId: u.id, tenantId: tenant.id } },
      create: { userId: u.id, tenantId: tenant.id, roleId: tu.role.id },
      update: { roleId: tu.role.id },
    });
  }
  // Also add testAdmin and superAdmin to the tenant as Owner
  const testUserPasswordHash = await bcrypt.hash('test@123', 12);
  const testAdmin = await prisma.user.upsert({
    where: { email: 'test@admin.com' },
    create: {
      email: 'test@admin.com',
      passwordHash: testUserPasswordHash,
      firstName: 'Test',
      lastName: 'Admin',
      isSuperAdmin: true,
      isActive: true,
    },
    update: {
      passwordHash: testUserPasswordHash,
      isSuperAdmin: true,
      isActive: true,
    },
  });

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: testAdmin.id, tenantId: tenant.id } },
    create: { userId: testAdmin.id, tenantId: tenant.id, roleId: ownerRole.id },
    update: { roleId: ownerRole.id },
  });

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: superAdmin.id, tenantId: tenant.id } },
    create: { userId: superAdmin.id, tenantId: tenant.id, roleId: ownerRole.id },
    update: { roleId: ownerRole.id },
  });
  console.log('✓ Users & Role Memberships created (including test@admin.com)');

  // 6. Multi Branches (Doha, Al Rayyan, Lusail)
  const branchDoha = await prisma.branch.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'DOH-MAIN' } },
    create: {
      tenantId: tenant.id,
      name: 'Doha City Center Branch',
      code: 'DOH-MAIN',
      address: 'West Bay Commercial District, Tower 3',
      city: 'Doha',
      phone: '+974 4411 2233',
      email: 'doha@demoretail.qa',
      isDefault: true,
      isActive: true,
    },
    update: { isDefault: true, isActive: true },
  });

  const branchRayyan = await prisma.branch.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'RAY-002' } },
    create: {
      tenantId: tenant.id,
      name: 'Al Rayyan Retail Branch',
      code: 'RAY-002',
      address: 'Al Shafi Commercial St, Building 45',
      city: 'Al Rayyan',
      phone: '+974 4422 5566',
      email: 'rayyan@demoretail.qa',
      isDefault: false,
      isActive: true,
    },
    update: { isActive: true },
  });

  const branchLusail = await prisma.branch.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'LUS-003' } },
    create: {
      tenantId: tenant.id,
      name: 'Lusail Marina Branch',
      code: 'LUS-003',
      address: 'Marina Promenade Retail Level 1',
      city: 'Lusail',
      phone: '+974 4433 7788',
      email: 'lusail@demoretail.qa',
      isDefault: false,
      isActive: true,
    },
    update: { isActive: true },
  });
  console.log('✓ 3 Retail Branches established in Qatar');

  // 7. Warehouses
  const whDohaShow = await prisma.warehouse.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'WH-DOH-SHOW' } },
    create: {
      tenantId: tenant.id,
      branchId: branchDoha.id,
      name: 'Doha Showroom Floor',
      code: 'WH-DOH-SHOW',
      isDefault: true,
    },
    update: {},
  });

  const whDohaCentral = await prisma.warehouse.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'WH-DOH-HUB' } },
    create: {
      tenantId: tenant.id,
      branchId: branchDoha.id,
      name: 'Central Logistics Depot',
      code: 'WH-DOH-HUB',
      isDefault: false,
    },
    update: {},
  });

  const whRayyan = await prisma.warehouse.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'WH-RAY-01' } },
    create: {
      tenantId: tenant.id,
      branchId: branchRayyan.id,
      name: 'Rayyan Stock Storage',
      code: 'WH-RAY-01',
      isDefault: true,
    },
    update: {},
  });

  const whLusail = await prisma.warehouse.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'WH-LUS-01' } },
    create: {
      tenantId: tenant.id,
      branchId: branchLusail.id,
      name: 'Lusail Marina Stockroom',
      code: 'WH-LUS-01',
      isDefault: true,
    },
    update: {},
  });
  console.log('✓ 4 Warehouses established');

  // 8. Units
  const unitPcs = await prisma.unit.upsert({
    where: { id: 'unit-pcs' },
    create: {
      id: 'unit-pcs',
      tenantId: tenant.id,
      name: 'Piece',
      abbreviation: 'PCS',
      type: 'PIECE',
      isBase: true,
    },
    update: {},
  });

  const unitBox = await prisma.unit.upsert({
    where: { id: 'unit-box' },
    create: {
      id: 'unit-box',
      tenantId: tenant.id,
      name: 'Box',
      abbreviation: 'BOX',
      type: 'PIECE',
      isBase: false,
    },
    update: {},
  });

  // 9. Categories
  const categoriesData = [
    { name: 'Smartphones & Tablets', slug: 'smartphones-tablets', desc: 'Flagship mobile devices and tablets' },
    { name: 'Laptops & Computing', slug: 'laptops-computing', desc: 'High-performance laptops, PCs and monitors' },
    { name: 'Audio & Wearables', slug: 'audio-wearables', desc: 'Premium headphones, earbuds, smart watches' },
    { name: 'Home Appliances & Living', slug: 'home-appliances', desc: 'Smart kitchen and cordless cleaning technology' },
    { name: 'Computer Accessories', slug: 'computer-accessories', desc: 'Keyboards, wireless mice, and portable storage' },
  ];

  const createdCategories: any = {};
  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: c.slug } },
      create: { tenantId: tenant.id, name: c.name, slug: c.slug, description: c.desc },
      update: { name: c.name, description: c.desc },
    });
    createdCategories[c.slug] = cat;
  }
  console.log('✓ Product categories created');

  // 10. Brands
  const brandsData = ['Apple', 'Samsung', 'Sony', 'Dell', 'Logitech', 'Nespresso', 'Dyson', 'Anker', 'SanDisk'];
  const createdBrands: any = {};
  for (const bName of brandsData) {
    const existing = await prisma.brand.findFirst({ where: { tenantId: tenant.id, name: bName } });
    if (existing) {
      createdBrands[bName] = existing;
    } else {
      const created = await prisma.brand.create({
        data: { tenantId: tenant.id, name: bName, description: `${bName} Official Products` },
      });
      createdBrands[bName] = created;
    }
  }
  console.log('✓ Brands created');

  // 11. Products Master List (Realistic items in QAR)
  const productsCatalog = [
    {
      sku: 'APL-IP16PM-256',
      name: 'Apple iPhone 16 Pro Max 256GB Desert Titanium',
      description: 'Apple A18 Pro chip, 48MP Fusion Camera, Super Retina XDR with ProMotion',
      cat: 'smartphones-tablets',
      brand: 'Apple',
      costPrice: 4100.0,
      sellingPrice: 4699.0,
      barcode: '0195949038234',
      dohaStock: 45,
      rayyanStock: 22,
      lusailStock: 18,
    },
    {
      sku: 'SAM-S24U-512',
      name: 'Samsung Galaxy S24 Ultra 512GB Titanium Gray',
      description: 'Snapdragon 8 Gen 3 for Galaxy, Galaxy AI, 200MP Quad Telephoto Camera',
      cat: 'smartphones-tablets',
      brand: 'Samsung',
      costPrice: 3800.0,
      sellingPrice: 4399.0,
      barcode: '8806095304891',
      dohaStock: 38,
      rayyanStock: 15,
      lusailStock: 14,
    },
    {
      sku: 'APL-MBP14-M3P',
      name: 'Apple MacBook Pro 14" M3 Pro 18GB/512GB Space Black',
      description: 'Liquid Retina XDR display, up to 18 hours battery life, HDMI & MagSafe 3',
      cat: 'laptops-computing',
      brand: 'Apple',
      costPrice: 6800.0,
      sellingPrice: 7699.0,
      barcode: '0195949120489',
      dohaStock: 20,
      rayyanStock: 8,
      lusailStock: 10,
    },
    {
      sku: 'DEL-XPS15-9530',
      name: 'Dell XPS 15 9530 Core i7 32GB 1TB RTX 4060 OLED',
      description: '15.6" 3.5K OLED Touch, 13th Gen Intel Core i7-13700H, Platinum Silver',
      cat: 'laptops-computing',
      brand: 'Dell',
      costPrice: 5900.0,
      sellingPrice: 6799.0,
      barcode: '5397184839201',
      dohaStock: 14,
      rayyanStock: 6,
      lusailStock: 5,
    },
    {
      sku: 'SNY-WH1000XM5',
      name: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
      description: 'Industry leading noise cancellation, Auto NC Optimizer, 30 hours battery',
      cat: 'audio-wearables',
      brand: 'Sony',
      costPrice: 950.0,
      sellingPrice: 1249.0,
      barcode: '4548736132580',
      dohaStock: 65,
      rayyanStock: 30,
      lusailStock: 25,
    },
    {
      sku: 'APL-APP2-USBC',
      name: 'Apple AirPods Pro 2nd Generation USB-C MagSafe',
      description: 'Active Noise Cancellation, Adaptive Audio, Transparency mode, dust & water resistant',
      cat: 'audio-wearables',
      brand: 'Apple',
      costPrice: 680.0,
      sellingPrice: 849.0,
      barcode: '0195949052445',
      dohaStock: 90,
      rayyanStock: 40,
      lusailStock: 35,
    },
    {
      sku: 'LOG-MXM3S-BLK',
      name: 'Logitech MX Master 3S Wireless Performance Mouse',
      description: 'Quiet Clicks, 8K DPI any-surface tracking, MagSpeed electromagnetic scrolling',
      cat: 'computer-accessories',
      brand: 'Logitech',
      costPrice: 280.0,
      sellingPrice: 389.0,
      barcode: '5099206103726',
      dohaStock: 80,
      rayyanStock: 35,
      lusailStock: 30,
    },
    {
      sku: 'APL-AWU2-49TI',
      name: 'Apple Watch Ultra 2 GPS + Cellular 49mm Titanium',
      description: 'Most rugged and capable Apple Watch, precision dual-frequency GPS, 3000 nits display',
      cat: 'audio-wearables',
      brand: 'Apple',
      costPrice: 2600.0,
      sellingPrice: 2999.0,
      barcode: '0195949019288',
      dohaStock: 25,
      rayyanStock: 10,
      lusailStock: 12,
    },
    {
      sku: 'SAM-MON-G8-32',
      name: 'Samsung 32" Odyssey Neo G8 4K UHD 240Hz Gaming Monitor',
      description: 'Quantum Mini-LED, 1ms response time, 1000R curved screen, CoreSync lighting',
      cat: 'laptops-computing',
      brand: 'Samsung',
      costPrice: 3100.0,
      sellingPrice: 3699.0,
      barcode: '8806094389201',
      dohaStock: 12,
      rayyanStock: 4,
      lusailStock: 6,
    },
    {
      sku: 'NES-VERTUO-POP',
      name: 'Nespresso Vertuo Pop Coffee Machine Coconut White',
      description: 'Centrifusion technology, 4 cup sizes, compact design, fast 30s heat-up',
      cat: 'home-appliances',
      brand: 'Nespresso',
      costPrice: 420.0,
      sellingPrice: 599.0,
      barcode: '7630472489201',
      dohaStock: 40,
      rayyanStock: 18,
      lusailStock: 15,
    },
    {
      sku: 'DYS-V15-ABS',
      name: 'Dyson V15 Detect Absolute Cordless Vacuum Cleaner',
      description: 'Laser reveals invisible dust, piezo sensor measures particles, up to 60m run time',
      cat: 'home-appliances',
      brand: 'Dyson',
      costPrice: 2200.0,
      sellingPrice: 2799.0,
      barcode: '5025155069201',
      dohaStock: 18,
      rayyanStock: 7,
      lusailStock: 9,
    },
    {
      sku: 'ANK-PB-20K-200W',
      name: 'Anker Prime 20,000mAh Power Bank 200W Multi-Port',
      description: 'Ultra-fast 200W total output, smart digital display, compact travel form factor',
      cat: 'computer-accessories',
      brand: 'Anker',
      costPrice: 320.0,
      sellingPrice: 449.0,
      barcode: '0848061062901',
      dohaStock: 70,
      rayyanStock: 30,
      lusailStock: 25,
    },
    {
      sku: 'SND-SSD-1TB',
      name: 'SanDisk 1TB Extreme Portable SSD USB-C 1050MB/s',
      description: 'Rugged NVMe solid state performance, IP55 water & dust resistance, carabiner loop',
      cat: 'computer-accessories',
      brand: 'SanDisk',
      costPrice: 310.0,
      sellingPrice: 429.0,
      barcode: '0619659183920',
      dohaStock: 85,
      rayyanStock: 35,
      lusailStock: 30,
    },
    {
      sku: 'SNY-PS5-SLIM',
      name: 'Sony PlayStation 5 Slim 1TB Disc Edition Console',
      description: 'Slim design, 1TB SSD storage, Ray tracing support, 4K 120Hz gaming, Tempest 3D Audio',
      cat: 'audio-wearables',
      brand: 'Sony',
      costPrice: 1650.0,
      sellingPrice: 1949.0,
      barcode: '4948872415927',
      dohaStock: 30,
      rayyanStock: 12,
      lusailStock: 15,
    },
    {
      sku: 'LOG-G915-WL',
      name: 'Logitech G915 LIGHTSPEED Wireless Mechanical Keyboard',
      description: 'Low profile GL switches, aircraft-grade aluminum alloy, RGB LIGHTSYNC',
      cat: 'computer-accessories',
      brand: 'Logitech',
      costPrice: 620.0,
      sellingPrice: 799.0,
      barcode: '5099206089201',
      dohaStock: 25,
      rayyanStock: 10,
      lusailStock: 8,
    },
  ];

  const createdProducts: any[] = [];

  for (const item of productsCatalog) {
    const product = await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: item.sku } },
      create: {
        tenantId: tenant.id,
        sku: item.sku,
        name: item.name,
        description: item.description,
        categoryId: createdCategories[item.cat]?.id,
        brandId: createdBrands[item.brand]?.id,
        unitId: unitPcs.id,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        wholesalePrice: Math.round(item.sellingPrice * 0.92),
        taxRate: 0.0, // Qatar Standard zero-rated sales tax
        trackInventory: true,
        isActive: true,
      },
      update: {
        name: item.name,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        wholesalePrice: Math.round(item.sellingPrice * 0.92),
      },
    });

    createdProducts.push(product);

    // Primary Barcode
    await prisma.barcode.upsert({
      where: {
        tenantId_barcodeValue_barcodeType: {
          tenantId: tenant.id,
          barcodeValue: item.barcode,
          barcodeType: 'INTERNAL',
        },
      },
      create: {
        tenantId: tenant.id,
        productId: product.id,
        barcodeValue: item.barcode,
        barcodeFormat: 'EAN13',
        barcodeType: 'INTERNAL',
        isPrimary: true,
      },
      update: { isPrimary: true },
    });

    // Stock Balances across branches
    // Doha Showroom
    await prisma.stockBalance.upsert({
      where: {
        tenantId_productId_productVariantId_branchId_warehouseId: {
          tenantId: tenant.id,
          productId: product.id,
          productVariantId: '',
          branchId: branchDoha.id,
          warehouseId: whDohaShow.id,
        },
      },
      create: {
        tenantId: tenant.id,
        productId: product.id,
        branchId: branchDoha.id,
        warehouseId: whDohaShow.id,
        onHand: item.dohaStock,
        reserved: 2,
        reorderLevel: 10,
      },
      update: { onHand: item.dohaStock },
    });

    // Rayyan Branch
    await prisma.stockBalance.upsert({
      where: {
        tenantId_productId_productVariantId_branchId_warehouseId: {
          tenantId: tenant.id,
          productId: product.id,
          productVariantId: '',
          branchId: branchRayyan.id,
          warehouseId: whRayyan.id,
        },
      },
      create: {
        tenantId: tenant.id,
        productId: product.id,
        branchId: branchRayyan.id,
        warehouseId: whRayyan.id,
        onHand: item.rayyanStock,
        reserved: 0,
        reorderLevel: 5,
      },
      update: { onHand: item.rayyanStock },
    });

    // Lusail Branch
    await prisma.stockBalance.upsert({
      where: {
        tenantId_productId_productVariantId_branchId_warehouseId: {
          tenantId: tenant.id,
          productId: product.id,
          productVariantId: '',
          branchId: branchLusail.id,
          warehouseId: whLusail.id,
        },
      },
      create: {
        tenantId: tenant.id,
        productId: product.id,
        branchId: branchLusail.id,
        warehouseId: whLusail.id,
        onHand: item.lusailStock,
        reserved: 1,
        reorderLevel: 8,
      },
      update: { onHand: item.lusailStock },
    });
  }
  console.log(`✓ ${createdProducts.length} Products created with Barcodes and Multi-Branch Stock Balances`);

  // 12. Suppliers
  const suppliersData = [
    {
      name: 'Qatar Wholesale Distribution Co.',
      contactPerson: 'Tariq Al-Mahmoud',
      email: 'sales@qatarwholesale.qa',
      phone: '+974 4455 1122',
      address: 'Industrial Area, Street 24, Doha',
      taxNumber: 'QA-CR-99214',
    },
    {
      name: 'Gulf Electronics Logistics Hub',
      contactPerson: 'Sunil Verma',
      email: 'distribution@gulfelectronics.com',
      phone: '+974 4488 3344',
      address: 'Free Zone Logistics Park, Ras Bufontas',
      taxNumber: 'QA-CR-88319',
    },
    {
      name: 'Al Mana Trading & Consumer Tech',
      contactPerson: 'Khalid Al-Kuwari',
      email: 'commercial@almanatech.qa',
      phone: '+974 4477 9900',
      address: 'C-Ring Road, Al Mana Commercial Tower',
      taxNumber: 'QA-CR-77402',
    },
  ];

  const createdSuppliers: any[] = [];
  for (const s of suppliersData) {
    const existing = await prisma.supplier.findFirst({ where: { tenantId: tenant.id, name: s.name } });
    if (existing) {
      createdSuppliers.push(existing);
    } else {
      const created = await prisma.supplier.create({
        data: {
          tenantId: tenant.id,
          name: s.name,
          contactPerson: s.contactPerson,
          email: s.email,
          phone: s.phone,
          address: s.address,
          taxNumber: s.taxNumber,
        },
      });
      createdSuppliers.push(created);
    }
  }
  console.log(`✓ ${createdSuppliers.length} Suppliers seeded`);

  // 13. Customers
  const customersData = [
    { name: 'Sheikh Nasser Al-Thani', email: 'nasser.thani@gmail.com', phone: '+974 5511 2233', points: 1250 },
    { name: 'Mohammed Al-Kuwari', email: 'm.kuwari@outlook.com', phone: '+974 6622 3344', points: 640 },
    { name: 'Sara Al-Sulaiti', email: 'sara.sulaiti@yahoo.com', phone: '+974 5599 8877', points: 420 },
    { name: 'Apex Technologies LLC', email: 'procurement@apextech.qa', phone: '+974 4400 1122', points: 3500 },
    { name: 'Rashid Trading & Contracting', email: 'rashid@rtc.qa', phone: '+974 4488 7766', points: 890 },
  ];

  const createdCustomers: any[] = [];
  for (const cd of customersData) {
    const existing = await prisma.customer.findFirst({ where: { tenantId: tenant.id, name: cd.name } });
    if (existing) {
      createdCustomers.push(existing);
    } else {
      const created = await prisma.customer.create({
        data: {
          tenantId: tenant.id,
          name: cd.name,
          email: cd.email,
          phone: cd.phone,
          loyaltyPoints: cd.points,
        },
      });
      createdCustomers.push(created);
    }
  }
  console.log(`✓ ${createdCustomers.length} Retail Customers seeded`);

  // 14. Purchase Orders & Goods Receipts
  const po1 = await prisma.purchaseOrder.upsert({
    where: { tenantId_poNumber: { tenantId: tenant.id, poNumber: 'PO-2026-001' } },
    create: {
      tenantId: tenant.id,
      poNumber: 'PO-2026-001',
      status: 'RECEIVED',
      supplierId: createdSuppliers[0].id,
      branchId: branchDoha.id,
      totalAmount: 48600.0,
      notes: 'Initial Q4 flagship inventory replenishment',
      lines: {
        create: [
          {
            productId: createdProducts[0].id,
            quantity: 10,
            receivedQuantity: 10,
            unitPrice: 4100.0,
            totalPrice: 41000.0,
          },
          {
            productId: createdProducts[4].id,
            quantity: 8,
            receivedQuantity: 8,
            unitPrice: 950.0,
            totalPrice: 7600.0,
          },
        ],
      },
    },
    update: {},
  });

  const po2 = await prisma.purchaseOrder.upsert({
    where: { tenantId_poNumber: { tenantId: tenant.id, poNumber: 'PO-2026-002' } },
    create: {
      tenantId: tenant.id,
      poNumber: 'PO-2026-002',
      status: 'APPROVED',
      supplierId: createdSuppliers[1].id,
      branchId: branchRayyan.id,
      totalAmount: 22800.0,
      notes: 'Laptops and audio accessories stock order',
      lines: {
        create: [
          {
            productId: createdProducts[2].id,
            quantity: 3,
            receivedQuantity: 0,
            unitPrice: 6800.0,
            totalPrice: 20400.0,
          },
          {
            productId: createdProducts[6].id,
            quantity: 8,
            receivedQuantity: 0,
            unitPrice: 300.0,
            totalPrice: 2400.0,
          },
        ],
      },
    },
    update: {},
  });

  const po3 = await prisma.purchaseOrder.upsert({
    where: { tenantId_poNumber: { tenantId: tenant.id, poNumber: 'PO-2026-003' } },
    create: {
      tenantId: tenant.id,
      poNumber: 'PO-2026-003',
      status: 'DRAFT',
      supplierId: createdSuppliers[2].id,
      branchId: branchLusail.id,
      totalAmount: 14500.0,
      notes: 'Weekly store replenishment draft',
      lines: {
        create: [
          {
            productId: createdProducts[5].id,
            quantity: 15,
            receivedQuantity: 0,
            unitPrice: 680.0,
            totalPrice: 10200.0,
          },
          {
            productId: createdProducts[9].id,
            quantity: 10,
            receivedQuantity: 0,
            unitPrice: 430.0,
            totalPrice: 4300.0,
          },
        ],
      },
    },
    update: {},
  });
  console.log('✓ Purchase Orders seeded (RECEIVED, APPROVED, DRAFT)');

  // 15. Sales Transactions in QAR
  const cashierUser = createdTeamUsers[2] || superAdmin;

  const salesData = [
    {
      saleNumber: 'INV-2026-1001',
      branch: branchDoha,
      customer: createdCustomers[0],
      items: [
        { prod: createdProducts[0], qty: 1, price: 4699.0 },
        { prod: createdProducts[5], qty: 1, price: 849.0 },
      ],
      method: 'CARD',
      daysAgo: 4,
    },
    {
      saleNumber: 'INV-2026-1002',
      branch: branchDoha,
      customer: createdCustomers[1],
      items: [
        { prod: createdProducts[1], qty: 1, price: 4399.0 },
        { prod: createdProducts[6], qty: 1, price: 389.0 },
      ],
      method: 'CASH',
      daysAgo: 3,
    },
    {
      saleNumber: 'INV-2026-1003',
      branch: branchRayyan,
      customer: createdCustomers[2],
      items: [
        { prod: createdProducts[4], qty: 1, price: 1249.0 },
        { prod: createdProducts[11], qty: 2, price: 449.0 },
      ],
      method: 'CARD',
      daysAgo: 2,
    },
    {
      saleNumber: 'INV-2026-1004',
      branch: branchLusail,
      customer: createdCustomers[3],
      items: [
        { prod: createdProducts[2], qty: 2, price: 7699.0 },
        { prod: createdProducts[6], qty: 2, price: 389.0 },
      ],
      method: 'BANK_TRANSFER',
      daysAgo: 1,
    },
    {
      saleNumber: 'INV-2026-1005',
      branch: branchDoha,
      customer: createdCustomers[4],
      items: [
        { prod: createdProducts[13], qty: 1, price: 1949.0 },
        { prod: createdProducts[12], qty: 1, price: 429.0 },
      ],
      method: 'CARD',
      daysAgo: 0,
    },
  ];

  for (const s of salesData) {
    const total = s.items.reduce((sum, item) => sum + item.qty * item.price, 0);
    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - s.daysAgo);

    const createdSale = await prisma.sale.upsert({
      where: { tenantId_saleNumber: { tenantId: tenant.id, saleNumber: s.saleNumber } },
      create: {
        tenantId: tenant.id,
        saleNumber: s.saleNumber,
        status: 'COMPLETED',
        branchId: s.branch.id,
        customerId: s.customer.id,
        cashierId: cashierUser.id,
        subtotal: total,
        discount: 0,
        tax: 0,
        total: total,
        createdAt: saleDate,
        lines: {
          create: s.items.map((it) => ({
            productId: it.prod.id,
            quantity: it.qty,
            unitPrice: it.price,
            total: it.qty * it.price,
          })),
        },
        payments: {
          create: [
            {
              method: s.method,
              amount: total,
              reference: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
            },
          ],
        },
      },
      update: {},
    });
  }
  console.log(`✓ ${salesData.length} Sales Transactions seeded with Payment records in QAR`);

  // 16. Inter-Branch Stock Transfers
  await prisma.stockTransfer.upsert({
    where: { tenantId_transferNumber: { tenantId: tenant.id, transferNumber: 'TRF-2026-001' } },
    create: {
      tenantId: tenant.id,
      transferNumber: 'TRF-2026-001',
      status: 'COMPLETED',
      sourceBranchId: branchDoha.id,
      destinationBranchId: branchLusail.id,
      sourceWarehouseId: whDohaShow.id,
      destinationWarehouseId: whLusail.id,
      notes: 'Urgent weekend inventory balancing for Lusail branch',
      lines: {
        create: [
          {
            productId: createdProducts[0].id,
            requestedQuantity: 5,
            dispatchedQuantity: 5,
            receivedQuantity: 5,
          },
          {
            productId: createdProducts[4].id,
            requestedQuantity: 6,
            dispatchedQuantity: 6,
            receivedQuantity: 6,
          },
        ],
      },
    },
    update: {},
  });

  await prisma.stockTransfer.upsert({
    where: { tenantId_transferNumber: { tenantId: tenant.id, transferNumber: 'TRF-2026-002' } },
    create: {
      tenantId: tenant.id,
      transferNumber: 'TRF-2026-002',
      status: 'IN_TRANSIT',
      sourceBranchId: branchDoha.id,
      destinationBranchId: branchRayyan.id,
      sourceWarehouseId: whDohaCentral.id,
      destinationWarehouseId: whRayyan.id,
      notes: 'Scheduled inter-store van transfer en-route',
      lines: {
        create: [
          {
            productId: createdProducts[1].id,
            requestedQuantity: 4,
            dispatchedQuantity: 4,
          },
          {
            productId: createdProducts[5].id,
            requestedQuantity: 10,
            dispatchedQuantity: 10,
          },
        ],
      },
    },
    update: {},
  });
  console.log('✓ Inter-branch Stock Transfers seeded (COMPLETED & IN_TRANSIT)');

  // 17. Stock Count Audit Sessions
  await prisma.stockCount.upsert({
    where: { tenantId_countNumber: { tenantId: tenant.id, countNumber: 'SC-2026-001' } },
    create: {
      tenantId: tenant.id,
      countNumber: 'SC-2026-001',
      status: 'COMPLETED',
      branchId: branchDoha.id,
      warehouseId: whDohaShow.id,
      notes: 'Monthly physical inventory audit - Doha City Center',
      completedAt: new Date(),
      lines: {
        create: [
          {
            productId: createdProducts[0].id,
            expectedQuantity: 45,
            countedQuantity: 45,
            variance: 0,
          },
          {
            productId: createdProducts[1].id,
            expectedQuantity: 38,
            countedQuantity: 37,
            variance: -1,
            notes: '1 display model variance investigated',
          },
        ],
      },
    },
    update: {},
  });

  await prisma.stockCount.upsert({
    where: { tenantId_countNumber: { tenantId: tenant.id, countNumber: 'SC-2026-002' } },
    create: {
      tenantId: tenant.id,
      countNumber: 'SC-2026-002',
      status: 'IN_PROGRESS',
      branchId: branchRayyan.id,
      warehouseId: whRayyan.id,
      notes: 'Mid-month spot check - Al Rayyan store',
      startedAt: new Date(),
      lines: {
        create: [
          {
            productId: createdProducts[4].id,
            expectedQuantity: 30,
            countedQuantity: 30,
            variance: 0,
          },
        ],
      },
    },
    update: {},
  });
  console.log('✓ Stock Counts audit sessions seeded');

  // 19. Operating Expenses in QAR
  const expensesData = [
    {
      voucherNumber: 'EXP-2026-0001',
      category: 'Store Rent & Lease',
      payee: 'Qatar Real Estate Co.',
      amount: 12500.0,
      paymentMethod: 'BANK_TRANSFER',
      branch: branchDoha,
      notes: 'Monthly showroom retail lease - Doha City Center',
    },
    {
      voucherNumber: 'EXP-2026-0002',
      category: 'Utilities & Power',
      payee: 'Kahramaa Qatar General Electricity & Water',
      amount: 1450.0,
      paymentMethod: 'BANK_TRANSFER',
      branch: branchDoha,
      notes: 'Electricity and utility tariff for billing cycle',
    },
    {
      voucherNumber: 'EXP-2026-0003',
      category: 'Staff Allowances & Transport',
      payee: 'Fleet Logistics & Store Drivers',
      amount: 2200.0,
      paymentMethod: 'CASH',
      branch: branchRayyan,
      notes: 'Delivery fuel allowance and maintenance for store vans',
    },
    {
      voucherNumber: 'EXP-2026-0004',
      category: 'Packaging & Bags',
      payee: 'Gulf Paper & Poly Industries',
      amount: 850.0,
      paymentMethod: 'CASH',
      branch: branchLusail,
      notes: 'Thermal receipt rolls & branded retail carry bags',
    },
  ];

  for (const exp of expensesData) {
    await (prisma as any).expense.upsert({
      where: {
        tenantId_voucherNumber: {
          tenantId: tenant.id,
          voucherNumber: exp.voucherNumber,
        },
      },
      create: {
        tenantId: tenant.id,
        voucherNumber: exp.voucherNumber,
        category: exp.category,
        payee: exp.payee,
        amount: exp.amount,
        paymentMethod: exp.paymentMethod,
        branchId: exp.branch.id,
        notes: exp.notes,
        createdBy: superAdmin.id,
      },
      update: {},
    });
  }
  console.log(`✓ ${expensesData.length} Operating Expense Vouchers seeded in QAR`);


  console.log('--- COMPREHENSIVE SEEDING COMPLETED SUCCESSFULLY! ---');
  console.log('Store Credentials for Testing:');
  console.log('  Admin Login: admin@inventory.com / Admin123!');
  console.log('  Owner Login: owner@demo-store.com / Admin123!');
  console.log('  Manager Login: manager@demo-store.com / Admin123!');
  console.log('  Cashier Login: cashier@demo-store.com / Admin123!');
  console.log('  Tenant Slug: demo-store');
  console.log('  Currency: QAR');
}

main()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
