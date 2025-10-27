# 🧪 RECRUITMENT SYSTEM - COMPLETE TESTING GUIDE

**Date:** Oct 27, 2025  
**Purpose:** Step-by-step testing of the entire recruitment lifecycle

---

## 📊 WHY STATUS IS "DRAFT"?

### **Status Lifecycle:**

```
draft (NEW) → scheduled → open → closing_soon → closed → selection_done
  ↑                                                           |
  └────────────────────────────────────────────────────────────┘
```

### **Why "Draft" is the Default:**

**From `recruitment.model.js` Line 41-51:**
```javascript
status: {
  type: String,
  enum: [
    'draft',        // ✅ DEFAULT - Newly created
    'scheduled',    // Ready to open on startDate
    'open',         // Accepting applications
    'closing_soon', // 24 hours before endDate
    'closed',       // No longer accepting
    'selection_done' // Final selections made
  ],
  default: 'draft'  // ⬅️ THIS IS WHY!
}
```

**Purpose of Draft Status:**
1. ✅ **Review Period** - Club core can review details before publishing
2. ✅ **Edit Safety** - Can modify details without affecting applicants
3. ✅ **Quality Control** - Ensures no half-finished recruitments go live
4. ✅ **Deliberate Action** - Core members must explicitly schedule/open it

**Think of it like:**
- **Draft** = Document in "Save as Draft" mode 📝
- **Scheduled** = Document scheduled to publish later ⏰
- **Open** = Document is now live and public ✅

---

## 🔄 COMPLETE RECRUITMENT LIFECYCLE

### **Phase 1: Creation (Draft)**
```
Status: draft
Who: Core team member
Action: Create recruitment form
Result: Recruitment saved but not visible to students
```

### **Phase 2: Scheduling**
```
Status: draft → scheduled
Who: Core team member
Action: Click "Schedule Recruitment"
Result: 
  - Status changes to "scheduled"
  - Will auto-open on startDate
  - Core team gets notification
```

### **Phase 3: Opening**
```
Status: scheduled → open
Who: System (automatic) OR Core team (manual)
Action: 
  - Automatic: Opens when startDate arrives
  - Manual: Click "Open Now"
Result:
  - Status changes to "open"
  - Visible to all students
  - All students get notification
  - Applications can be submitted
```

### **Phase 4: Closing Soon**
```
Status: open → closing_soon
Who: System (automatic)
When: 24 hours before endDate
Result:
  - Status changes to "closing_soon"
  - All users get "Last chance!" notification
  - Still accepting applications
```

### **Phase 5: Closing**
```
Status: closing_soon → closed
Who: System (automatic) OR Core team (manual)
When: endDate arrives OR manual close
Result:
  - Status changes to "closed"
  - No longer accepting applications
  - Applicants get notification
  - Core team can review applications
```

### **Phase 6: Selection**
```
Status: closed → selection_done
Who: Core team
Action: Complete application reviews
Result:
  - All applications reviewed
  - Selected candidates notified
  - Rejected candidates notified
  - Process complete
```

---

## 🧪 TESTING FLOW - STEP BY STEP

### **SETUP: Prerequisites**

1. **Ensure services running:**
   ```bash
   # Terminal 1: Backend
   cd Backend
   npm start
   
   # Terminal 2: Frontend
   cd Frontend
   npm start
   
   # Terminal 3: MongoDB (if not running as service)
   mongod
   
   # Terminal 4: Redis (if not running as service)
   redis-server
   ```

2. **Login as club core member:**
   - Email: Your core member email
   - Password: Your password

3. **Navigate to your club dashboard:**
   ```
   http://localhost:3000/clubs/{your-club-id}
   ```

---

### **TEST 1: Create Recruitment (Draft Status)** ⏱️ 2 minutes

#### **Steps:**
1. On club dashboard, click **"Start Recruitment"** button
2. **Verify:** URL is `/recruitments/create?clubId=...`
3. **Verify:** Club name shown (not dropdown) - e.g., "🏢 Organising Committee"
4. Fill form:
   ```
   Title: "Test Recruitment 2025"
   Description: "Testing the complete recruitment flow"
   Start Date: Tomorrow's date (e.g., 2025-10-28)
   End Date: 3 days later (e.g., 2025-10-31)
   Eligibility: "Open to all students"
   Custom Question 1: "Why do you want to join?"
   Custom Question 2: "What skills can you bring?"
   ```
