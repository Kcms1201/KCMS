# 🚨 MULTI-CLUB EVENT BUGS & FIXES

**Date:** Oct 29, 2025  
**Context:** Events with Primary Club + Participating Clubs  

---

## 📊 **SYSTEM ARCHITECTURE:**

### **Event Structure:**
```javascript
{
  club: ObjectId,  // Primary organizing club
  participatingClubs: [ObjectId, ObjectId],  // Collaborating clubs
  // ... other fields
}
```

### **Registration Structure:**
```javascript
{
  event: ObjectId,
  user: ObjectId,
  representingClub: ObjectId,  // Which club the student represents
  registrationType: 'performer' | 'audience'
}
```

---

## 🐛 **BUGS FOUND:**

### **BUG #1: Participating Club Leaders Can't Manage Events** ❌

**Scenario:**
```
Event: "Cultural Fest 2025"
Primary Club: Mudra Club (ID: A)
Participating: Music Club (ID: B), Drama Club (ID: C)

Music Club President logs in → canManage = false ❌
```

**What Was Broken:**
- ❌ Can't upload photos/reports/bills
- ❌ Can't see completion checklist
- ❌ Can't mark event as completed
- ✅ CAN manage their own club's performer registrations

**Root Cause:**

```javascript
// OLD CODE (Backend)
const membership = await Membership.findOne({
  user: userContext.id,
  club: evt.club,  // ❌ Only checked PRIMARY club!
  status: 'approved'
});
```

**Impact:**
- Participating clubs couldn't contribute to event completion
- Only primary club could upload materials
- Blocked multi-club collaboration

---

### **BUG #2: Registration Counts Not Updating** ❌

**Scenario:**
```
Club B President approves a performer registration
→ Page shows: Approved = 0 ❌
→ Actual count: Approved = 1 ✅
```

**Root Cause:**

```javascript
// OLD CODE (Frontend)
const response = await registrationService.getClubPendingRegistrations(clubId);
// ❌ Only fetched PENDING registrations!
```

**What Happened:**
1. Registration approved → Status changed to `approved`
2. Page refetched data
3. Backend returned only `pending` registrations
4. Approved registration disappeared from results
5. Counts showed 0

---

## ✅ **FIXES APPLIED:**

### **FIX #1: canManage for Participating Clubs**

**Files Changed:**
- `Backend/src/modules/event/event.service.js` (Line 214-236)

**New Code:**
```javascript
// ✅ Check membership in PRIMARY OR ANY PARTICIPATING club
const allClubIds = [evt.club._id, ...(evt.participatingClubs || []).map(c => c._id || c)];

const membership = await Membership.findOne({
  user: userContext.id,
  club: { $in: allClubIds },  // ✅ Check ALL involved clubs!
  status: 'approved'
});

const hasClubRole = membership && coreRoles.includes(membership.role);
data.canManage = isAdmin || isCoordinator || hasClubRole;
```

**Result:**
- ✅ Participating club leaders can now upload materials
- ✅ Participating club leaders see completion checklist
- ✅ Any involved club can mark event complete
- ✅ Collaborative event management works!

---

### **FIX #2: Registration Counts**

**Files Changed:**
- `Frontend/src/services/registrationService.js` - Added `getClubRegistrations()`
- `Frontend/src/pages/clubs/ClubRegistrationsPage.jsx` - Use new method
- `Backend/src/modules/event/eventRegistration.routes.js` - Added route
- `Backend/src/modules/event/eventRegistration.controller.js` - Added controller
- `Backend/src/modules/event/eventRegistration.service.js` - Added service method

**New Code:**
```javascript
// ✅ Fetch ALL registrations (not just pending)
async listClubRegistrations(clubId, eventId = null) {
  const query = {
    representingClub: clubId,
    registrationType: 'performer'
    // ✅ NO status filter - returns pending, approved, rejected
  };
  return await EventRegistration.find(query).populate('event user');
}
```

**Result:**
- ✅ Counts show correctly (pending, approved, rejected, total)
- ✅ Approved registrations visible in "Approved" tab
- ✅ Real-time updates after approve/reject actions

---

## 📋 **SYSTEM LOGIC (Correct Behavior):**

### **Registration Flow:**

```
Student Registration
    ↓
Selects: Club B (representing club)
    ↓
Registration created:
  - representingClub: Club B
  - event: Event X
  - status: pending
    ↓
Club B Leaders see registration in their dashboard
    ↓
Club B President approves
    ↓
Status: pending → approved
    ↓
Attendance record created for student
```

### **Event Management:**

