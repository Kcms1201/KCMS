# 🧪 TESTING GUIDE - Option A Features

**Date:** Oct 28, 2025, 7:34 AM  
**What We Built:**
1. ✅ Deleted meeting system
2. ✅ Added registration counts to backend
3. ✅ Added registration view link

---

## 🚀 **PRE-TEST: RESTART BACKEND**

### **Step 1: Stop Backend**
```bash
# In Backend terminal:
Ctrl+C
```

### **Step 2: Start Backend**
```bash
# In Backend directory:
npm start
```

### **Step 3: Watch Console**
**✅ Success Looks Like:**
```
Server running on port 5000
MongoDB connected
✓ No meeting-related errors
```

**❌ If You See Errors About:**
- `meeting.controller` → File still referenced somewhere
- `meeting.model` → File still referenced somewhere

**Tell me if you see ANY meeting-related errors!**

---

## 🧪 **TEST 1: VERIFY MEETING DELETION**

### **Objective:** Confirm meeting system removed without breaking anything

**Steps:**
1. ✅ Backend starts without errors
2. ✅ Check backend console - no "meeting" errors
3. ✅ Frontend loads without errors

**✅ PASS IF:** No errors mentioning "meeting"

**❌ FAIL IF:** Any meeting-related errors appear

---

## 🧪 **TEST 2: CHECK REGISTRATION COUNTS**

### **Objective:** Verify registration counts appear in event details

**Setup:**
1. Make sure you have an event that's NOT in draft status
2. If not, create one and approve it

**Steps:**

**A. View Event as Student (Non-Manager):**
1. Login as student
2. Navigate to Events page
3. Click on any published event
4. **Expected:** Should NOT see "Event Registrations" section
5. **✅ PASS:** Students don't see management features

**B. View Event as Club President (Manager):**
1. Login as club president/core member
2. Navigate to your club's event
3. Click on the event
4. **Expected:** Should see:
   ```
   📝 Event Registrations
   Manage audience and performer registrations
   
   [Total: 0]  [Pending: 0]
   
   [📋 View & Manage Registrations] button
   ```

**✅ PASS IF:**
- Section appears for managers
- Section hidden for students
- Counts show (even if 0)
- Button is visible

**❌ FAIL IF:**
- Section doesn't appear for managers
- Errors in console
- Counts show "undefined"

---

## 🧪 **TEST 3: REGISTRATION FLOW END-TO-END**

### **Objective:** Test full registration flow with counts updating

**Prerequisites:**
- 1 published event
- 1 student account
- 1 club president account

**Steps:**

### **Part A: Student Registers**
1. Login as **student**
2. Go to Events page
3. Click on a published event
4. Click "Register for Event" button
5. Select registration type (audience/performer)
6. Fill form and submit
7. **Expected:** "Registration successful!" message

