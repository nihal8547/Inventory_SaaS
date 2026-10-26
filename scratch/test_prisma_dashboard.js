const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.log('No tenant found');
    return;
  }
  const tenantId = tenant.id;
  console.log('Testing for tenant:', tenantId);

  const [productsCount, balancesCount, salesCount, poCount, transferCount] = await Promise.all([
    prisma.product.count({ where: { tenantId } }),
    prisma.stockBalance.count({ where: { tenantId } }),
    prisma.sale.count({ where: { tenantId } }),
    prisma.purchaseOrder.count({ where: { tenantId } }),
    prisma.stockTransfer.count({ where: { tenantId } }),
  ]);

  console.log({ productsCount, balancesCount, salesCount, poCount, transferCount });
  await prisma.$disconnect();
}

test();
