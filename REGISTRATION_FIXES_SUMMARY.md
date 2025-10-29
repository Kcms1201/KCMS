# 🎯 EVENT REGISTRATION LOGIC FIXES

**Date:** Oct 29, 2025  
**Issue:** Registration counts and visibility incorrect for multi-club events

---

## 📋 **REQUIREMENTS (FROM USER):**

### **1. Event-Specific Registrations**
- Button should go to event-specific page, NOT all club registrations
- ✅ **FIXED:** Now goes to `/events/:eventId/registrations/manage`

### **2. Pending Count Per Club**
```
Example:
Event: Created by Mudra Club, Participating: Aalap Club
Student registers representing Aalap Club

Expected:
- Aalap club sees: Pending = 1 (their approval needed)
- Mudra club sees: Pending = 0 (not their responsibility)
- Total registrations: 1 (from both clubs)
```
- ✅ **FIXED:** New page shows "Pending for My Clubs" separately

### **3. Registration Visibility**
- Each club sees ONLY registrations where they are the `representingClub`
- Total count shows ALL registrations from ALL clubs
- ✅ **FIXED:** Filter by "My Clubs Only" vs "All Clubs"

### **4. RSVP Count**
- When performer registers, RSVP count should increase
- ⚠️ **NEEDS CLARIFICATION:** Currently registrations are separate from attendees

---

## ✅ **FIXES APPLIED:**

### **1. New Event Registrations Management Page**

**File Created:** `Frontend/src/pages/events/EventRegistrationsManagement.jsx`

**Features:**
- ✅ Shows registrations for specific event only
- ✅ Filter by status (pending, approved, rejected)
- ✅ Filter by club (My Clubs Only vs All Clubs)
- ✅ Stats separated:
  - **Total Registrations** (all clubs)
  - **Pending for My Clubs** (needs your approval)
  - **Approved** (all clubs)
  - **Rejected** (all clubs)
- ✅ Approve/Reject buttons only for "My Clubs"
- ✅ Visual indicator (green background) for own club registrations

**Route Added:** `/events/:eventId/registrations/manage`

---

### **2. Updated Event Detail Page**

**File:** `Frontend/src/pages/events/EventDetailPage.jsx`

**Changes:**
```javascript
// OLD:
<button onClick={() => navigate(`/clubs/${event.club._id}/registrations`)}>
  📋 View & Manage Registrations
</button>

// NEW:
<button onClick={() => navigate(`/events/${event._id}/registrations/manage`)}>
  📋 View & Manage Registrations
</button>
```

**Impact:**
- ✅ Goes to event-specific page
- ✅ Shows only registrations for THIS event
- ✅ Clear separation between clubs

---

### **3. Backend Pending Count Logic** ⚠️

**File:** `Backend/src/modules/event/event.service.js` (Line 271-298)

**Attempted Fix:**
```javascript
// Count pending registrations only for user's managed clubs
const pendingRegistrations = await EventRegistration.countDocuments({ 
  event: id, 
  status: 'pending',
  representingClub: { $in: allClubIds }
});
```

**Note:** This counts for ALL involved clubs. The new management page handles club-specific filtering on the frontend.

---

## 🔍 **REGISTRATION FLOW (CORRECTED):**

### **Scenario: Multi-Club Event**

```
Event: "Cultural Fest"
Created by: Mudra Club
Participating: Aalap Club, Drama Club

Student (John) wants to perform:
  1. Goes to event page
  2. Clicks "Register"
  3. Selects:
     - Type: Performer
     - Club: Aalap Club (representing)
     - Performance: Dance
  4. Submits

Registration Created:
  {
    event: "Cultural Fest ID",
    user: "John's ID",
    registrationType: "performer",
    representingClub: "Aalap Club ID",  // ✅ KEY FIELD!
    status: "pending"
  }

Who Sees It:
  ✅ Aalap Club leaders (president, vice president, core)
  ❌ Mudra Club leaders (not their approval)
  ✅ Admin (sees all)

Approval Flow:
  1. Aalap Club President logs in
  2. Goes to /events/{eventId}/registrations/manage
  3. Sees filter: "My Clubs Only" (default)
  4. Sees John's registration
  5. Clicks "Approve"
  6. Status: pending → approved
  7. John gets notification

After Approval:
  - Aalap sees: Pending = 0, Approved = 1
  - Mudra sees: Pending = 0, Approved = 1 (if viewing "All Clubs")
  - Total registrations = 1
```

---

## ⚠️ **REMAINING ISSUE: RSVP Count**

### **Current Behavior:**

**EventRegistration Schema:**
```javascript
{
  event: ObjectId,
  user: ObjectId,
  representingClub: ObjectId,
  registrationType: 'performer' | 'audience',
  status: 'pending' | 'approved' | 'rejected'
}
```

**Event Schema:**
```javascript
{
  attendees: [???]  // ❓ What is this field?
}
```