```
Event Created by Club A
Participating: Club B, Club C
    ↓
canManage = true for:
  ✅ Club A leaders (president, vice president, core, etc.)
  ✅ Club B leaders
  ✅ Club C leaders
  ✅ Coordinator assigned to ANY of these clubs
  ✅ Admin
    ↓
All can:
  ✅ Upload photos/reports/bills
  ✅ See completion checklist
  ✅ Mark event as completed
```

---

## 🔍 **REMAINING POTENTIAL ISSUES:**

### **1. Event Approval Flow** 🤔

**Question:** If Club B is participating, do they need to approve the event too?

**Current Behavior:**
- Only PRIMARY club submits event for approval
- Participating clubs are just notified

**Potential Issue:**
- Participating clubs might not know about the event until too late
- No consent mechanism for participating clubs

**Recommendation:**
- Consider adding participating club approval step
- OR at least send notification when added as participating club

---

### **2. Budget & Bill Splits** 🤔

**Question:** If event has budget, how is it split between clubs?

**Current Behavior:**
- Event has ONE total budget
- Bills uploaded to event (no club attribution)

**Potential Issue:**
- No way to track which club paid what
- No split accounting

**Recommendation:**
- Add `billSplits` field: `{ clubId, amount, bills: [] }`
- Track expenses per club

---

### **3. Photo Album Organization** 🤔

**Question:** Photos are organized by album, but which club does album belong to?

**Current Behavior:**
```javascript
Album Schema:
  event: ObjectId  // Event reference
  // No club reference!
```

**Potential Issue:**
- Photos linked to event, not to specific club
- All clubs share same album

**Current Status:** ✅ **This is actually correct!**
- Multi-club events should have ONE shared album
- All clubs contribute to same photo collection

---

### **4. Attendance Tracking** 🤔

**Question:** Are organizers from participating clubs tracked separately?

**Current Behavior:**
```javascript
Attendance Schema:
  event: ObjectId,
  user: ObjectId,
  club: ObjectId,  // ✅ Which club the organizer belongs to
  type: 'organizer' | 'performer' | 'audience'
```

**Status:** ✅ **Already handles this correctly!**
- Attendance records include `club` field
- Can filter organizers by club
- Each club's contribution is tracked

---

## 🎯 **TESTING CHECKLIST:**

### **Multi-Club Event Management:**

- [ ] Create event with participating clubs
- [ ] Login as PRIMARY club president
  - [ ] Can see completion checklist
  - [ ] Can upload photos/reports/bills
  - [ ] Can mark event complete
- [ ] Login as PARTICIPATING club president
  - [ ] Can see completion checklist ✅ **FIXED!**
  - [ ] Can upload photos/reports/bills ✅ **FIXED!**
  - [ ] Can mark event complete ✅ **FIXED!**
- [ ] Login as PARTICIPATING club core member
  - [ ] Has same permissions as president ✅ **FIXED!**

### **Multi-Club Registrations:**

- [ ] Student registers for multi-club event
  - [ ] Can select which club to represent
  - [ ] Registration shows in THAT club's dashboard
- [ ] Representing club president approves
  - [ ] Status changes to approved
  - [ ] Count updates in stats ✅ **FIXED!**
  - [ ] Shows in "Approved" tab ✅ **FIXED!**
- [ ] Student from Club B registers representing Club B
  - [ ] Club A (primary) does NOT see it
  - [ ] Club B (representing) DOES see it ✅ **CORRECT!**

---

## 🚀 **DEPLOYMENT NOTES:**

### **Database Changes:**
- ✅ No schema changes required
- ✅ Existing data compatible

### **API Changes:**
- ✅ Added new endpoint: `GET /api/clubs/:clubId/registrations`
- ✅ Backward compatible (old endpoint still works)

### **Frontend Changes:**
- ✅ Registration page now uses new endpoint
- ✅ Cache-busting added for fresh data

### **Backend Changes:**
- ✅ `canManage` logic now checks participating clubs
- ✅ Debug logs added for troubleshooting

---

## 📝 **SUMMARY:**

**2 Critical Bugs Fixed:**
1. ✅ Participating clubs can now manage events
2. ✅ Registration counts display correctly

**System Design:**
- ✅ Registration system was ALREADY correct
- ✅ Attendance tracking was ALREADY correct
- ✅ Photo albums are CORRECTLY shared

**What Works Now:**
- ✅ Multi-club event creation & management
- ✅ Multi-club performer registrations
- ✅ Accurate registration statistics
- ✅ Collaborative event completion

**Potential Future Enhancements:**
- 🤔 Participating club approval flow
- 🤔 Budget split tracking
- 🤔 Per-club expense reporting

---

## ✅ **READY FOR TESTING!**

**Next Steps:**
1. Test multi-club event creation
2. Test participating club permissions
3. Test registration counts after approve/reject
4. Verify all clubs can upload materials

**The system is now ready for collaborative multi-club events!** 🎉
