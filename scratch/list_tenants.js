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

  // Let's get all tenants
  const res = await fetch('http://localhost:3001/api/v1/tenants', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('Tenants:', JSON.stringify(data, null, 2));
}
test();
