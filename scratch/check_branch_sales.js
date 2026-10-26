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

  // Let's get all branches for this tenant
  const branchesRes = await fetch('http://localhost:3001/api/v1/branches', {
    headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId }
  });
  const branchesData = await branchesRes.json();
  console.log('Branches:', branchesData.data?.data || branchesData.data);

  // Let's get sales for this tenant
  const salesRes = await fetch('http://localhost:3001/api/v1/sales', {
    headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId }
  });
  const salesData = await salesRes.json();
  const sales = salesData.data?.data || salesData.data || [];
  console.log('Total sales:', sales.length);
  for (const s of sales) {
    console.log(`Sale ${s.saleNumber}: branchId=${s.branchId}, total=${s.total}`);
  }
}
test();
