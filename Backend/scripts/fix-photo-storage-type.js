/**
 * Migration Script: Fix Photo Storage Type
 * 
 * This script updates existing photos that don't have storageType set
 * to explicitly set storageType = 'cloudinary' for proper counting
 * 
 * Usage: node scripts/fix-photo-storage-type.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../src/config');

async function fixPhotoStorageType() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const { Document } = require('../src/modules/document/document.model');

    // Find all photos that don't have storageType set or have wrong value
    const photosToFix = await Document.find({
      type: 'photo',
      $or: [
        { storageType: { $exists: false } },
        { storageType: null }
      ]
    });

    console.log(`📸 Found ${photosToFix.length} photos without storageType`);

    if (photosToFix.length === 0) {
      console.log('✅ All photos already have storageType set!');
      return;
    }

    // Update all photos to have storageType = 'cloudinary'
    const result = await Document.updateMany(
      {
        type: 'photo',
        $or: [
          { storageType: { $exists: false } },
          { storageType: null }
        ]
      },
      {
        $set: { storageType: 'cloudinary' }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} photos with storageType = 'cloudinary'`);

    // Verify the fix
    const remainingPhotos = await Document.countDocuments({
      type: 'photo',
      $or: [
        { storageType: { $exists: false } },
        { storageType: null }
      ]
    });

    console.log(`\n📊 Verification:`);
    console.log(`   Remaining photos without storageType: ${remainingPhotos}`);
    
    if (remainingPhotos === 0) {
      console.log('✅ All photos now have storageType set correctly!');
    } else {
      console.log('⚠️  Some photos still need fixing');
    }

    // Show count per club
    const countByClub = await Document.aggregate([
      {
        $match: {
          type: 'photo',
          storageType: 'cloudinary'
        }
      },
      {
        $group: {
          _id: '$club',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'clubs',
          localField: '_id',
          foreignField: '_id',
          as: 'clubInfo'
        }
      },
      {
        $project: {
          clubId: '$_id',
          clubName: { $arrayElemAt: ['$clubInfo.name', 0] },
          photoCount: '$count'
        }
      },
      {
        $sort: { photoCount: -1 }
      }
    ]);

    console.log(`\n📊 Photo count by club:`);
    countByClub.forEach(club => {
      console.log(`   ${club.clubName || club.clubId}: ${club.photoCount} photos`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Run migration
if (require.main === module) {
  fixPhotoStorageType();
}

module.exports = { fixPhotoStorageType };
