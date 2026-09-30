-- ================================================================
-- SURYA FAMILY RESTAURANT KADIRI - SUPABASE POSTGRESQL SCHEMA
-- Generated for 1-Click Run in Supabase SQL Editor
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: customer_otps
CREATE TABLE IF NOT EXISTS customer_otps (
	id SERIAL NOT NULL, 
	phone VARCHAR(20) NOT NULL, 
	otp_code VARCHAR(10) NOT NULL, 
	expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	is_used BOOLEAN, 
	attempts INTEGER, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_customer_otps_phone ON customer_otps (phone);
CREATE INDEX IF NOT EXISTS ix_customer_otps_id ON customer_otps (id);


-- Table: customers
CREATE TABLE IF NOT EXISTS customers (
	id SERIAL NOT NULL, 
	phone VARCHAR(20) NOT NULL, 
	name VARCHAR(100), 
	email VARCHAR(120), 
	default_address TEXT, 
	hashed_password VARCHAR(255), 
	synced_to_cloud BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	last_order_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_customers_id ON customers (id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_customers_phone ON customers (phone);
CREATE INDEX IF NOT EXISTS ix_customers_synced_to_cloud ON customers (synced_to_cloud);


-- Table: outlets
CREATE TABLE IF NOT EXISTS outlets (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	address VARCHAR(255), 
	phone VARCHAR(20), 
	currency VARCHAR(10), 
	tax_rate_percent INTEGER, 
	opening_hours VARCHAR(100), 
	tagline VARCHAR(255), 
	logo_url VARCHAR(500), 
	gstin VARCHAR(30), 
	fssai_license_number VARCHAR(30), 
	upi_vpa VARCHAR(100), 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_outlets_id ON outlets (id);


-- Table: categories
CREATE TABLE IF NOT EXISTS categories (
	id SERIAL NOT NULL, 
	outlet_id INTEGER NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	name_te VARCHAR(100), 
	sort_order INTEGER, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_category_outlet_name UNIQUE (outlet_id, name), 
	FOREIGN KEY(outlet_id) REFERENCES outlets (id)
);

CREATE INDEX IF NOT EXISTS ix_categories_outlet_id ON categories (outlet_id);
CREATE INDEX IF NOT EXISTS ix_categories_id ON categories (id);


-- Table: coupons
CREATE TABLE IF NOT EXISTS coupons (
	id SERIAL NOT NULL, 
	outlet_id INTEGER, 
	code VARCHAR(50) NOT NULL, 
	description VARCHAR(255), 
	discount_type VARCHAR(20), 
	discount_value INTEGER NOT NULL, 
	min_order_paise INTEGER, 
	max_discount_paise INTEGER, 
	usage_limit INTEGER, 
	times_used INTEGER, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(outlet_id) REFERENCES outlets (id)
);

CREATE INDEX IF NOT EXISTS ix_coupons_id ON coupons (id);
CREATE INDEX IF NOT EXISTS ix_coupons_outlet_id ON coupons (outlet_id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_coupons_code ON coupons (code);


-- Table: customer_addresses
CREATE TABLE IF NOT EXISTS customer_addresses (
	id SERIAL NOT NULL, 
	customer_id INTEGER NOT NULL, 
	label VARCHAR(50), 
	address_line TEXT NOT NULL, 
	landmark VARCHAR(150), 
	is_default BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(customer_id) REFERENCES customers (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_customer_addresses_customer_id ON customer_addresses (customer_id);
CREATE INDEX IF NOT EXISTS ix_customer_addresses_id ON customer_addresses (id);


-- Table: tables
CREATE TABLE IF NOT EXISTS tables (
	id SERIAL NOT NULL, 
	outlet_id INTEGER NOT NULL, 
	label VARCHAR(50) NOT NULL, 
	qr_code_url VARCHAR(255), 
	status VARCHAR(20), 
	active_order_id INTEGER, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_table_outlet_label UNIQUE (outlet_id, label), 
	FOREIGN KEY(outlet_id) REFERENCES outlets (id)
);

CREATE INDEX IF NOT EXISTS ix_tables_id ON tables (id);
CREATE INDEX IF NOT EXISTS ix_tables_outlet_id ON tables (outlet_id);


-- Table: users
CREATE TABLE IF NOT EXISTS users (
	id SERIAL NOT NULL, 
	outlet_id INTEGER NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	email VARCHAR(150) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	role VARCHAR(20), 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(outlet_id) REFERENCES outlets (id)
);

CREATE INDEX IF NOT EXISTS ix_users_id ON users (id);
CREATE INDEX IF NOT EXISTS ix_users_outlet_id ON users (outlet_id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);


-- Table: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
	id SERIAL NOT NULL, 
	outlet_id INTEGER NOT NULL, 
	user_id INTEGER, 
	action VARCHAR(100) NOT NULL, 
	entity_type VARCHAR(50) NOT NULL, 
	entity_id INTEGER, 
	details_json TEXT, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(outlet_id) REFERENCES outlets (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_entity_type ON audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS ix_audit_logs_id ON audit_logs (id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS ix_audit_logs_outlet_id ON audit_logs (outlet_id);


-- Table: cashier_shifts
CREATE TABLE IF NOT EXISTS cashier_shifts (
	id SERIAL NOT NULL, 
	outlet_id INTEGER NOT NULL, 
	cashier_id INTEGER NOT NULL, 
	cashier_name VARCHAR(100) NOT NULL, 
	shift_name VARCHAR(50), 
	status VARCHAR(20), 
	opened_at TIMESTAMP WITHOUT TIME ZONE, 
	closed_at TIMESTAMP WITHOUT TIME ZONE, 
	opening_float_paise INTEGER, 
	cash_sales_paise INTEGER, 
	upi_sales_paise INTEGER, 
	card_sales_paise INTEGER, 
	petty_cash_in_paise INTEGER, 
	petty_cash_out_paise INTEGER, 
	expected_cash_paise INTEGER, 
	actual_cash_paise INTEGER, 
	difference_paise INTEGER, 
	denominations_json TEXT, 
	closing_notes TEXT, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(outlet_id) REFERENCES outlets (id), 
	FOREIGN KEY(cashier_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_cashier_shifts_id ON cashier_shifts (id);
CREATE INDEX IF NOT EXISTS ix_cashier_shifts_cashier_id ON cashier_shifts (cashier_id);
CREATE INDEX IF NOT EXISTS ix_cashier_shifts_status ON cashier_shifts (status);
CREATE INDEX IF NOT EXISTS ix_cashier_shifts_outlet_id ON cashier_shifts (outlet_id);


-- Table: menu_items
CREATE TABLE IF NOT EXISTS menu_items (
	id SERIAL NOT NULL, 
	outlet_id INTEGER NOT NULL, 
	category_id INTEGER NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	name_te VARCHAR(120), 
	description TEXT, 
	description_te TEXT, 
	price_paise INTEGER NOT NULL, 
	image_url VARCHAR(255), 
	is_veg BOOLEAN, 
	is_available BOOLEAN, 
	has_variants BOOLEAN, 
	track_stock BOOLEAN, 
	stock_qty INTEGER, 
	low_stock_threshold INTEGER, 
	is_special BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(outlet_id) REFERENCES outlets (id), 
	FOREIGN KEY(category_id) REFERENCES categories (id)
);

CREATE INDEX IF NOT EXISTS ix_menu_items_category_id ON menu_items (category_id);
CREATE INDEX IF NOT EXISTS ix_menu_items_id ON menu_items (id);
CREATE INDEX IF NOT EXISTS ix_menu_items_outlet_id ON menu_items (outlet_id);


-- Table: orders
CREATE TABLE IF NOT EXISTS orders (
	id SERIAL NOT NULL, 
	outlet_id INTEGER NOT NULL, 
	table_id INTEGER, 
	idempotency_key VARCHAR(100), 
	order_type VARCHAR(20), 
	customer_name VARCHAR(100), 
	customer_phone VARCHAR(20), 
	delivery_address TEXT, 
	delivery_status VARCHAR(30), 
	delivery_fee_paise INTEGER, 
	order_number VARCHAR(30) NOT NULL, 
	status VARCHAR(30), 
	subtotal_paise INTEGER, 
	tax_paise INTEGER, 
	discount_paise INTEGER, 
	coupon_code VARCHAR(50), 
	coupon_id INTEGER, 
	customer_id INTEGER, 
	total_paise INTEGER, 
	payment_status VARCHAR(20), 
	payment_method VARCHAR(20), 
	customer_notes TEXT, 
	synced_to_cloud BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(outlet_id) REFERENCES outlets (id), 
	FOREIGN KEY(table_id) REFERENCES tables (id) ON DELETE SET NULL, 
	FOREIGN KEY(coupon_id) REFERENCES coupons (id) ON DELETE SET NULL, 
	FOREIGN KEY(customer_id) REFERENCES customers (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_orders_synced_to_cloud ON orders (synced_to_cloud);
CREATE INDEX IF NOT EXISTS ix_orders_customer_phone ON orders (customer_phone);
CREATE UNIQUE INDEX IF NOT EXISTS ix_orders_order_number ON orders (order_number);
CREATE INDEX IF NOT EXISTS ix_orders_created_at ON orders (created_at);
CREATE INDEX IF NOT EXISTS ix_orders_outlet_id ON orders (outlet_id);
CREATE INDEX IF NOT EXISTS ix_orders_table_id ON orders (table_id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_orders_idempotency_key ON orders (idempotency_key);
CREATE INDEX IF NOT EXISTS ix_orders_id ON orders (id);
CREATE INDEX IF NOT EXISTS ix_orders_customer_id ON orders (customer_id);
CREATE INDEX IF NOT EXISTS ix_orders_order_type ON orders (order_type);
CREATE INDEX IF NOT EXISTS ix_orders_status ON orders (status);


-- Table: service_calls
CREATE TABLE IF NOT EXISTS service_calls (
	id SERIAL NOT NULL, 
	outlet_id INTEGER NOT NULL, 
	table_id INTEGER NOT NULL, 
	call_type VARCHAR(50), 
	status VARCHAR(20), 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(outlet_id) REFERENCES outlets (id), 
	FOREIGN KEY(table_id) REFERENCES tables (id)
);

CREATE INDEX IF NOT EXISTS ix_service_calls_status ON service_calls (status);
CREATE INDEX IF NOT EXISTS ix_service_calls_outlet_id ON service_calls (outlet_id);
CREATE INDEX IF NOT EXISTS ix_service_calls_id ON service_calls (id);
CREATE INDEX IF NOT EXISTS ix_service_calls_table_id ON service_calls (table_id);


-- Table: table_reservations
CREATE TABLE IF NOT EXISTS table_reservations (
	id SERIAL NOT NULL, 
	outlet_id INTEGER NOT NULL, 
	reservation_number VARCHAR(50) NOT NULL, 
	customer_name VARCHAR(100) NOT NULL, 
	customer_phone VARCHAR(20) NOT NULL, 
	customer_email VARCHAR(100), 
	party_size INTEGER NOT NULL, 
	reservation_date VARCHAR(20) NOT NULL, 
	reservation_time VARCHAR(20) NOT NULL, 
	seating_preference VARCHAR(50), 
	occasion VARCHAR(50), 
	special_requests TEXT, 
	table_id INTEGER, 
	status VARCHAR(20), 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(outlet_id) REFERENCES outlets (id), 
	FOREIGN KEY(table_id) REFERENCES tables (id)
);

CREATE INDEX IF NOT EXISTS ix_table_reservations_reservation_date ON table_reservations (reservation_date);
CREATE INDEX IF NOT EXISTS ix_table_reservations_customer_phone ON table_reservations (customer_phone);
CREATE UNIQUE INDEX IF NOT EXISTS ix_table_reservations_reservation_number ON table_reservations (reservation_number);
CREATE INDEX IF NOT EXISTS ix_table_reservations_id ON table_reservations (id);
CREATE INDEX IF NOT EXISTS ix_table_reservations_outlet_id ON table_reservations (outlet_id);


-- Table: menu_item_addons
CREATE TABLE IF NOT EXISTS menu_item_addons (
	id SERIAL NOT NULL, 
	item_id INTEGER NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	name_te VARCHAR(100), 
	price_paise INTEGER NOT NULL, 
	is_available BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(item_id) REFERENCES menu_items (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_menu_item_addons_id ON menu_item_addons (id);
CREATE INDEX IF NOT EXISTS ix_menu_item_addons_item_id ON menu_item_addons (item_id);


-- Table: menu_item_variants
CREATE TABLE IF NOT EXISTS menu_item_variants (
	id SERIAL NOT NULL, 
	item_id INTEGER NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	name_te VARCHAR(100), 
	price_paise INTEGER NOT NULL, 
	is_default BOOLEAN, 
	is_available BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(item_id) REFERENCES menu_items (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_menu_item_variants_id ON menu_item_variants (id);
CREATE INDEX IF NOT EXISTS ix_menu_item_variants_item_id ON menu_item_variants (item_id);


-- Table: order_items
CREATE TABLE IF NOT EXISTS order_items (
	id SERIAL NOT NULL, 
	order_id INTEGER NOT NULL, 
	item_id INTEGER, 
	variant_id INTEGER, 
	variant_name VARCHAR(100), 
	selected_addons_json TEXT, 
	item_name VARCHAR(120) NOT NULL, 
	qty INTEGER, 
	unit_price_paise INTEGER NOT NULL, 
	total_price_paise INTEGER NOT NULL, 
	notes VARCHAR(255), 
	PRIMARY KEY (id), 
	FOREIGN KEY(order_id) REFERENCES orders (id), 
	FOREIGN KEY(item_id) REFERENCES menu_items (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_order_items_id ON order_items (id);
CREATE INDEX IF NOT EXISTS ix_order_items_item_id ON order_items (item_id);
CREATE INDEX IF NOT EXISTS ix_order_items_order_id ON order_items (order_id);


-- Table: payments
CREATE TABLE IF NOT EXISTS payments (
	id SERIAL NOT NULL, 
	order_id INTEGER NOT NULL, 
	method VARCHAR(30), 
	txn_id VARCHAR(100), 
	amount_paise INTEGER NOT NULL, 
	status VARCHAR(20), 
	paid_at TIMESTAMP WITHOUT TIME ZONE, 
	notes VARCHAR(255), 
	synced_to_cloud BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(order_id) REFERENCES orders (id)
);

CREATE INDEX IF NOT EXISTS ix_payments_id ON payments (id);
CREATE INDEX IF NOT EXISTS ix_payments_paid_at ON payments (paid_at);
CREATE INDEX IF NOT EXISTS ix_payments_order_id ON payments (order_id);
CREATE INDEX IF NOT EXISTS ix_payments_synced_to_cloud ON payments (synced_to_cloud);


-- Table: stock_logs
CREATE TABLE IF NOT EXISTS stock_logs (
	id SERIAL NOT NULL, 
	outlet_id INTEGER NOT NULL, 
	item_id INTEGER NOT NULL, 
	change_qty INTEGER NOT NULL, 
	reason VARCHAR(50) NOT NULL, 
	staff_id INTEGER, 
	notes VARCHAR(255), 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(outlet_id) REFERENCES outlets (id), 
	FOREIGN KEY(item_id) REFERENCES menu_items (id) ON DELETE CASCADE, 
	FOREIGN KEY(staff_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_stock_logs_outlet_id ON stock_logs (outlet_id);
CREATE INDEX IF NOT EXISTS ix_stock_logs_item_id ON stock_logs (item_id);
CREATE INDEX IF NOT EXISTS ix_stock_logs_created_at ON stock_logs (created_at);
CREATE INDEX IF NOT EXISTS ix_stock_logs_id ON stock_logs (id);


-- ================================================================
-- ROW LEVEL SECURITY & PUBLIC PERMISSIONS
-- ================================================================

ALTER TABLE IF EXISTS outlets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on outlets" ON outlets;
CREATE POLICY "Allow public read on outlets" ON outlets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on outlets" ON outlets;
CREATE POLICY "Allow public insert on outlets" ON outlets FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on outlets" ON outlets;
CREATE POLICY "Allow public update on outlets" ON outlets FOR UPDATE USING (true);
GRANT ALL ON outlets TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on categories" ON categories;
CREATE POLICY "Allow public read on categories" ON categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on categories" ON categories;
CREATE POLICY "Allow public insert on categories" ON categories FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on categories" ON categories;
CREATE POLICY "Allow public update on categories" ON categories FOR UPDATE USING (true);
GRANT ALL ON categories TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on menu_items" ON menu_items;
CREATE POLICY "Allow public read on menu_items" ON menu_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on menu_items" ON menu_items;
CREATE POLICY "Allow public insert on menu_items" ON menu_items FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on menu_items" ON menu_items;
CREATE POLICY "Allow public update on menu_items" ON menu_items FOR UPDATE USING (true);
GRANT ALL ON menu_items TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS menu_item_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on menu_item_variants" ON menu_item_variants;
CREATE POLICY "Allow public read on menu_item_variants" ON menu_item_variants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on menu_item_variants" ON menu_item_variants;
CREATE POLICY "Allow public insert on menu_item_variants" ON menu_item_variants FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on menu_item_variants" ON menu_item_variants;
CREATE POLICY "Allow public update on menu_item_variants" ON menu_item_variants FOR UPDATE USING (true);
GRANT ALL ON menu_item_variants TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS menu_item_addons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on menu_item_addons" ON menu_item_addons;
CREATE POLICY "Allow public read on menu_item_addons" ON menu_item_addons FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on menu_item_addons" ON menu_item_addons;
CREATE POLICY "Allow public insert on menu_item_addons" ON menu_item_addons FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on menu_item_addons" ON menu_item_addons;
CREATE POLICY "Allow public update on menu_item_addons" ON menu_item_addons FOR UPDATE USING (true);
GRANT ALL ON menu_item_addons TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on tables" ON tables;
CREATE POLICY "Allow public read on tables" ON tables FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on tables" ON tables;
CREATE POLICY "Allow public insert on tables" ON tables FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on tables" ON tables;
CREATE POLICY "Allow public update on tables" ON tables FOR UPDATE USING (true);
GRANT ALL ON tables TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on coupons" ON coupons;
CREATE POLICY "Allow public read on coupons" ON coupons FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on coupons" ON coupons;
CREATE POLICY "Allow public insert on coupons" ON coupons FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on coupons" ON coupons;
CREATE POLICY "Allow public update on coupons" ON coupons FOR UPDATE USING (true);
GRANT ALL ON coupons TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on orders" ON orders;
CREATE POLICY "Allow public read on orders" ON orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on orders" ON orders;
CREATE POLICY "Allow public insert on orders" ON orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on orders" ON orders;
CREATE POLICY "Allow public update on orders" ON orders FOR UPDATE USING (true);
GRANT ALL ON orders TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on order_items" ON order_items;
CREATE POLICY "Allow public read on order_items" ON order_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on order_items" ON order_items;
CREATE POLICY "Allow public insert on order_items" ON order_items FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on order_items" ON order_items;
CREATE POLICY "Allow public update on order_items" ON order_items FOR UPDATE USING (true);
GRANT ALL ON order_items TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on customers" ON customers;
CREATE POLICY "Allow public read on customers" ON customers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on customers" ON customers;
CREATE POLICY "Allow public insert on customers" ON customers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on customers" ON customers;
CREATE POLICY "Allow public update on customers" ON customers FOR UPDATE USING (true);
GRANT ALL ON customers TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS customer_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on customer_addresses" ON customer_addresses;
CREATE POLICY "Allow public read on customer_addresses" ON customer_addresses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on customer_addresses" ON customer_addresses;
CREATE POLICY "Allow public insert on customer_addresses" ON customer_addresses FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on customer_addresses" ON customer_addresses;
CREATE POLICY "Allow public update on customer_addresses" ON customer_addresses FOR UPDATE USING (true);
GRANT ALL ON customer_addresses TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS table_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on table_reservations" ON table_reservations;
CREATE POLICY "Allow public read on table_reservations" ON table_reservations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on table_reservations" ON table_reservations;
CREATE POLICY "Allow public insert on table_reservations" ON table_reservations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on table_reservations" ON table_reservations;
CREATE POLICY "Allow public update on table_reservations" ON table_reservations FOR UPDATE USING (true);
GRANT ALL ON table_reservations TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on payments" ON payments;
CREATE POLICY "Allow public read on payments" ON payments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert on payments" ON payments;
CREATE POLICY "Allow public insert on payments" ON payments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update on payments" ON payments;
CREATE POLICY "Allow public update on payments" ON payments FOR UPDATE USING (true);
GRANT ALL ON payments TO anon, authenticated, service_role;

-- ================================================================
-- SEED DATA FROM LOCAL DATABASE
-- ================================================================

INSERT INTO outlets (id, name, address, phone, currency, tax_rate_percent, opening_hours, tagline, logo_url, upi_vpa) VALUES (1, 'Surya Family Restaurant', 'Dhandubatu Street, Bypass road, opposite to RTC Bus Stand, Police Quarters, Kadiri, Andhra Pradesh 515591', '+91 98803 58634', 'INR', 5, '11:00 AM - 10:30 PM (Daily)', 'Kadiri''s Favorite Family Dining & Biryani Destination', '/logo.png', '9880358634@upi') ON CONFLICT (id) DO NOTHING;


INSERT INTO categories (id, outlet_id, name, name_te, sort_order, is_active) VALUES (1, 1, 'Biryani & Pulao Specials', 'బిర్యానీ & పులావ్ స్పెషల్స్', 1, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, outlet_id, name, name_te, sort_order, is_active) VALUES (2, 1, 'Punjabi & North Indian Curries', 'పంజాబీ & నార్త్ ఇండియన్ కూరలు', 2, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, outlet_id, name, name_te, sort_order, is_active) VALUES (3, 1, 'Tandoori & Kebabs', 'తందూరి & కబాబ్స్', 3, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, outlet_id, name, name_te, sort_order, is_active) VALUES (4, 1, 'Non-Veg Starters & Andhra Specials', 'నాన్-వెజ్ స్టార్టర్స్ & ఆంధ్రా స్పెషల్స్', 4, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, outlet_id, name, name_te, sort_order, is_active) VALUES (5, 1, 'Veg Starters & Crispies', 'వెజ్ స్టార్టర్స్ & క్రిస్పీస్', 5, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, outlet_id, name, name_te, sort_order, is_active) VALUES (6, 1, 'Indian Breads & Naans', 'రొట్టెలు, నాన్స్ & కుల్చా', 6, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, outlet_id, name, name_te, sort_order, is_active) VALUES (7, 1, 'Chinese, Fried Rice & Noodles', 'చైనీస్, ఫ్రైడ్ రైస్ & నూడుల్స్', 7, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, outlet_id, name, name_te, sort_order, is_active) VALUES (8, 1, 'Soups & Shorba', 'సూప్స్ & షోర్బా', 8, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, outlet_id, name, name_te, sort_order, is_active) VALUES (9, 1, 'Rice & South Indian Meals', 'రైస్ & సౌత్ ఇండియన్ స్పెషల్స్', 9, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, outlet_id, name, name_te, sort_order, is_active) VALUES (10, 1, 'Coolers, Beverages & Desserts', 'కూలర్స్, పానీయాలు & స్వీట్స్', 10, true) ON CONFLICT (id) DO NOTHING;


INSERT INTO tables (id, outlet_id, label, status, qr_code_url) VALUES (1, 1, 'T1', 'occupied', 'http://localhost:3000/order?branch=1&table=T1') ON CONFLICT (id) DO NOTHING;
INSERT INTO tables (id, outlet_id, label, status, qr_code_url) VALUES (2, 1, 'T2', 'free', 'http://localhost:3000/order?branch=1&table=T2') ON CONFLICT (id) DO NOTHING;
INSERT INTO tables (id, outlet_id, label, status, qr_code_url) VALUES (3, 1, 'T3', 'occupied', 'http://localhost:3000/order?branch=1&table=T3') ON CONFLICT (id) DO NOTHING;
INSERT INTO tables (id, outlet_id, label, status, qr_code_url) VALUES (4, 1, 'T4', 'free', 'http://localhost:3000/order?branch=1&table=T4') ON CONFLICT (id) DO NOTHING;
INSERT INTO tables (id, outlet_id, label, status, qr_code_url) VALUES (5, 1, 'T5', 'free', 'http://localhost:3000/order?branch=1&table=T5') ON CONFLICT (id) DO NOTHING;
INSERT INTO tables (id, outlet_id, label, status, qr_code_url) VALUES (6, 1, 'T6', 'free', 'http://localhost:3000/order?branch=1&table=T6') ON CONFLICT (id) DO NOTHING;
INSERT INTO tables (id, outlet_id, label, status, qr_code_url) VALUES (7, 1, 'T7', 'free', 'http://localhost:3000/order?branch=1&table=T7') ON CONFLICT (id) DO NOTHING;
INSERT INTO tables (id, outlet_id, label, status, qr_code_url) VALUES (8, 1, 'T8', 'free', 'http://localhost:3000/order?branch=1&table=T8') ON CONFLICT (id) DO NOTHING;
INSERT INTO tables (id, outlet_id, label, status, qr_code_url) VALUES (9, 1, 'T9', 'free', 'http://localhost:3000/order?branch=1&table=T9') ON CONFLICT (id) DO NOTHING;
INSERT INTO tables (id, outlet_id, label, status, qr_code_url) VALUES (10, 1, 'T10', 'free', 'http://localhost:3000/order?branch=1&table=T10') ON CONFLICT (id) DO NOTHING;
INSERT INTO tables (id, outlet_id, label, status, qr_code_url) VALUES (11, 1, 'T11', 'free', 'http://localhost:3000/order?branch=1&table=T11') ON CONFLICT (id) DO NOTHING;
INSERT INTO tables (id, outlet_id, label, status, qr_code_url) VALUES (12, 1, 'T12', 'free', 'http://localhost:3000/order?branch=1&table=T12') ON CONFLICT (id) DO NOTHING;


INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (1, 1, 1, 'Surya Special Hyderabadi Chicken Dum Biryani', 'సూర్య స్పెషల్ చికెన్ దమ్ బిర్యానీ', 'Long-grain fragrant basmati rice slow-cooked with tender spiced chicken, saffron, and aromatic spices. Served with mirchi ka salan & raita.', 26000, '/dishes/3d_biryani.jpg', false, true, true, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (2, 1, 1, 'Chicken Fry Piece Biryani (Andhra Special)', 'చికెన్ ఫ్రై పీస్ బిర్యానీ', 'Aromatic biryani rice layered with crispy Andhra-style roasted chicken fry pieces and caramelized onions.', 28000, '/dishes/3d_biryani.jpg', false, true, true, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (3, 1, 1, 'Special Mutton Dum Biryani', 'మటన్ దమ్ బిర్యానీ', 'Juicy tender pieces of baby lamb marinated in authentic spices and dum-cooked with aged basmati rice.', 36000, '/dishes/3d_biryani.jpg', false, true, true, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (4, 1, 1, 'Kaju Paneer Biryani', 'కాజు పన్నీర్ బిర్యానీ', 'Fragrant dum biryani rice tossed with roasted whole cashews (kaju) and soft malai paneer cubes.', 25000, '/dishes/3d_biryani.jpg', true, true, true, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (5, 1, 1, 'Surya Special Veg Dum Biryani', 'వెజ్ దమ్ బిర్యానీ', 'Farm-fresh vegetables, green peas, and paneer cooked on dum with aromatic whole spices and saffron rice.', 21000, '/dishes/3d_biryani.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (6, 1, 1, 'Egg Dum Biryani', 'ఎగ్ దమ్ బిర్యానీ', 'Golden shallow-fried boiled eggs spiced with masala, layered over aromatic Hyderabadi biryani rice.', 22000, '/dishes/3d_biryani.jpg', false, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (7, 1, 2, 'Punjabi Chicken Curry (Chef Special)', 'పంజాబీ చికెన్ కర్రీ', 'Traditional North Indian Dhaba-style chicken simmered with freshly ground coriander, tomatoes, ginger, and desi ghee. Pairs perfectly with Butter Naan!', 26000, '/dishes/3d_curries.jpg', false, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (8, 1, 2, 'Butter Chicken (Murgh Makhani)', 'బట్టర్ చికెన్', 'Smoky char-grilled tandoori chicken cooked in a velvety tomato, cashew cream, and rich butter gravy.', 27000, '/dishes/3d_curries.jpg', false, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (9, 1, 2, 'Kadai Chicken', 'కడాయి చికెన్', 'Tender chicken cooked with crunchy bell peppers, onions, and freshly roasted kadai spices.', 25000, '/dishes/3d_curries.jpg', false, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (10, 1, 2, 'Andhra Chicken Curry (Guntur Spiced)', 'ఆంధ్రా చికెన్ కర్రీ', 'Fiery Rayalaseema/Andhra style chicken curry with local red chillies, poppy seeds, and roasted coconut gravy.', 24000, '/dishes/3d_curries.jpg', false, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (11, 1, 2, 'Paneer Butter Masala', 'పన్నీర్ బట్టర్ మసాలా', 'Rich and creamy cottage cheese cubes bathed in smooth butter and cashew tomato gravy with kasuri methi.', 23000, '/dishes/3d_curries.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (12, 1, 2, 'Kadai Paneer', 'కడాయి పన్నీర్', 'Cottage cheese cubes tossed with capsicum, diced onions, and freshly crushed spices in a rich gravy.', 23000, '/dishes/3d_curries.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (13, 1, 2, 'Kaju Tomato Curry', 'కాజు టొమాటో కర్రీ', 'Crispy whole cashews cooked in a flavorful rich sweet-and-tangy tomato gravy.', 25000, '/dishes/3d_curries.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (14, 1, 2, 'Dal Tadka (Desi Ghee)', 'దాల్ తడ్కా', 'Yellow toor dal tempered with cumin, garlic, red chillies, and aromatic pure desi ghee.', 16000, '/dishes/3d_curries.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (15, 1, 2, 'Mushroom Masala', 'మష్రూమ్ మసాలా', 'Button mushrooms cooked in an onion-tomato spicy masala with whole aromatic herbs.', 22000, '/dishes/3d_curries.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (16, 1, 3, 'Tandoori Chicken (Full / Half)', 'తందూరి చికెన్', 'Whole chicken marinated overnight in Kashmiri chilli, spiced hung curd, and roasted over clay charcoal tandoor.', 26000, '/dishes/3d_nonveg_starters.jpg', false, true, true, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (17, 1, 3, 'Chicken Tikka (6 Pcs)', 'చికెన్ టిక్కా (6)', 'Boneless chicken chunks marinated in mustard oil, ajwain, and tandoori spices, char-grilled to perfection.', 25000, '/dishes/3d_nonveg_starters.jpg', false, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (18, 1, 3, 'Tangdi Kebab (3 Pcs)', 'టాంగ్డి కబాబ్ (3)', 'Chicken drumsticks stuffed with cheese and spices, roasted golden in charcoal tandoor.', 26000, '/dishes/3d_nonveg_starters.jpg', false, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (19, 1, 3, 'Paneer Tikka (6 Pcs)', 'పన్నీర్ టిక్కా (6)', 'Juicy chunks of malai paneer and crunchy peppers marinated in tandoori masala and grilled on skewers.', 22000, '/dishes/3d_veg_starters.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (20, 1, 4, 'Chicken Lollipop (Saucy / Dry)', 'చికెన్ లాలిపాప్ (6)', 'Crispy seasoned chicken winglets served crispy dry or tossed in spicy Indo-Chinese garlic sauce.', 24000, '/dishes/chicken_lollipop.jpg', false, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (21, 1, 4, 'Chilli Chicken', 'చిల్లీ చికెన్', 'Crispy boneless chicken tossed with green chillies, onions, garlic, and dark soy sauce.', 24000, '/dishes/3d_nonveg_starters.jpg', false, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (22, 1, 4, 'Dragon Chicken', 'డ్రాగన్ చికెన్', 'Crispy chicken strips tossed in spicy sweet chili sauce, roasted cashews, and sesame seeds.', 25000, '/dishes/3d_nonveg_starters.jpg', false, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (23, 1, 4, 'Apollo Fish', 'అపోలో ఫిష్', 'Hyderabadi style boneless fish fillets spiced with curry leaves, yogurt, green chillies, and spices.', 28000, '/dishes/3d_nonveg_starters.jpg', false, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (24, 1, 4, 'Guntur Chicken Dry', 'గుంటూరు చికెన్ ఫ్రై', 'Traditional spicy dry roasted chicken infused with Guntur red chillies and curry leaves.', 25000, '/dishes/3d_nonveg_starters.jpg', false, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (25, 1, 5, 'Crispy Corn Pepper Salt', 'క్రిస్పీ కార్న్', 'Golden fried American sweet corn tossed with freshly cracked black pepper, capsicum, and spring onions.', 18000, '/dishes/3d_veg_starters.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (26, 1, 5, 'Veg Manchurian (Dry)', 'వెజ్ మంచూరియా', 'Crispy vegetable dumplings tossed with ginger, garlic, chopped onions, and Indo-Chinese sauces.', 17000, '/dishes/3d_veg_starters.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (27, 1, 5, 'Chilli Paneer (Dry)', 'చిల్లీ పన్నీర్', 'Batter-fried paneer cubes wok-tossed with capsicum, garlic, spring onions, and green chillies.', 21000, '/dishes/3d_veg_starters.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (28, 1, 5, 'Gobi 65', 'గోబీ 65', 'Crispy spiced cauliflower florets tossed with curry leaves, crushed pepper, and lemon juice.', 16000, '/dishes/3d_veg_starters.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (29, 1, 6, 'Butter Naan', 'బట్టర్ నాన్', 'Soft, fluffy clay-oven leavened bread brushed generously with melting butter.', 5000, '/dishes/3d_curries.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (30, 1, 6, 'Garlic Butter Naan', 'గార్లిక్ బట్టర్ నాన్', 'Tandoori naan topped with roasted garlic flakes, fresh coriander, and melted butter.', 6500, '/dishes/3d_curries.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (31, 1, 6, 'Tandoori Roti (Butter)', 'తందూరి రోటీ (బట్టర్)', 'Whole wheat bread baked in clay tandoor and brushed with fresh butter.', 3000, '/dishes/3d_curries.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (32, 1, 6, 'Tandoori Roti (Plain)', 'తందూరి రోటీ (ప్లెయిన్)', 'Crisp and healthy traditional whole wheat roti baked in charcoal tandoor.', 2500, '/dishes/3d_curries.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (33, 1, 6, 'Rumali Roti', 'రుమాలి రోటీ', 'Hand-tossed ultra-thin, soft handkerchief-style Indian bread.', 3500, '/dishes/3d_curries.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (34, 1, 7, 'Surya Special Chicken Fried Rice', 'స్పెషల్ చికెన్ ఫ్రైడ్ రైస్', 'Wok-tossed basmati rice with shredded chicken, scramble egg, crunchy veggies, and chef''s special seasoning.', 21000, '/dishes/3d_biryani.jpg', false, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (35, 1, 7, 'Schezwan Chicken Fried Rice', 'షెజ్వాన్ చికెన్ ఫ్రైడ్ రైస్', 'Spicy wok-fried rice tossed with fiery Schezwan sauce, chicken, and spring onions.', 22000, '/dishes/3d_biryani.jpg', false, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (36, 1, 7, 'Veg Fried Rice', 'వెజ్ ఫ్రైడ్ రైస్', 'Classic wok-tossed rice with finely chopped carrots, beans, cabbage, and light soy sauce.', 17000, '/dishes/3d_biryani.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (37, 1, 7, 'Chicken Hakka Noodles', 'చికెన్ హక్కా నూడుల్స్', 'Stir-fried noodles with shredded chicken, crisp cabbage, capsicum, and oriental spices.', 21000, '/dishes/3d_biryani.jpg', false, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (38, 1, 7, 'Veg Hakka Noodles', 'వెజ్ హక్కా నూడుల్స్', 'Street-style stir-fried wheat noodles with garden fresh vegetables and mild spices.', 17000, '/dishes/3d_biryani.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (39, 1, 8, 'Chicken Manchow Soup', 'చికెన్ మంచోవ్ సూప్', 'Hearty Indo-Chinese spiced soup with chicken and egg, topped with crispy fried noodles.', 13000, '/dishes/mutton_maraq_soup.jpg', false, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (40, 1, 8, 'Sweet Corn Chicken Soup', 'స్వీట్ కార్న్ చికెన్ సూప్', 'Comforting creamy sweet corn soup with tender chicken shreds and egg drops.', 13000, '/dishes/mutton_maraq_soup.jpg', false, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (41, 1, 8, 'Cream of Tomato Soup', 'టొమాటో సూప్', 'Silky smooth ripe tomato soup with butter, herbs, and crispy golden croutons.', 11000, '/dishes/mutton_maraq_soup.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (42, 1, 9, 'Curd Rice (Bagala Bath)', 'పెరుగు అన్నం', 'Cooling and creamy tempered homemade curd rice with mustard, ginger, green chillies, and pomegranate.', 10000, '/dishes/curd.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (43, 1, 9, 'Jeera Rice', 'జీరా రైస్', 'Fragrant long-grain basmati rice tempered with roasted cumin seeds and fresh coriander in pure ghee.', 14000, '/dishes/3d_biryani.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (44, 1, 10, 'Fresh Lime Soda (Sweet / Salt)', 'లెమన్ సోడా', 'Refreshing fizzy soda infused with freshly squeezed Kadiri lemon juice and mint.', 5000, '/dishes/kunafa.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (45, 1, 10, 'Sweet Lassi (Chilled)', 'స్వీట్ లస్సీ', 'Thick whipped sweet yogurt lassi topped with malai and cardamom essence.', 6000, '/dishes/kunafa.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (46, 1, 10, 'Gulab Jamun with Vanilla Ice Cream (2 Pcs)', 'గులాబ్ జామూన్ విత్ ఐస్ క్రీం', 'Warm, melt-in-the-mouth mawa gulab jamuns served alongside a scoop of rich vanilla ice cream.', 9000, '/dishes/kunafa.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (47, 1, 10, 'Apricot Delight (Surya Special)', 'ఆప్రికాట్ డిలైట్', 'Rich layered dessert made of stewed Turkish apricots, sponge cake, and thick fresh cream.', 12000, '/dishes/kunafa.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) VALUES (48, 1, 10, 'Thums Up / Soft Drinks (750ml)', 'కూల్ డ్రింక్', 'Chilled beverage bottle.', 4500, '/dishes/kunafa.jpg', true, true, false, 100) ON CONFLICT (id) DO NOTHING;


INSERT INTO menu_item_variants (id, item_id, name, name_te, price_paise, is_default, is_available) VALUES (1, 1, 'Single (Regular)', 'సింగిల్', 19000, false, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_item_variants (id, item_id, name, name_te, price_paise, is_default, is_available) VALUES (2, 1, 'Full (Serves 2)', 'ఫుల్ (ఇద్దరికి)', 26000, true, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_item_variants (id, item_id, name, name_te, price_paise, is_default, is_available) VALUES (3, 1, 'Family Pack (Serves 4)', 'ఫ్యామిలీ ప్యాక్ (నలుగురికి)', 54000, false, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_item_variants (id, item_id, name, name_te, price_paise, is_default, is_available) VALUES (4, 1, 'Jumbo Pack (Serves 6)', 'జంబో ప్యాక్ (ఆరుగురికి)', 79000, false, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_item_variants (id, item_id, name, name_te, price_paise, is_default, is_available) VALUES (5, 2, 'Single', 'సింగిల్', 20000, false, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_item_variants (id, item_id, name, name_te, price_paise, is_default, is_available) VALUES (6, 2, 'Full', 'ఫుల్', 28000, true, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_item_variants (id, item_id, name, name_te, price_paise, is_default, is_available) VALUES (7, 2, 'Family Pack', 'ఫ్యామిలీ ప్యాక్', 58000, false, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_item_variants (id, item_id, name, name_te, price_paise, is_default, is_available) VALUES (8, 3, 'Full', 'ఫుల్', 36000, true, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_item_variants (id, item_id, name, name_te, price_paise, is_default, is_available) VALUES (9, 3, 'Family Pack', 'ఫ్యామిలీ ప్యాక్', 75000, false, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_item_variants (id, item_id, name, name_te, price_paise, is_default, is_available) VALUES (10, 4, 'Regular', 'రెగ్యులర్', 25000, true, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_item_variants (id, item_id, name, name_te, price_paise, is_default, is_available) VALUES (11, 4, 'Family Pack', 'ఫ్యామిలీ ప్యాక్', 52000, false, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_item_variants (id, item_id, name, name_te, price_paise, is_default, is_available) VALUES (12, 16, 'Half (2 Pcs)', 'హాఫ్ (2 ముక్కలు)', 26000, true, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_item_variants (id, item_id, name, name_te, price_paise, is_default, is_available) VALUES (13, 16, 'Full (4 Pcs)', 'ఫుల్ (4 ముక్కలు)', 48000, false, true) ON CONFLICT (id) DO NOTHING;


INSERT INTO menu_item_addons (id, item_id, name, name_te, price_paise, is_available) VALUES (1, 1, 'Extra Biryani Rice', 'ఎక్స్ట్రా బిర్యానీ రైస్', 11000, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_item_addons (id, item_id, name, name_te, price_paise, is_available) VALUES (2, 1, 'Extra Boiled Egg (1 pc)', 'ఎక్స్ట్రా గుడ్డు', 2000, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_item_addons (id, item_id, name, name_te, price_paise, is_available) VALUES (3, 1, 'Extra Salan & Raita', 'సాలన్ & రైతా', 3000, true) ON CONFLICT (id) DO NOTHING;


INSERT INTO coupons (id, outlet_id, code, description, discount_type, discount_value, min_order_paise, max_discount_paise, is_active) VALUES (1, 1, 'WELCOME50', 'Flat ₹50 OFF on Kadiri Deliveries above ₹250', 'flat', 5000, 25000, 0, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO coupons (id, outlet_id, code, description, discount_type, discount_value, min_order_paise, max_discount_paise, is_active) VALUES (2, 1, 'BIRYANI10', '10% OFF on Special Biryani & Pulao Orders (Up to ₹100)', 'percent', 10, 30000, 10000, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO coupons (id, outlet_id, code, description, discount_type, discount_value, min_order_paise, max_discount_paise, is_active) VALUES (3, 1, 'SURYA100', 'Flat ₹100 OFF on Surya Family Feasts above ₹600', 'flat', 10000, 60000, 0, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO coupons (id, outlet_id, code, description, discount_type, discount_value, min_order_paise, max_discount_paise, is_active) VALUES (4, 1, 'NAAN20', 'Flat ₹20 OFF on Curries & Butter Naan Combos', 'flat', 2000, 10000, 0, true) ON CONFLICT (id) DO NOTHING;


SELECT setval(pg_get_serial_sequence('outlets', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM outlets;
SELECT setval(pg_get_serial_sequence('categories', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM categories;
SELECT setval(pg_get_serial_sequence('menu_items', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM menu_items;
SELECT setval(pg_get_serial_sequence('menu_item_variants', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM menu_item_variants;
SELECT setval(pg_get_serial_sequence('menu_item_addons', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM menu_item_addons;
SELECT setval(pg_get_serial_sequence('tables', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM tables;
SELECT setval(pg_get_serial_sequence('coupons', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM coupons;
SELECT setval(pg_get_serial_sequence('customers', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM customers;
SELECT setval(pg_get_serial_sequence('orders', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM orders;
SELECT setval(pg_get_serial_sequence('order_items', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM order_items;
SELECT setval(pg_get_serial_sequence('payments', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM payments;