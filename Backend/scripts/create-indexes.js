/**
 * Database Indexes Migration Script
 * Creates required compound indexes as per workplan specifications (Lines 592-597)
 * 
 * Usage: node scripts/create-indexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../src/config');

const INDEXES = [
  // Users collection
  {
    collection: 'users',
    indexes: [
      { keys: { rollNumber: 1 }, options: { unique: true, name: 'idx_rollNumber' } },
      { keys: { email: 1 }, options: { unique: true, name: 'idx_email' } },
      { keys: { status: 1 }, options: { name: 'idx_status' } },
      { keys: { 'roles.global': 1 }, options: { name: 'idx_global_role' } }
    ]
  },
  
  // Clubs collection
  {
    collection: 'clubs',
    indexes: [
      { keys: { name: 1 }, options: { unique: true, name: 'idx_name' } },
      { keys: { category: 1, status: 1 }, options: { name: 'idx_category_status' } },
      { keys: { status: 1 }, options: { name: 'idx_status' } },
      { keys: { coordinator: 1 }, options: { name: 'idx_coordinator' } }
    ]
  },
  
  // Events collection
  {
    collection: 'events',
    indexes: [
      { keys: { dateTime: 1, club: 1, status: 1 }, options: { name: 'idx_datetime_club_status' } },
      { keys: { club: 1, status: 1 }, options: { name: 'idx_club_status' } },
      { keys: { dateTime: 1 }, options: { name: 'idx_datetime' } },
      { keys: { status: 1 }, options: { name: 'idx_status' } },
      { keys: { isPublic: 1 }, options: { name: 'idx_isPublic' } }
    ]
  },
  
  // Recruitments collection
  {
    collection: 'recruitments',
    indexes: [
      { keys: { status: 1, endDate: 1 }, options: { name: 'idx_status_endDate' } },
      { keys: { status: 1, startDate: 1 }, options: { name: 'idx_status_startDate' } },
      { keys: { club: 1, status: 1 }, options: { name: 'idx_club_status' } },
      { keys: { endDate: 1 }, options: { name: 'idx_endDate' } }
    ]
  },
  
  // Notifications collection
  {
    collection: 'notifications',
    indexes: [
      { keys: { user: 1, isRead: 1, createdAt: -1 }, options: { name: 'idx_user_read_created' } },
      { keys: { user: 1, createdAt: -1 }, options: { name: 'idx_user_created' } },
      { keys: { queuedForBatch: 1, priority: 1 }, options: { name: 'idx_batch_priority' } },
      { keys: { priority: 1 }, options: { name: 'idx_priority' } }
    ]
  },
  
  // Applications collection
  {
    collection: 'applications',
    indexes: [
      { keys: { recruitment: 1, user: 1 }, options: { unique: true, name: 'idx_recruitment_user' } },
      { keys: { recruitment: 1, status: 1 }, options: { name: 'idx_recruitment_status' } },
      { keys: { user: 1, status: 1 }, options: { name: 'idx_user_status' } }
    ]
  },
  
  // Memberships collection
  {
    collection: 'memberships',
    indexes: [
      { keys: { club: 1, user: 1 }, options: { unique: true, name: 'idx_club_user' } },
      { keys: { club: 1, status: 1 }, options: { name: 'idx_club_status' } },
      { keys: { user: 1, status: 1 }, options: { name: 'idx_user_status' } },
      { keys: { status: 1 }, options: { name: 'idx_status' } }
    ]
  },
  
  // Sessions collection
  {
    collection: 'sessions',
    indexes: [
      { keys: { sha256Hash: 1 }, options: { unique: true, name: 'idx_sha256' } },
      { keys: { user: 1, revokedAt: 1 }, options: { name: 'idx_user_revoked' } },
      { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0, name: 'idx_ttl_expires' } }
    ]
  },
  
  // Password Resets collection
  {
    collection: 'passwordresets',
    indexes: [
      { keys: { user: 1, usedAt: 1 }, options: { name: 'idx_user_used' } },
      { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0, name: 'idx_ttl_expires' } }
    ]
  },
  
  // Audit Logs collection
  {
    collection: 'auditlogs',
    indexes: [
      { keys: { user: 1, createdAt: -1 }, options: { name: 'idx_user_created' } },
      { keys: { action: 1, createdAt: -1 }, options: { name: 'idx_action_created' } },
      { keys: { createdAt: -1 }, options: { name: 'idx_created' } }
    ]
  },
  
  // Documents collection
  {
    collection: 'documents',
    indexes: [
      { keys: { club: 1, type: 1 }, options: { name: 'idx_club_type' } },
      { keys: { club: 1, album: 1 }, options: { name: 'idx_club_album' } },
      { keys: { uploadedBy: 1 }, options: { name: 'idx_uploadedBy' } }
    ]
  },
  
  // Budget Requests collection
  {
    collection: 'budgetrequests',
    indexes: [
      { keys: { event: 1 }, options: { name: 'idx_event' } },
      { keys: { status: 1 }, options: { name: 'idx_status' } },
      { keys: { approvedBy: 1 }, options: { name: 'idx_approvedBy' } }
    ]
  },
  
  // Unsubscribe Preferences collection (Workplan Line 368)
  {
    collection: 'unsubscribes',
    indexes: [
      { keys: { user: 1 }, options: { unique: true, name: 'idx_user' } },
      { keys: { unsubscribeToken: 1 }, options: { unique: true, name: 'idx_token' } },
      { keys: { email: 1 }, options: { name: 'idx_email' } }
    ]
  },
  
  // Push Subscriptions collection (Workplan Line 373: Browser push notifications)
  {
    collection: 'pushsubscriptions',
    indexes: [
      { keys: { user: 1, active: 1 }, options: { name: 'idx_user_active' } },
      { keys: { 'subscription.endpoint': 1 }, options: { unique: true, name: 'idx_endpoint' } },
      { keys: { active: 1 }, options: { name: 'idx_active' } }
    ]
  }
];

async function createIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const { collection, indexes } of INDEXES) {
      console.log(`📋 Processing collection: ${collection}`);
      
      // Check if collection exists
      const collections = await db.listCollections({ name: collection }).toArray();
      if (collections.length === 0) {
        console.log(`   ⚠️  Collection '${collection}' does not exist yet. Skipping...`);
        continue;
      }

      const coll = db.collection(collection);

      for (const { keys, options } of indexes) {
        const indexName = options.name || Object.keys(keys).join('_');
        try {
          // Check if index already exists by keys (not just name)
          const existingIndexes = await coll.indexes();
          const keysMatch = (idx1Keys, idx2Keys) => {
            const keys1 = Object.keys(idx1Keys).filter(k => k !== '_id');
            const keys2 = Object.keys(idx2Keys).filter(k => k !== '_id');
            if (keys1.length !== keys2.length) return false;
            return keys1.every(k => idx1Keys[k] === idx2Keys[k]);
          };
          
          const existingIndex = existingIndexes.find(idx => keysMatch(idx.key, keys));

          if (existingIndex) {
            console.log(`   ⏭️  Index with same keys already exists as '${existingIndex.name}'`);
            totalSkipped++;
            continue;
          }

          // Create index
          await coll.createIndex(keys, options);
          console.log(`   ✅ Created index '${indexName}'`);
          totalCreated++;
        } catch (error) {
          console.error(`   ❌ Failed to create index '${indexName}':`, error.message);
          totalErrors++;
        }
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Index Creation Summary:');
    console.log(`   ✅ Created: ${totalCreated}`);
    console.log(`   ⏭️  Skipped: ${totalSkipped}`);
    console.log(`   ❌ Errors: ${totalErrors}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (totalErrors === 0) {
      console.log('✅ All indexes created successfully!');
    } else {
      console.log('⚠️  Some indexes failed to create. Please review errors above.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Run migration
if (require.main === module) {
  createIndexes();
}

module.exports = { createIndexes, INDEXES };
