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

  const res = await fetch('http://localhost:3001/api/v1/reports/dashboard', {
    headers: { 
      Authorization: `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  });
  const json = await res.json();
  console.log('API response status:', res.status);
  console.log('API response success:', json.success);
  console.log('json keys:', Object.keys(json));
  console.log('json.data keys:', Object.keys(json.data));
  console.log('json.data.todayRevenue:', json.data.todayRevenue);
  console.log('json.data.inventory:', json.data.inventory);
}
test();
