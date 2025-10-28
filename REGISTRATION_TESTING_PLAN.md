# 🧪 EVENT REGISTRATION TESTING PLAN

**Date:** Oct 28, 2025, 11:01 AM  
**Focus:** Test registration system end-to-end

---

## 📋 **WHAT WE BUILT TODAY:**

### **Backend (Already Done):**
✅ Registration count queries in event detail API
✅ Registration/attendance data models
✅ Approval workflow endpoints

### **Frontend (Just Added):**
✅ Registration counts in EventDetailPage
✅ "View & Manage Registrations" button
✅ Permission checks (only core members see it)

---

## 🧪 **TEST PLAN:**

### **TEST 1: Registration Counts Display** ⏱️ 5 min

**Prerequisites:**
- 1 published event
- 1 club president account

**Steps:**
1. Login as **club president**
2. Navigate to **Event Detail** page of YOUR club's event
3. **Expected:** See registration section:
   ```
   📝 Event Registrations
   
   Total Registrations: 0
   Pending Approval: 0
   
   [📋 View & Manage Registrations]
   ```

**✅ PASS IF:**
- Section appears for core members
- Counts display (even if 0)
- Button is visible and clickable

**❌ FAIL IF:**
- Section doesn't appear
- Shows "undefined"
- Button doesn't exist

---

### **TEST 2: Student Registration (Audience)** ⏱️ 5 min

**Prerequisites:**
- 1 published event
- 1 student account (not club member)

**Steps:**
1. Login as **student**
2. Go to **Events** page
3. Click on a **published** event
4. Click "**Register for Event**" button
5. Select "**Audience**"
6. Fill any required fields
7. Submit

**✅ PASS IF:**
- Registration form appears
- Can submit successfully
- See success message
- Registration saved in database

**❌ FAIL IF:**
- Registration button missing
- Form doesn't submit
- Errors appear

---

### **TEST 3: Student Registration (Performer)** ⏱️ 10 min

**Prerequisites:**
- 1 published event with `allowPerformerRegistrations: true`
- 1 student account
- Student is member of at least 1 club

**Steps:**
1. Login as **student**
2. Navigate to event
3. Click "**Register as Performer**"
4. Fill form:
   - **Representing Club:** Select a club
   - **Performance Type:** e.g., "Dance", "Singing"
   - **Performance Description:** Brief description
   - **Notes:** Any additional info
5. Submit

**✅ PASS IF:**
- Can select representing club
- Can enter performance details
- Submission successful
- Status set to "pending" (needs approval)

**❌ FAIL IF:**
- Can't select club
- Required fields missing
- Submission fails

---

### **TEST 4: View Registrations (President)** ⏱️ 5 min

**Prerequisites:**
- Event with at least 1 registration
- Club president account

**Steps:**
1. Login as **president**
2. Go to event detail page
3. Check registration counts:
   - Total Registrations: **1** (or more)
   - Pending Approval: **1** (if performer)
4. Click "**📋 View & Manage Registrations**" button

**✅ PASS IF:**
- Counts updated correctly
- Button navigates to `/clubs/{clubId}/registrations`
- Registration list appears

**❌ FAIL IF:**
- Counts still show 0
- Button doesn't navigate
- 404 error on registrations page

---

### **TEST 5: Approve/Reject Performers** ⏱️ 10 min

**Prerequisites:**
- At least 1 pending performer registration
- Club president account

**Steps:**
1. Navigate to registrations page
2. Find pending performer
3. Click "**Approve**" or "**Reject**"
4. Go back to event detail page
5. Check counts updated

**✅ PASS IF:**
- Can approve/reject
- Status changes
- Counts update (pending decreases)
- Student gets notification

**❌ FAIL IF:**
- Approve/reject doesn't work
- Status doesn't change
- Counts don't update

---

## 🐛 **KNOWN POTENTIAL ISSUES:**

### **Issue 1: Registration Button Missing**
**Cause:** Event not published or `allowPerformerRegistrations` false  
**Fix:** Check event status and settings

### **Issue 2: Can't View Registrations**
**Cause:** Registrations page doesn't exist  
**Fix:** Check if `ClubRegistrationsPage.jsx` exists

### **Issue 3: Counts Not Updating**
**Cause:** Backend not returning counts  
**Fix:** Already fixed in `event.service.js` lines 216-223

### **Issue 4: Permission Denied**
**Cause:** Not a core member of club  
**Fix:** Login as president/vice president

---

## 📊 **CHECKLIST:**

**Before Testing:**
- [ ] Backend server running
- [ ] Frontend server running
- [ ] At least 1 published event exists
- [ ] Have student account credentials
- [ ] Have president account credentials

**During Testing:**
- [ ] Test 1: Registration counts display ✅/❌
- [ ] Test 2: Audience registration ✅/❌
- [ ] Test 3: Performer registration ✅/❌
- [ ] Test 4: View registrations ✅/❌
- [ ] Test 5: Approve/reject ✅/❌

**After Testing:**
- [ ] All tests pass
- [ ] Document any bugs found
- [ ] Report results

---

## 🚀 **LET'S START:**

**Which test should we run first?**

1. **Test 1** - Check if registration counts show (quickest)
2. **Test 2** - Student registers as audience
3. **Test 3** - Student registers as performer

**Or tell me if you found any bugs already!** 🔍