### **Part B: President Views Registration**
1. Login as **club president** (of that event's club)
2. Navigate to the event detail page
3. **Expected:** See:
   ```
   Total Registrations: 1
   Pending Approval: 1
   ```
4. Click "📋 View & Manage Registrations" button
5. **Expected:** Navigate to registrations page
6. **Expected:** See the student's registration

### **Part C: President Approves**
1. On registrations page, find the student's registration
2. Click "Approve" or similar action
3. **Expected:** Status changes to "approved"
4. Go back to event detail page
5. **Expected:** See:
   ```
   Total Registrations: 1
   Pending Approval: 0
   ```

**✅ PASS IF:**
- Student can register successfully
- President sees updated counts
- Button navigates to registrations page
- Counts update after approval

**❌ FAIL IF:**
- Registration fails
- Counts don't update
- Button doesn't work
- Navigation fails

---

## 🧪 **TEST 4: ATTENDANCE TRACKING (VERIFY NOT BROKEN)**

### **Objective:** Ensure attendance system still works after our changes

**Steps:**

1. Login as **club president**
2. Navigate to event detail page
3. Look for "👥 Club Member Attendance" section
4. Click "📝 Manage Club Member Attendance" button
5. **Expected:** Navigate to organizer attendance page
6. **Expected:** See list of club members
7. Mark one member as "present"
8. **Expected:** Status saves successfully

**✅ PASS IF:**
- Attendance section appears
- Can navigate to attendance page
- Can mark attendance

**❌ FAIL IF:**
- Section missing
- Errors when clicking
- Can't mark attendance

---

## 🧪 **TEST 5: DIFFERENT USER ROLES**

### **Objective:** Verify permissions work correctly

**Test Matrix:**

| User Role | Should See Registrations? | Should See Attendance? |
|-----------|---------------------------|------------------------|
| Student | ❌ NO | ❌ NO |
| Regular Member | ❌ NO | ❌ NO |
| Core Member | ✅ YES | ✅ YES |
| Club President | ✅ YES | ✅ YES |
| Coordinator | ✅ YES | ✅ YES |
| Admin | ✅ YES | ✅ YES |

**Test Each:**
1. Login as each role
2. View event detail page
3. Check if sections appear correctly

**✅ PASS IF:** Matrix matches expectations

---

## 📊 **TESTING CHECKLIST**

### **Before Testing:**
- [ ] Backend restarted successfully
- [ ] Frontend running
- [ ] No console errors on startup

### **Test 1: Meeting Deletion**
- [ ] Backend starts without meeting errors
- [ ] No meeting references in console

### **Test 2: Registration Counts Display**
- [ ] Section appears for managers
- [ ] Section hidden for students
- [ ] Counts display correctly

### **Test 3: Full Registration Flow**
- [ ] Student can register
- [ ] Counts appear in event details
- [ ] "View Registrations" button works
- [ ] Navigation to registrations page works
- [ ] Counts update after approval

### **Test 4: Attendance Still Works**
- [ ] Attendance section appears
- [ ] Can navigate to attendance page
- [ ] Can mark attendance

### **Test 5: Permissions**
- [ ] Students don't see management sections
- [ ] Core members see sections
- [ ] Presidents see sections

---

## ❌ **IF TESTS FAIL**

### **Common Issues:**

**1. "Cannot find module 'meeting.controller'"**
- **Cause:** Some file still importing meeting controller
- **Fix:** Search codebase for "meeting.controller" and remove

**2. Registration counts show "undefined"**
- **Cause:** Backend not returning counts
- **Fix:** Check `event.service.js` lines 216-223

**3. "View Registrations" button does nothing**
- **Cause:** Navigation path wrong
- **Fix:** Check EventDetailPage.jsx line 443

**4. Attendance broken**
- **Cause:** Accidentally modified attendance code
- **Fix:** Revert attendance-related changes

---

## ✅ **EXPECTED RESULTS SUMMARY**

**After All Tests Pass:**

1. ✅ Meeting system completely removed
2. ✅ Event registrations fully accessible
3. ✅ Registration counts visible to managers
4. ✅ "View Registrations" button functional
5. ✅ Attendance tracking still works
6. ✅ Permissions correctly enforced

---

## 📝 **REPORT TEMPLATE**

**After testing, tell me:**

```
TEST 1 (Meeting Deletion): PASS / FAIL
- Details: _______

TEST 2 (Registration Counts): PASS / FAIL
- Total count showed: _______
- Pending count showed: _______

TEST 3 (Full Flow): PASS / FAIL
- Registration worked: YES / NO
- Button worked: YES / NO
- Counts updated: YES / NO

TEST 4 (Attendance): PASS / FAIL
- Still working: YES / NO

TEST 5 (Permissions): PASS / FAIL
- Students blocked: YES / NO
- Managers see sections: YES / NO
```

---

## 🎯 **NEXT STEPS AFTER TESTING**

**If All Pass:**
- ✅ Event registration system 100% working!
- Move to post-event completion (if you want)
- Or move to document upload

**If Some Fail:**
- Tell me which tests failed
- Share any error messages
- I'll fix immediately!

---

**START TESTING NOW!** 🚀

**Remember:** Restart backend first! Then follow tests in order.