5. Click **"Create Recruitment"**

#### **Expected Results:**
- ✅ Success alert: "Recruitment created successfully!"
- ✅ Redirects to `/recruitments/{id}` detail page
- ✅ **Status badge shows: "Draft"** 
- ✅ Club name displays correctly
- ✅ All fields populated

#### **Why Draft?**
> 💡 **Draft allows you to review and edit before making it live to students!**

#### **What to Check:**
```
✓ Title: "Test Recruitment 2025"
✓ Club: "Organising Committee" (not "Unknown Club")
✓ Description visible
✓ Dates correct
✓ Eligibility shown
✓ Status: Draft (red/gray badge)
✓ No "Apply" button visible (because status is draft)
```

---

### **TEST 2: Schedule Recruitment** ⏱️ 1 minute

#### **Steps:**
1. On recruitment detail page (still in Draft status)
2. Look for **"Manage Recruitment"** or **"Actions"** section
3. Click **"Schedule Recruitment"** button

#### **Expected Results:**
- ✅ Status changes from **"Draft"** → **"Scheduled"**
- ✅ Status badge updates to "Scheduled" (yellow/orange)
- ✅ Core team members get notification
- ✅ Recruitment will auto-open on start date

#### **Backend Action:**
```javascript
POST /api/recruitments/{id}/status
Body: { "action": "schedule" }
Result: status changes from 'draft' to 'scheduled'
```

#### **What to Check:**
```
✓ Status badge: "Scheduled"
✓ Check notifications (bell icon) - should have new notification
✓ Still no "Apply" button (not open yet)
```

---

### **TEST 3: Open Recruitment (Manual)** ⏱️ 1 minute

#### **Steps:**
1. On recruitment detail page (status: Scheduled)
2. Click **"Open Now"** or **"Open Recruitment"** button
   - *OR wait until startDate arrives for automatic opening*

#### **Expected Results:**
- ✅ Status changes from **"Scheduled"** → **"Open"**
- ✅ Status badge updates to "Open" (green)
- ✅ **All students get notification** (recruitment open)
- ✅ **"Apply" button now visible** to students
- ✅ Recruitment appears in public recruitments list

#### **Backend Action:**
```javascript
POST /api/recruitments/{id}/status
Body: { "action": "open" }
Result: 
  - status changes from 'scheduled' to 'open'
  - Notifications sent to ALL users with profile_complete status
```

#### **What to Check:**
```
✓ Status badge: "Open" (green)
✓ "Apply" button visible
✓ Public visibility: Go to /recruitments page - should see it listed
✓ Check notifications for all users
```

---

### **TEST 4: Apply as Student** ⏱️ 2 minutes

#### **Steps:**
1. **Logout** from core member account
2. **Login as regular student** (or open incognito window)
3. Go to **Recruitments** page: `/recruitments`
4. **Verify:** See "Test Recruitment 2025" listed
5. Click on the recruitment
6. Click **"Apply Now"** button
7. Fill application form:
   ```
   Answer 1: "I'm passionate about the club activities"
   Answer 2: "I have leadership and communication skills"
   ```
8. Click **"Submit Application"**

#### **Expected Results:**
- ✅ Success: "Application submitted successfully!"
- ✅ Student sees application status: "Pending Review"
- ✅ Core team can now see 1 application in recruitment dashboard
- ✅ Student cannot apply again (button disabled/hidden)

#### **What to Check:**
```
✓ Application submitted successfully
✓ Student can view their application: /recruitments/{id}/my-application
✓ Core member sees 1 application in dashboard
✓ Student gets confirmation notification
```

---

### **TEST 5: Review Applications (Core Team)** ⏱️ 3 minutes

#### **Steps:**
1. **Login as core member** again
2. Go to club dashboard
3. Click on **"Test Recruitment 2025"**
4. Click **"View Applications"** or **"Review Applications"** button
5. **Verify:** See list of applications (at least 1 from test)
6. Click on an application to review
7. Read answers to custom questions
8. Select status:
   - **Selected** ✅
   - **Rejected** ❌
   - **Waitlisted** ⏳
