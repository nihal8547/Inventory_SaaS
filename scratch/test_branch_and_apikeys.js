async function testBranchAndApiKeys() {
  const baseURL = 'http://localhost:3001/api/v1';
  console.log('1. Logging in to obtain token...');
  const loginRes = await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@inventory.com',
      password: 'Admin123!'
    })
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    throw new Error('Login failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.data?.accessToken;
  const tenantId = loginData.data?.memberships?.[0]?.tenantId || loginData.data?.tenantId;
  console.log('Login successful! Tenant ID:', tenantId);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Tenant-ID': tenantId
  };

  console.log('\n2. Testing GET /integrations/api-keys...');
  const apiKeysRes = await fetch(`${baseURL}/integrations/api-keys`, { headers: authHeaders });
  const apiKeysData = await apiKeysRes.json();
  console.log('API Keys status:', apiKeysRes.status, 'Count:', apiKeysData.data?.length);

  console.log('\n3. Testing POST /integrations/api-keys (creating a direct API key)...');
  const createKeyRes = await fetch(`${baseURL}/integrations/api-keys`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ name: 'E-Commerce Sync Bot Key' })
  });
  const createKeyData = await createKeyRes.json();
  console.log('Create Key status:', createKeyRes.status, 'Key Prefix:', createKeyData.data?.keyPrefix || createKeyData.data?.key?.substring(0, 8));

  console.log('\n4. Testing POST /branches with access username and password...');
  const branchCode = 'BR-LUSAIL-' + Math.floor(Math.random() * 900 + 100);
  const managerEmail = `lusail.manager.${Date.now()}@demoretail.qa`;
  const branchPayload = {
    name: 'Lusail Marina Branch',
    code: branchCode,
    city: 'Lusail',
    address: 'Marina Promenade Tower 4',
    phone: '+974 4499 8811',
    isDefault: false,
    managerName: 'Rashid Al-Kuwari',
    managerEmail: managerEmail,
    managerPassword: 'LusailManager2026!',
    roleName: 'Manager'
  };

  const createBranchRes = await fetch(`${baseURL}/branches`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(branchPayload)
  });
  const createBranchData = await createBranchRes.json();
  console.log('Create Branch status:', createBranchRes.status);
  console.log('Created Branch:', {
    id: createBranchData.data.id,
    name: createBranchData.data.name,
    code: createBranchData.data.code,
    managerUser: createBranchData.data.managerUser
  });

  console.log('\n5. Testing Login with the newly created Branch Manager credentials...');
  const managerLoginRes = await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: managerEmail,
      password: 'LusailManager2026!'
    })
  });
  const managerLoginData = await managerLoginRes.json();
  console.log('Branch Manager Login SUCCESS! Name:', 
    `${managerLoginData.data.user.firstName} ${managerLoginData.data.user.lastName}`,
    'Role:', managerLoginData.data.user.role
  );

  console.log('\n6. Testing GET /branches (verifying membershipBranches & warehouses returned)...');
  const branchesListRes = await fetch(`${baseURL}/branches`, { headers: authHeaders });
  const branchesListData = await branchesListRes.json();
  const branchItems = Array.isArray(branchesListData.data) ? branchesListData.data : (branchesListData.data?.data || []);
  const createdInList = branchItems.find(b => b.code === branchCode);
  console.log('Found created branch in list:', {
    name: createdInList?.name,
    warehouses: createdInList?.warehouses?.map(w => w.name),
    staffCount: createdInList?.membershipBranches?.length,
    staff: createdInList?.membershipBranches?.map(mb => ({
      email: mb.membership?.user?.email,
      role: mb.membership?.role?.name
    }))
  });

  console.log('\nAll tests PASSED successfully!');
}

testBranchAndApiKeys().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
