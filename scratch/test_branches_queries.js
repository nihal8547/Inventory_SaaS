async function test() {
  const loginRes = await fetch('http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@inventory.com',
      password: 'Admin123!'
    })
  });
  const loginData = await loginRes.json();
  const token = loginData.data.accessToken;
  const tenantId = loginData.data.memberships[0].tenantId;

  // Let's test with no branch query param
  const resAll = await fetch('http://localhost:3001/api/v1/reports/dashboard', {
    headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId }
  });
  const dataAll = await resAll.json();
  console.log('Without branch query param:', {
    todayRevenue: dataAll.data?.todayRevenue,
    monthRevenue: dataAll.data?.revenue?.month,
    stockValuation: dataAll.data?.inventory?.totalRetailValue,
    inStock: dataAll.data?.inventory?.inStockCount,
    branches: dataAll.data?.operations?.activeBranches
  });

  // Let's test with branchId of Main Branch (3a16816c-ca31-4ee2-bc61-4589dc6ae746)
  const resMain = await fetch('http://localhost:3001/api/v1/reports/dashboard?branchId=3a16816c-ca31-4ee2-bc61-4589dc6ae746', {
    headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId }
  });
  const dataMain = await resMain.json();
  console.log('Main Branch (3a16816c):', {
    todayRevenue: dataMain.data?.todayRevenue,
    monthRevenue: dataMain.data?.revenue?.month,
    stockValuation: dataMain.data?.inventory?.totalRetailValue,
    inStock: dataMain.data?.inventory?.inStockCount,
  });

  // Let's test with Doha City Center (c49aa824-adb9-41a3-93b9-723f36f039ba)
  const resDoha = await fetch('http://localhost:3001/api/v1/reports/dashboard?branchId=c49aa824-adb9-41a3-93b9-723f36f039ba', {
    headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId }
  });
  const dataDoha = await resDoha.json();
  console.log('Doha City Center (c49aa824):', {
    todayRevenue: dataDoha.data?.todayRevenue,
    monthRevenue: dataDoha.data?.revenue?.month,
    stockValuation: dataDoha.data?.inventory?.totalRetailValue,
    inStock: dataDoha.data?.inventory?.inStockCount,
  });
}
test();