9. Optionally add score (0-100)
10. Click **"Submit Review"**

#### **Expected Results:**
- ✅ Application status updated
- ✅ Student gets notification about decision
- ✅ Application appears in filtered view (Selected/Rejected/Waitlisted tabs)

#### **What to Check:**
```
✓ Can see all applications
✓ Can read applicant details
✓ Can read answers to custom questions
✓ Can change application status
✓ Can add review score
✓ Applicant gets notification
```

---

### **TEST 6: Close Recruitment** ⏱️ 1 minute

#### **Steps:**
1. On recruitment detail page (status: Open)
2. Click **"Close Recruitment"** button
   - *OR wait until endDate arrives for automatic closing*

#### **Expected Results:**
- ✅ Status changes from **"Open"** → **"Closed"**
- ✅ Status badge updates to "Closed" (red/gray)
- ✅ **"Apply" button disappears** for students
- ✅ No more applications accepted
- ✅ All applicants get notification

#### **Backend Action:**
```javascript
POST /api/recruitments/{id}/status
Body: { "action": "close" }
Result: status changes to 'closed'
```

#### **What to Check:**
```
✓ Status badge: "Closed"
✓ No "Apply" button for students
✓ Applications still viewable by core team
✓ Cannot submit new applications
```

---

### **TEST 7: Bulk Review** ⏱️ 2 minutes

#### **Steps:**
1. On applications list page
2. **Select multiple applications** (checkboxes)
3. Choose bulk action:
   - **Accept All** (changes all to Selected)
   - **Reject All** (changes all to Rejected)
   - **Waitlist All** (changes all to Waitlisted)
4. Click **"Apply to Selected"** or **"Bulk Update"**

#### **Expected Results:**
- ✅ All selected applications updated
- ✅ All affected students get notifications
- ✅ Status counts updated

#### **Backend Action:**
```javascript
PATCH /api/recruitments/{id}/applications
Body: {
  "applicationIds": ["id1", "id2", "id3"],
  "status": "selected"
}
```

---

### **TEST 8: Mark Selection Done** ⏱️ 1 minute

#### **Steps:**
1. After reviewing all applications
2. Click **"Mark Selection Done"** or **"Complete Recruitment"**

#### **Expected Results:**
- ✅ Status changes to **"Selection Done"**
- ✅ Recruitment cycle complete
- ✅ Selected students can now be added to club members

---

## 🎯 COMPLETE TEST CHECKLIST

### **Core Team Tests:**
- [ ] Create recruitment (Draft status)
- [ ] Verify club name shows correctly
- [ ] Schedule recruitment (Draft → Scheduled)
- [ ] Open recruitment (Scheduled → Open)
- [ ] View applications list
- [ ] Review individual application
- [ ] Accept/Reject application
- [ ] Bulk review applications
- [ ] Close recruitment (Open → Closed)
- [ ] Mark selection done
- [ ] Edit draft recruitment
- [ ] Delete draft recruitment

### **Student Tests:**
- [ ] View open recruitments list
- [ ] View recruitment details
- [ ] Apply to recruitment (submit answers)
- [ ] View "My Application" status
- [ ] Receive notifications (open, selected, rejected)
- [ ] Cannot apply twice to same recruitment
- [ ] Cannot apply to closed recruitment
- [ ] Cannot apply to draft/scheduled recruitment

### **System Tests:**
- [ ] Automatic opening on startDate
- [ ] Automatic "closing soon" 24h before endDate
- [ ] Automatic closing on endDate
- [ ] Notifications sent correctly
- [ ] Email notifications sent (if configured)
- [ ] Duration validation (max 14 days)

---

## 🔍 DEBUGGING TIPS

### **If recruitment stays in Draft:**
```javascript
// Check backend logs
POST /api/recruitments/{id}/status
Body: { "action": "schedule" }

// Expected response:
{ status: 'success', recruitment: { status: 'scheduled', ... } }

// If error:
// - Check user has core/president role
// - Check recruitment exists
// - Check status is 'draft' (can't schedule if already scheduled)
```

### **If "Apply" button not showing:**
Check:
1. ✅ Status is "open" (not draft/scheduled/closed)
2. ✅ User is logged in
3. ✅ User hasn't already applied
4. ✅ User is not a core member of the club