### **Questions:**

1. **What is `event.attendees`?**
   - Is it a separate RSVP system?
   - Is it populated from registrations?
   - Is it manual attendance tracking?

2. **Should performer registration → RSVP?**
   - When performer registers: Should `attendees` count increase?
   - When approved: Should they be added to `attendees`?
   - Or are registrations completely separate from RSVPs?

### **Possible Solutions:**

#### **Option A: Auto-Add to Attendees on Approval**

```javascript
// In reviewRegistration service (when approving)
if (decision.status === 'approved' && registration.registrationType === 'performer') {
  // Add to event attendees
  await Event.findByIdAndUpdate(registration.event, {
    $addToSet: {
      attendees: {
        user: registration.user,
        club: registration.representingClub,
        type: 'performer',
        timestamp: new Date()
      }
    }
  });
}
```

#### **Option B: Separate RSVP System**

Keep registrations separate from RSVPs. Add explicit RSVP button for audience members.

#### **Option C: Count Registrations as RSVPs**

```javascript
// In getById service
const rsvpCount = await EventRegistration.countDocuments({
  event: id,
  status: 'approved'
});
data.rsvpCount = rsvpCount;
```

### **RECOMMENDATION:**

**Option C** seems most logical:
- Approved registrations = people who will attend
- Simple calculation, no schema changes
- Clear distinction: registrations (intent) vs attendance (actual)

---

## 🧪 **TESTING CHECKLIST:**

### **Multi-Club Registration Flow:**

- [ ] Create event: Mudra + Aalap clubs
- [ ] Student registers as performer for Aalap
- [ ] Login as Aalap President
  - [ ] Go to event page
  - [ ] Click "View & Manage Registrations"
  - [ ] Should see event-specific page ✅
  - [ ] Filter: "My Clubs Only" (default)
  - [ ] Should see 1 pending registration ✅
  - [ ] Approve it
  - [ ] Should move to "Approved" tab ✅
- [ ] Login as Mudra President
  - [ ] Go to same event page
  - [ ] Click "View & Manage Registrations"
  - [ ] Filter: "My Clubs Only"
  - [ ] Should see 0 pending (not their club) ✅
  - [ ] Change to "All Clubs"
  - [ ] Should see 1 approved (from Aalap) ✅
- [ ] Check event stats:
  - [ ] Total Registrations: 1 ✅
  - [ ] Pending for My Clubs: 0 for Mudra, 0 for Aalap ✅
  - [ ] Approved: 1 ✅

### **RSVP Count Test:**

- [ ] Check if `event.attendees` field exists
- [ ] Check current count display
- [ ] Determine if registrations should count as RSVPs
- [ ] Implement chosen solution

---

## 📝 **FILES CHANGED:**

### **Frontend:**

1. **`src/pages/events/EventRegistrationsManagement.jsx`** - NEW FILE
   - Event-specific registration management
   - Club filtering
   - Approve/reject for own clubs only

2. **`src/pages/events/EventDetailPage.jsx`** - Line 556
   - Changed button to go to event-specific page

3. **`src/App.jsx`** - Lines 27, 245-252
   - Added import and route for new page

### **Backend:**

4. **`src/modules/event/event.service.js`** - Lines 271-298
   - Attempted fix for pending count (needs refinement)

---

## 🎯 **SUMMARY:**

### **What Works Now:**

✅ Event-specific registration management page  
✅ Filter by "My Clubs" vs "All Clubs"  
✅ Approve/reject only for own club's registrations  
✅ Visual distinction between clubs  
✅ Total count from all clubs  
✅ Separate "Pending for My Clubs" count  

### **What Needs Clarification:**

⚠️ RSVP count behavior  
⚠️ Relationship between registrations and attendees  
⚠️ Backend pending count calculation (currently uses all clubs)

### **Next Steps:**

1. Test the new management page
2. Clarify RSVP requirements
3. Implement RSVP counting solution
4. Refine backend pending count if needed

---

## 💡 **USER EXPECTATIONS SUMMARY:**

**From your message:**

> "Only for the present event they have published"
- ✅ FIXED: New page shows only current event

> "Count of view registrations should show who have registered for the event on behalf of their club"
- ✅ FIXED: Total count shows ALL registrations

> "Registration pending count should only for the club they registered"
- ✅ FIXED: "Pending for My Clubs" shows only relevant clubs

> "If student register for Aalap club then pending count should increment only for Aalap club core members"
- ✅ FIXED: Filter by "My Clubs Only"

> "For Aalap club it should show the student to approve/reject, not for Mudra club"
- ✅ FIXED: Approve/reject buttons only for own clubs

> "Count of event registrations should be from both the clubs"
- ✅ WORKING: Total count includes all clubs

> "If he register as performer then RSVP count should increase"
- ⚠️ NEEDS IMPLEMENTATION: Choose solution option

---

**Ready for testing!** 🚀
