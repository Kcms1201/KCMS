# 🚨 CRITICAL BUG: Multiple Leadership Roles Across Clubs

**Date:** Oct 29, 2025  
**Severity:** HIGH  
**Status:** IDENTIFIED - NEEDS MANUAL FIX

---

## ❌ **BUG DESCRIPTION:**

**User Screenshot Shows:**
```
Student has:
├─ AALAP Music Club: SR CLUB HEAD (President)
└─ Mudra Club: SECRETARY ❌ VIOLATION!
```

**Rule Violated:**  
"If a student is president/vice president in ONE club, they can only be a REGULAR MEMBER in other clubs."

---

## 🔍 **ROOT CAUSE:**

### **File:** `Backend/src/modules/club/club.service.js`

### **Function 1: `addMember` (Lines 723-737)**

```javascript
// ✅ CROSS-CLUB RESTRICTION
if (ELEVATED_ROLES.includes(role)) {
  const otherLeadership = await Membership.findOne({
    user: userId,
    club: { $ne: clubId },
    role: { $in: LEADERSHIP_ROLES },  // ❌ BUG: Only checks president/VP
    status: 'approved'
  });
  
  if (otherLeadership) {
    throw new Error('...');
  }
}
```

### **Function 2: `updateMemberRole` (Lines 855-869)**

```javascript
// ✅ CROSS-CLUB RESTRICTION
if (ELEVATED_ROLES.includes(role)) {
  const otherLeadership = await Membership.findOne({
    user: membership.user,
    club: { $ne: clubId },
    role: { $in: LEADERSHIP_ROLES },  // ❌ BUG: Only checks president/VP
    status: 'approved'
  });
  
  if (otherLeadership) {
    throw new Error('...');
  }
}
```

**THE PROBLEM:**

```javascript
const ELEVATED_ROLES = ['core', 'secretary', 'treasurer', 'leadPR', 'leadTech', 'president', 'vicePresident'];
const LEADERSHIP_ROLES = ['president', 'vicePresident'];

// Current check:
role: { $in: LEADERSHIP_ROLES }  // Only checks president/VP

// Should be:
role: { $in: ELEVATED_ROLES }  // Check ALL elevated roles
```

**Result:**
- ✅ Blocks: President in Club A + President in Club B
- ✅ Blocks: President in Club A + Vice President in Club B
- ❌ ALLOWS: President in Club A + Secretary in Club B ← BUG!
- ❌ ALLOWS: President in Club A + Core in Club B ← BUG!

---

## ✅ **THE FIX:**

### **Change in addMember (Line 728):**

```javascript
// OLD:
role: { $in: LEADERSHIP_ROLES },  // ❌ Only president/VP

// NEW:
role: { $in: ELEVATED_ROLES },  // ✅ All elevated roles
```

### **Change in updateMemberRole (Line 860):**

```javascript
// OLD:
role: { $in: LEADERSHIP_ROLES },  // ❌ Only president/VP

// NEW:
role: { $in: ELEVATED_ROLES },  // ✅ All elevated roles
```

### **Enhanced Error Message:**

```javascript
if (otherElevatedRole) {
  const otherClub = await Club.findById(otherElevatedRole.club);
  const roleDisplay = {
    president: 'President (Sr Club Head)',
    vicePresident: 'Vice President (Jr Club Head)',
    core: 'Core Member',
    secretary: 'Secretary',
    treasurer: 'Treasurer',
    leadPR: 'Lead PR',
    leadTech: 'Lead Tech'
  };
  
  throw new Error(
    `This user is already ${roleDisplay[otherElevatedRole.role]} in ${otherClub.name}. ` +
    `Students can hold leadership/core positions in only ONE club. ` +
    `They can only be added as a regular member here.`
  );
}
```

---

## 📝 **MANUAL FIX INSTRUCTIONS:**

### **Step 1: Edit addMember function**

**File:** `Backend/src/modules/club/club.service.js`  
**Line:** 728

**Change:**
```javascript
role: { $in: LEADERSHIP_ROLES },
```

**To:**
```javascript
role: { $in: ELEVATED_ROLES },  // ✅ Check ALL elevated roles
```

### **Step 2: Edit updateMemberRole function**

**File:** `Backend/src/modules/club/club.service.js`  
**Line:** 860

**Change:**
```javascript
role: { $in: LEADERSHIP_ROLES },
```

**To:**
```javascript
role: { $in: ELEVATED_ROLES },  // ✅ Check ALL elevated roles
```