### **If applications not appearing:**
Check:
1. ✅ Backend logs show POST /api/recruitments/{id}/apply
2. ✅ Response is 201 Created
3. ✅ Check MongoDB: `db.applications.find({ recruitment: ObjectId("...") })`

---

## 📊 STATUS FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    RECRUITMENT LIFECYCLE                     │
└─────────────────────────────────────────────────────────────┘

CREATE
  ↓
┌─────────┐
│  DRAFT  │ ← Default status when created
└────┬────┘   - Not visible to students
     │        - Can edit freely
     │        - Can delete
     ↓
  [Schedule] ← Core team action
     ↓
┌──────────┐
│SCHEDULED │ ← Waiting for startDate
└────┬─────┘   - Visible to students but can't apply
     │          - Auto-opens on startDate
     │          - Core team can "Open Now"
     ↓
   [Open] ← Manual OR Automatic
     ↓
┌─────────┐
│  OPEN   │ ← Accepting applications
└────┬────┘   - Students can apply
     │         - "Apply" button visible
     │         - Public in recruitments list
     │
     ├─────→ [24h before endDate] ← Automatic
     │         ↓
     │    ┌──────────────┐
     │    │CLOSING SOON  │ ← Last chance warning
     │    └──────┬───────┘   - Still accepting
     │           │            - Urgent notifications sent
     │           ↓
     └─────→ [Close] ← Manual OR Automatic (endDate)
               ↓
         ┌─────────┐
         │ CLOSED  │ ← No more applications
         └────┬────┘   - Review phase
              │        - Can't apply anymore
              ↓
      [Mark Complete]
              ↓
      ┌──────────────┐
      │SELECTION DONE│ ← Process complete
      └──────────────┘   - All reviewed
                          - Members can be added to club
```

---

## 🎓 UNDERSTANDING DRAFT STATUS

### **Why Draft Exists:**

**Scenario 1: Incomplete Information**
```
Core member starts creating recruitment but:
- Needs to discuss eligibility criteria with team
- Waiting for dates to be confirmed
- Questions not finalized yet

Solution: Save as Draft → Discuss → Schedule later
```

**Scenario 2: Mistake Prevention**
```
Without Draft:
  Create → Immediately Open → ALL STUDENTS NOTIFIED
  Realize mistake → Too late, everyone got notification

With Draft:
  Create → Review → Find mistake → Edit → Schedule
```

**Scenario 3: Team Approval**
```
Junior core member creates recruitment
President reviews in Draft status
If approved → Schedule
If changes needed → Edit in draft
```

### **When to move from Draft to Scheduled:**

✅ **Ready when:**
- All details finalized
- Dates confirmed
- Questions reviewed
- Team approved
- Ready for public visibility

❌ **Not ready if:**
- Details might change
- Waiting for approval
- Dates uncertain
- Testing the form

---

## 📞 QUICK TEST COMMANDS

### **Check Recruitment Status:**
```bash
# MongoDB
mongo
use kmit_clubs
db.recruitments.find({ _id: ObjectId("YOUR_ID") }).pretty()

# Check status field:
# Should see: status: 'draft' or 'scheduled' or 'open', etc.
```

### **Manually Change Status (for testing):**
```bash
# MongoDB - ONLY FOR TESTING
db.recruitments.updateOne(
  { _id: ObjectId("YOUR_ID") },
  { $set: { status: 'open' } }
)
```

### **Check Applications:**
```bash
db.applications.find({ recruitment: ObjectId("YOUR_RECRUITMENT_ID") })
```

---

## ✅ SUMMARY

**Why status is "Draft":**
- ✅ Default status for newly created recruitments
- ✅ Allows review before going public
- ✅ Prevents accidental publishing
- ✅ Enables editing without affecting students

**How to test complete flow:**
1. Create (Draft) → 2 min
2. Schedule (Scheduled) → 1 min
3. Open (Open) → 1 min
4. Apply as student → 2 min
5. Review applications → 3 min
6. Close (Closed) → 1 min
7. Mark done (Selection Done) → 1 min

**Total testing time:** ~15 minutes for complete lifecycle

---

**Ready to test? Start with TEST 1!** 🚀
