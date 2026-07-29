// MongoDB initialization script
// Runs once when container first starts with a fresh data volume
// Creates the smart_kisan database user with least-privilege access

db = db.getSiblingDB('smart_kisan');

db.createUser({
  user: 'sk_app',
  pwd: process.env.MONGO_APP_PASS || 'sk_app_pass_change_in_prod',
  roles: [
    { role: 'readWrite', db: 'smart_kisan' }
  ]
});

// Create initial indexes (also handled by Mongoose, but good to have here too)
db.users.createIndex({ email: 1 }, { unique: true, sparse: true });
db.users.createIndex({ phone: 1 }, { unique: true, sparse: true });
db.users.createIndex({ role: 1, 'location.state': 1 });

db.farms.createIndex({ boundary: '2dsphere' });
db.farms.createIndex({ location: '2dsphere' });
db.farms.createIndex({ owner: 1, createdAt: -1 });

db.weathercaches.createIndex({ geohash: 1, timestamp: 1 });
db.weathercaches.createIndex({ createdAt: 1 }, { expireAfterSeconds: 1800 }); // 30-min TTL

db.marketprices.createIndex({ mandi_id: 1, commodity: 1, date: -1 });
db.products.createIndex({ category: 1, price: 1, rating: -1 });

print('✅ Smart Kisan MongoDB initialized successfully.');