### **Step 3: (Optional) Enhance error messages**

Replace error message at lines 733 and 865 with more descriptive one (see above).

---

## 🧹 **CLEANUP EXISTING DATA:**

After fixing the code, you need to clean up existing violations:

### **Script to Find Violations:**

```javascript
// findViolations.js
const mongoose = require('mongoose');
require('dotenv').config();

async function findViolations() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Membership = mongoose.model('Membership', new mongoose.Schema({}, { strict: false }));
  const Club = mongoose.model('Club', new mongoose.Schema({}, { strict: false }));
  
  const ELEVATED_ROLES = ['core', 'secretary', 'treasurer', 'leadPR', 'leadTech', 'president', 'vicePresident'];
  
  // Find all approved members with elevated roles
  const elevatedMembers = await Membership.find({
    role: { $in: ELEVATED_ROLES },
    status: 'approved'
  }).populate('user club');
  
  // Group by user
  const userRoles = {};
  elevatedMembers.forEach(m => {
    const userId = m.user._id.toString();
    if (!userRoles[userId]) {
      userRoles[userId] = {
        user: m.user,
        roles: []
      };
    }
    userRoles[userId].roles.push({
      club: m.club,
      role: m.role,
      membershipId: m._id
    });
  });
  
  // Find violations (users with elevated roles in multiple clubs)
  console.log('🔍 Checking for violations...\n');
  
  Object.values(userRoles).forEach(data => {
    if (data.roles.length > 1) {
      console.log(`❌ VIOLATION FOUND:`);
      console.log(`User: ${data.user.profile.name} (${data.user.rollNumber})`);
      data.roles.forEach(r => {
        console.log(`  - ${r.club.name}: ${r.role}`);
      });
      console.log('');
    }
  });
  
  await mongoose.disconnect();
}

findViolations();
```

### **Fix Strategy:**

For each violation found:
1. **Identify primary club** (where they should have elevated role)
2. **Downgrade to "member"** in other clubs
3. **Or remove** from other clubs if they haven't participated

---

## 🧪 **TESTING:**

After fix, test these scenarios:

### **Test 1: Can't add as core if president elsewhere**

```bash
1. Student is President in Club A
2. Try to add as Secretary in Club B
3. Should fail with: "...already President in Club A..."
```

### **Test 2: Can't promote to core if president elsewhere**

```bash
1. Student is President in Club A
2. Student is regular member in Club B
3. Try to change role to Core in Club B
4. Should fail with: "...already President in Club A..."
```

### **Test 3: Can add as regular member**

```bash
1. Student is President in Club A
2. Try to add as member in Club B
3. Should succeed ✅
```

### **Test 4: Can't have multiple core roles**

```bash
1. Student is Secretary in Club A
2. Try to add as Treasurer in Club B
3. Should fail with: "...already Secretary in Club A..."
```

---

## 📊 **IMPACT:**

### **Before Fix:**
- ❌ President + Secretary (different clubs) = Allowed
- ❌ Vice President + Core (different clubs) = Allowed
- ❌ Secretary + Treasurer (different clubs) = Allowed
- ✅ President + President (different clubs) = Blocked
- ✅ President + Vice President (different clubs) = Blocked

### **After Fix:**
- ✅ President + Secretary (different clubs) = Blocked
- ✅ Vice President + Core (different clubs) = Blocked
- ✅ Secretary + Treasurer (different clubs) = Blocked
- ✅ President + President (different clubs) = Blocked
- ✅ President + Vice President (different clubs) = Blocked
- ✅ ANY elevated role + ANY elevated role (different clubs) = Blocked
- ✅ President + Member (different clubs) = Allowed

---

## 📝 **SUMMARY:**

**Bug:** Students could have multiple leadership/core roles across clubs  
**Cause:** Validation only checked president/VP, not all elevated roles  
**Fix:** Change `LEADERSHIP_ROLES` to `ELEVATED_ROLES` in 2 places  
**Lines:** 728 and 860 in `club.service.js`  
**Impact:** Prevents role conflicts, enforces "one leadership position" rule  

---

## ⚠️ **IMPORTANT NOTES:**

1. This bug allowed existing violations in the database
2. After code fix, run cleanup script to find and fix existing data
3. The fix prevents NEW violations but doesn't auto-fix OLD ones
4. Manual review of existing memberships recommended
5. Consider notifying affected students about role changes

---

**Ready to apply fix manually!** 🔧
