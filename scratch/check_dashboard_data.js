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
  console.log('Tenant ID:', tenantId);
  const res = await fetch('http://localhost:3001/api/v1/reports/dashboard', {
    headers: { 
      Authorization: `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  });
  const data = await res.json();
  console.log('Dashboard Data:', JSON.stringify(data, null, 2));
}
test();
