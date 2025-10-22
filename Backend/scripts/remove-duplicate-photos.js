/**
 * Migration Script: Remove Duplicate Photos
 * 
 * This script finds and removes duplicate photos based on filename + album + club
 * Keeps the oldest upload and removes newer duplicates
 * 
 * Usage: node scripts/remove-duplicate-photos.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../src/config');

async function removeDuplicatePhotos() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const { Document } = require('../src/modules/document/document.model');

    console.log('🔍 Finding duplicate photos...');

    // Find duplicates using aggregation
    const duplicates = await Document.aggregate([
      {
        $match: {
          type: 'photo'
        }
      },
      {
        $group: {
          _id: {
            club: '$club',
            album: '$album',
            filename: '$metadata.filename'
          },
          docs: { $push: { id: '$_id', createdAt: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    console.log(`📸 Found ${duplicates.length} groups of duplicate photos`);

    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!');
      return;
    }

    let totalRemoved = 0;

    for (const duplicate of duplicates) {
      // Sort by createdAt (keep oldest)
      duplicate.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      // Keep first (oldest), remove rest
      const toKeep = duplicate.docs[0];
      const toRemove = duplicate.docs.slice(1);

      console.log(`\n📄 File: ${duplicate._id.filename}`);
      console.log(`   Album: ${duplicate._id.album}`);
      console.log(`   Total copies: ${duplicate.count}`);
      console.log(`   Keeping: ${toKeep.id} (created: ${toKeep.createdAt})`);
      console.log(`   Removing: ${toRemove.length} duplicate(s)`);

      // Delete duplicates
      const idsToRemove = toRemove.map(doc => doc.id);
      const result = await Document.deleteMany({
        _id: { $in: idsToRemove }
      });

      console.log(`   ✅ Removed ${result.deletedCount} duplicate(s)`);
      totalRemoved += result.deletedCount;
    }

    console.log(`\n✅ Total duplicates removed: ${totalRemoved}`);

    // Show final stats
    const totalPhotos = await Document.countDocuments({ type: 'photo' });
    console.log(`\n📊 Final photo count: ${totalPhotos} photos`);

    // Show count by club
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

    console.log(`\n📊 Photo count by club (Cloudinary only):`);
    countByClub.forEach(club => {
      const warning = club.photoCount > 10 ? ' ⚠️  OVER LIMIT' : '';
      console.log(`   ${club.clubName || club.clubId}: ${club.photoCount}/10${warning}`);
    });

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Run script
if (require.main === module) {
  removeDuplicatePhotos();
}

module.exports = { removeDuplicatePhotos };
