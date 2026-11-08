const API = process.env.API_URL || 'http://localhost:4000/api/v1';
const WEB = process.env.WEB_URL || 'http://localhost:3000';

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log('ok', message);
}

async function call(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const buffer = Buffer.from(await response.arrayBuffer());
  const type = response.headers.get('content-type') || '';
  let json = null;
  if (type.includes('json')) {
    try {
      json = JSON.parse(buffer.toString('utf8'));
    } catch {
      json = null;
    }
  }
  return { response, buffer, json };
}

function pdr(shape, extra) {
  return {
    pdr: {
      shape,
      count: 2,
      hailKey: 'none',
      complexityKey: 'standard',
      materialKey: 'steel',
      carClassKey: 'b',
      coatingKey: 'factory',
      adjustPercent: 0,
      ...extra,
    },
  };
}

async function main() {
  const health = await call('/health');
  assert(health.response.ok && health.json?.ok === true, 'health');

  const demo = await call('/auth/demo', { method: 'POST' });
  assert(demo.response.ok && typeof demo.json?.accessToken === 'string', 'demo login');
  const headers = {
    Authorization: `Bearer ${demo.json.accessToken}`,
    'Content-Type': 'application/json',
  };
  const authOnly = { Authorization: headers.Authorization };

  const me = await call('/auth/me', { headers });
  assert(me.response.ok && me.json?.user?.role === 'owner', 'me is owner');

  const orders = await call('/orders', { headers });
  assert(orders.response.ok && Array.isArray(orders.json?.items) && orders.json.items.length > 0, 'seeded orders');

  const circle = await call('/constructor/calculate', {
    method: 'POST',
    headers,
    body: JSON.stringify(pdr('circle', { diameterMm: 20 })),
  });
  assert(circle.response.ok && circle.json?.pdr?.unitPrice > 0, `circle price ${circle.json?.pdr?.unitPrice}`);

  const oval = await call('/constructor/calculate', {
    method: 'POST',
    headers,
    body: JSON.stringify(pdr('oval', { widthMm: 40, heightMm: 10 })),
  });
  assert(oval.response.ok && Math.round(oval.json?.pdr?.equivalentDiameterMm) === 20, 'oval equivalent diameter');

  const stripe = await call('/constructor/calculate', {
    method: 'POST',
    headers,
    body: JSON.stringify(pdr('stripe', { widthMm: 30, lengthMm: 160 })),
  });
  assert(stripe.response.ok && stripe.json?.pdr?.basePrice > 0, 'stripe matrix price');

  const client = await call('/clients', {
    method: 'POST',
    headers,
    body: JSON.stringify({ kind: 'person', name: 'Дымовой Тест', phone: '+79990001122' }),
  });
  assert(client.response.ok && client.json?.id, 'create client');

  const vehicle = await call(`/clients/${client.json.id}/vehicles`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      make: 'Kia',
      model: 'Rio',
      year: 2020,
      plate: 'Т001ТТ116',
      vin: 'XTEST000000000001',
      mileage: 42000,
      carClass: 'b',
      color: 'белый',
      bodyType: 'седан',
    }),
  });
  assert(vehicle.response.ok && vehicle.json?.id, 'create vehicle');

  const order = await call('/orders', {
    method: 'POST',
    headers,
    body: JSON.stringify({ clientId: client.json.id, vehicleId: vehicle.json.id, status: 'draft' }),
  });
  assert(order.response.ok && order.json?.id, 'create order');

  const quoted = await call(`/orders/${order.json.id}/constructor`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      panelCode: 'hood',
      ...pdr('circle', { diameterMm: 20 }),
      travelEnabled: true,
      travelKm: 10,
    }),
  });
  assert(quoted.response.ok && quoted.json?.travelFee > 0 && quoted.json?.grandTotal > quoted.json?.laborTotal, 'constructor on order');

  const paid = await call(`/orders/${order.json.id}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ amount: 500, method: 'cash', note: 'smoke' }),
  });
  assert(paid.response.ok && paid.json?.paid >= 500 && paid.json?.debt >= 0, 'payment and debt');

  const pdf = await call(`/documents/orders/${order.json.id}/work-order.pdf`, { headers: authOnly });
  assert(pdf.response.ok && pdf.buffer.subarray(0, 4).toString() === '%PDF', 'work order pdf');

  const act = await call(`/documents/orders/${order.json.id}/act.pdf`, { headers: authOnly });
  assert(act.response.ok && act.buffer.subarray(0, 4).toString() === '%PDF', 'act pdf');

  const clientsXlsx = await call('/export/clients.xlsx', { headers: authOnly });
  assert(clientsXlsx.response.ok && clientsXlsx.buffer.subarray(0, 2).toString() === 'PK', 'clients xlsx');

  const ordersXlsx = await call('/export/orders.xlsx', { headers: authOnly });
  assert(ordersXlsx.response.ok && ordersXlsx.buffer.subarray(0, 2).toString() === 'PK', 'orders xlsx');

  const analytics = await call('/analytics', { headers });
  assert(analytics.response.ok && Array.isArray(analytics.json?.byDirection), 'analytics');

  const notes = await call('/notifications', { headers });
  assert(notes.response.ok && Array.isArray(notes.json?.items || notes.json), 'notifications');

  if (process.env.SKIP_WEB !== '1') {
    const landing = await fetch(WEB);
    const landingHtml = await landing.text();
    assert(landing.ok && landingHtml.includes('10 дней'), 'landing');
    const login = await fetch(`${WEB}/login`);
    assert(login.ok, 'login page');
  }

  console.log('smoke passed');
}

main().catch((error) => {
  console.error('FAIL', error.message);
  process.exit(1);
});
