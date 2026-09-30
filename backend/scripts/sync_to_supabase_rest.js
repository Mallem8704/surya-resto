const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://poexygwbosuxbezeastc.supabase.co';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';
if (!SUPABASE_SECRET_KEY) {
  console.log('[WARN] SUPABASE_SECRET_KEY is not set. Exiting sync.');
  process.exit(0);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

const dbPath = path.resolve(__dirname, '..', 'surya_restaurant.db');
const db = new sqlite3.Database(dbPath);

async function syncAll() {
  console.log('🚀 Syncing Local SQLite records to Supabase...');

  // 1. Sync Customers
  db.all('SELECT id, phone, name, email, default_address, created_at, last_order_at FROM customers', async (err, rows) => {
    if (err) {
      console.error('Error fetching customers:', err);
      return;
    }
    if (rows && rows.length > 0) {
      const cleanRows = rows.map(r => ({
        id: r.id,
        phone: r.phone,
        name: r.name,
        email: r.email,
        default_address: r.default_address,
        synced_to_cloud: true
      }));
      const { data, error } = await supabase.from('customers').upsert(cleanRows, { onConflict: 'phone' });
      if (error) {
        console.error('Customer sync error:', error.message);
      } else {
        console.log(`✅ Synced ${cleanRows.length} customers to Supabase!`);
      }
    }

    // 2. Sync Orders
    db.all('SELECT id, outlet_id, table_id, idempotency_key, order_type, customer_name, customer_phone, delivery_address, delivery_status, delivery_fee_paise, order_number, status, subtotal_paise, tax_paise, discount_paise, coupon_code, total_paise, payment_status, payment_method, customer_notes FROM orders', async (err, orderRows) => {
      if (err) {
        console.error('Error fetching orders:', err);
        return;
      }
      if (orderRows && orderRows.length > 0) {
        const cleanOrders = orderRows.map(o => ({
          id: o.id,
          outlet_id: o.outlet_id,
          table_id: o.table_id,
          idempotency_key: o.idempotency_key,
          order_type: o.order_type || 'dine_in',
          customer_name: o.customer_name,
          customer_phone: o.customer_phone,
          delivery_address: o.delivery_address,
          delivery_status: o.delivery_status,
          delivery_fee_paise: o.delivery_fee_paise || 0,
          order_number: o.order_number,
          status: o.status,
          subtotal_paise: o.subtotal_paise,
          tax_paise: o.tax_paise,
          discount_paise: o.discount_paise,
          coupon_code: o.coupon_code,
          total_paise: o.total_paise,
          payment_status: o.payment_status,
          payment_method: o.payment_method,
          customer_notes: o.customer_notes,
          synced_to_cloud: true
        }));

        // Batch in chunks of 25
        for (let i = 0; i < cleanOrders.length; i += 25) {
          const chunk = cleanOrders.slice(i, i + 25);
          const { error: oErr } = await supabase.from('orders').upsert(chunk, { onConflict: 'id' });
          if (oErr) {
            console.error('Order batch error:', oErr.message);
          }
        }
        console.log(`✅ Synced ${cleanOrders.length} orders to Supabase!`);
      }

      // Verify counts
      const { count: cCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });
      const { count: oCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      console.log(`\n🎉 SUPABASE LIVE METRICS:`);
      console.log(`- Total Customers in Cloud: ${cCount}`);
      console.log(`- Total Orders in Cloud: ${oCount}`);
      db.close();
    });
  });
}

syncAll();
