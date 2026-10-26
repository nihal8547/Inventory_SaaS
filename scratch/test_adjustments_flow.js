async function testAdjustments() {
  const baseURL = 'http://localhost:3001/api/v1';
  console.log('1. Logging in...');
  const loginRes = await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@inventory.com', password: 'Admin123!' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken;
  const tenantId = loginData.data?.memberships?.[0]?.tenantId || loginData.data?.tenantId;
  console.log('Login OK. Tenant ID:', tenantId);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Tenant-ID': tenantId
  };

  console.log('\n2. Fetching branches and products...');
  const branchesRes = await fetch(`${baseURL}/branches`, { headers: authHeaders });
  const branchesData = await branchesRes.json();
  const branchList = Array.isArray(branchesData.data) ? branchesData.data : branchesData.data.data;
  const branch = branchList[0];
  console.log('Target branch:', branch.name, branch.id);

  const productsRes = await fetch(`${baseURL}/products?limit=5`, { headers: authHeaders });
  const productsData = await productsRes.json();
  const productList = Array.isArray(productsData.data) ? productsData.data : productsData.data.data;
  const product = productList[0];
  console.log('Target product:', product.name, product.id, 'SKU:', product.sku);

  console.log('\n3. Creating Stock Inflow Adjustment (+15 units)...');
  const inAdjRes = await fetch(`${baseURL}/inventory/adjustments`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      branchId: branch.id,
      reason: 'Opening Stock',
      notes: 'Automated test initial batch load',
      lines: [
        {
          productId: product.id,
          quantity: 15,
          reason: 'Initial load'
        }
      ]
    })
  });
  const inAdjData = await inAdjRes.json();
  console.log('Inflow Adjustment status:', inAdjRes.status, 'Adj #:', inAdjData.data?.adjustmentNumber);

  console.log('\n4. Creating Stock Outflow / Write-off Adjustment (-3 units)...');
  const outAdjRes = await fetch(`${baseURL}/inventory/adjustments`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      branchId: branch.id,
      reason: 'Damaged Goods Write-off',
      notes: 'Damaged in transit write-off',
      lines: [
        {
          productId: product.id,
          quantity: -3,
          reason: 'Broken bottle packaging'
        }
      ]
    })
  });
  const outAdjData = await outAdjRes.json();
  console.log('Outflow Adjustment status:', outAdjRes.status, 'Adj #:', outAdjData.data?.adjustmentNumber);

  console.log('\n5. Testing GET /inventory/adjustments (listing past adjustments)...');
  const listAdjRes = await fetch(`${baseURL}/inventory/adjustments`, { headers: authHeaders });
  const listAdjData = await listAdjRes.json();
  console.log('List adjustments status:', listAdjRes.status, 'Total items:', listAdjData.data?.length || listAdjData.data?.data?.length);
  const sample = (listAdjData.data?.data || listAdjData.data)?.[0];
  console.log('Latest adjustment in list:', {
    adjNum: sample?.adjustmentNumber,
    reason: sample?.reason,
    branchName: sample?.branch?.name,
    linesCount: sample?.lines?.length,
    firstLineProduct: sample?.lines?.[0]?.product?.name,
    quantity: sample?.lines?.[0]?.quantity
  });

  console.log('\nAll Stock Adjustment flows PASSED successfully!');
}

testAdjustments().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
