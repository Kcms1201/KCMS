# Photo Upload Issues - Fix Guide

## Issues Identified

From the screenshot analysis:

1. ✅ **Photo count shows "0/10 photos"** - Even though 8 photos are displayed
2. ✅ **Duplicate images are being uploaded** - Same images appear multiple times

---

## Root Causes

### Issue 1: Photo Count = 0
**Cause:** Existing photos in the database don't have the `storageType` field set to `'cloudinary'`. The counting query filters by `storageType: 'cloudinary'`, so photos without this field aren't counted.

**Code Location:** `document.service.js` line 325-329

### Issue 2: Duplicate Photos Allowed
**Cause:** No duplicate detection was implemented when uploading files. The same filename could be uploaded multiple times to the same album.

**Code Location:** `document.service.js` line 17-31 (now fixed)

---

## Fixes Applied

### 1. Cloudinary Upload Configuration ✅
**Fixed:** Removed invalid `format: 'auto'` parameter from Cloudinary upload
- **File:** `src/utils/cloudinary.js`
- **Change:** Removed line causing "Invalid extension in transformation: auto" error

### 2. Explicit Storage Type ✅
**Fixed:** All new photo uploads now explicitly set `storageType: 'cloudinary'`
- **File:** `src/modules/document/document.service.js` line 70
- **Change:** Added `storageType: 'cloudinary'` to document creation

### 3. Duplicate Detection ✅
**Fixed:** Checks for existing filename in same album before upload
- **File:** `src/modules/document/document.service.js` lines 21-31
- **Logic:** Skips duplicate files and logs warning

---

## Migration Required

Since existing photos don't have `storageType` set, you need to run migration scripts:

### Step 1: Fix Existing Photos (Set Storage Type)

```bash
npm run fix:photo-storage
```

**What it does:**
- Finds all photos without `storageType` field
- Sets `storageType = 'cloudinary'` for all of them
- Shows count by club
- Verifies the fix

**Expected Output:**
```
📸 Found 8 photos without storageType
✅ Updated 8 photos with storageType = 'cloudinary'
📊 Photo count by club:
   Organising Committee: 8 photos
```

### Step 2: Remove Duplicate Photos

```bash
npm run fix:duplicates
```

**What it does:**
- Finds duplicate photos (same filename + album + club)
- Keeps the oldest upload
- Removes newer duplicates
- Shows how many were removed

**Expected Output:**
```
📸 Found 4 groups of duplicate photos
📄 File: IMG-20251018-WA0022.jpg
   Keeping oldest, removing 1 duplicate
✅ Total duplicates removed: 4
📊 Final photo count: 8 photos
```

---

## Verify the Fix

After running both scripts, test the upload:

1. **Check Photo Count**
   - Navigate to Gallery
   - Should show "8/10 photos" (or actual count)

2. **Try Uploading Duplicate**
   - Upload the same image again
   - Should be rejected silently (server logs: "⚠️ Skipping duplicate file")

3. **Upload New Photo**
   - Upload a different image
   - Should work normally
   - Count should increment to "9/10 photos"

---

## Code Changes Summary

### src/utils/cloudinary.js
```javascript
// BEFORE (BROKEN)
async function uploadImage(filePath, options = {}) {
  const uploadOptions = {
    resource_type: 'image',
    format: 'auto', // ❌ Invalid parameter
    quality: 'auto:good',
    fetch_format: 'auto',
    flags: 'progressive',
    ...options
  };
  ...
}

// AFTER (FIXED)
async function uploadImage(filePath, options = {}) {
  const uploadOptions = {
    resource_type: 'image',
    quality: 'auto:good', // ✅ Auto quality
    fetch_format: 'auto', // ✅ Auto format selection
    flags: 'progressive',
    ...options
  };
  ...
}
```

### src/modules/document/document.service.js
```javascript
// NEW: Duplicate detection (lines 21-31)
for (const file of files) {
  // Check for duplicate filename in same album
  const existingDoc = await Document.findOne({
    club: clubId,
    album: album,
    'metadata.filename': file.originalname
  });

  if (existingDoc) {
    console.log(`⚠️ Skipping duplicate file: ${file.originalname}`);
    continue; // Skip this file
  }
  ...
}

// NEW: Explicit storage type (line 70)
const doc = await Document.create({
  club: clubId,
  album,
  type,
  storageType: 'cloudinary', // ✅ Explicitly set for counting
  url,
  thumbUrl,
  ...
});
```

---

## Testing Checklist

- [ ] Run `npm run fix:photo-storage`
- [ ] Run `npm run fix:duplicates`
- [ ] Restart backend server
- [ ] Refresh frontend gallery page
- [ ] Verify photo count shows correctly (e.g., "8/10 photos")
- [ ] Try uploading same photo again → Should be rejected
- [ ] Upload new photo → Should work and increment count
- [ ] Upload 3+ photos to reach 10/10 limit
- [ ] Verify limit enforcement works

---

## Future Uploads

All future uploads will:
- ✅ Automatically set `storageType: 'cloudinary'`
- ✅ Be counted correctly
- ✅ Reject duplicates (same filename in same album)
- ✅ Enforce 10 photo limit per club

---

## Troubleshooting

### Photo count still shows 0/10
**Solution:** Make sure you ran `npm run fix:photo-storage`

### Duplicates still being uploaded
**Solution:** 
1. Make sure server is restarted after code changes
2. Check server logs for "⚠️ Skipping duplicate file" message
3. If not appearing, duplicate detection isn't running

### Photos not uploading at all
**Solution:**
1. Check Cloudinary configuration in `.env`
2. Check server logs for error messages
3. Verify Cloudinary API keys are correct

### Over 10 photo limit
**Solution:**
1. Delete some photos OR
2. Use Google Drive links for additional photos:
   ```
   POST /api/clubs/:clubId/documents/drive-link
   {
     "album": "Navaraas - 2025",
     "driveUrl": "https://drive.google.com/drive/folders/YOUR_FOLDER_ID",
     "folderName": "Navaraas Photos",
     "photoCount": 50
   }
   ```

---

## Database Schema Update

The Document model now enforces storage type:

```javascript
{
  club: ObjectId,
  album: String,
  type: 'photo',
  storageType: 'cloudinary', // ✅ Now explicitly set
  url: String,
  thumbUrl: String,
  metadata: {
    filename: String, // ✅ Used for duplicate detection
    size: Number,
    mimeType: String
  },
  uploadedBy: ObjectId,
  createdAt: Date
}
```

---

## Summary

✅ **Cloudinary error fixed** - Removed invalid `format: 'auto'`  
✅ **Photo counting fixed** - Explicit `storageType` field  
✅ **Duplicate detection added** - Prevents re-uploading same files  
✅ **Migration scripts created** - Fix existing data  

**Run the migration scripts to fix existing photos!**

```bash
npm run fix:photo-storage
npm run fix:duplicates
```
