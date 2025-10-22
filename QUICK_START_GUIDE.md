# Quick Start Guide - Organizer Attendance System

## 🚀 Start the Application

### 1. Start Backend
```bash
cd Backend
npm start
```
Expected output: `Server running on port 5000`

### 2. Start Frontend
```bash
cd Frontend
npm start
```
Expected output: Opens browser at `http://localhost:3000`

---

## 🧪 Quick Test (5 minutes)

### Step 1: Create Event with Organizers
1. Login as club president/core member
2. Navigate to: `http://localhost:3000/events/create?clubId=<yourClubId>`
3. Fill in event details
4. **Select organizers** from the multi-select dropdown
5. Click "Create Event"
6. ✅ Event created with organizers assigned

### Step 2: Mark Organizer Attendance
1. Navigate to the event detail page
2. Click "📝 Manage Organizer Attendance"
3. Check/uncheck boxes to mark attendance
4. Click "Save Attendance"
5. ✅ Attendance saved

### Step 3: View Member Analytics
1. Navigate to: `http://localhost:3000/clubs/<clubId>/member-analytics`
2. See list of all members with stats
3. Filter by activity status
4. Click on a member to see detailed history
5. ✅ Analytics displayed correctly

---

## 📋 Manual API Testing (Postman/ThunderClient)

### Test 1: Create Event with Organizers
```http
POST http://localhost:5000/api/events
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "club": "6751eee8dcde46e0a4b06d9c",
  "title": "Test Workshop",
  "description": "Testing organizer tracking",
  "dateTime": "2024-02-15T10:00:00Z",
  "venue": "Lab 101",
  "organizers": ["userId1", "userId2"],
  "volunteers": ["userId3"]
}
```

Expected Response:
```json
{
  "status": "success",
  "data": {
    "event": {
      "_id": "...",
      "title": "Test Workshop",
      "organizers": ["userId1", "userId2"],
      "volunteers": ["userId3"],
      ...
    }
  }
}
```

### Test 2: Get Organizers
```http
GET http://localhost:5000/api/events/<eventId>/organizers
Authorization: Bearer <your-token>
```

Expected Response:
```json
{
  "status": "success",
  "data": {
    "organizers": [
      {
        "userId": "userId1",
        "name": "John Doe",
        "role": "organizer",
        "attendanceStatus": "absent"
      }
    ]
  }
}
```

### Test 3: Update Attendance
```http
POST http://localhost:5000/api/events/<eventId>/organizer-attendance
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "attendance": [
    { "userId": "userId1", "status": "present" },
    { "userId": "userId2", "status": "absent" }
  ]
}
```

### Test 4: Get Member Analytics
```http
GET http://localhost:5000/api/analytics/clubs/<clubId>/members
Authorization: Bearer <your-token>
```

Expected Response:
```json
{
  "status": "success",
  "data": {
    "members": [
      {
        "userId": "...",
        "name": "John Doe",
        "stats": {
          "totalEvents": 3,
          "presentEvents": 2,
          "organizerEvents": 2,
          "participationRate": 66.7,
          "activityStatus": "moderate"
        }
      }
    ],
    "total": 25
  }
}
```

---

## 🐛 Common Issues & Fixes

### Issue 1: "Cannot read property 'organizers'"
**Cause**: Frontend sending wrong data format
**Fix**: Check that organizers array is sent correctly in FormData

### Issue 2: "Attendance record not found"
**Cause**: Trying to mark attendance before event is created
**Fix**: Create event first, then mark attendance

### Issue 3: Analytics showing 0 events
**Cause**: No events created yet OR no organizers assigned
**Fix**: 
1. Create events with organizers
2. Mark some attendance
3. Refresh analytics page

### Issue 4: "Permission denied"
**Cause**: User doesn't have required role
**Fix**: Ensure user is:
- Club president, OR
- Core team member, OR
- Admin/Coordinator

---

## ✅ Verification Checklist

After testing, verify:

- [ ] Event created with organizers field populated
- [ ] Attendance records created automatically (check DB)
- [ ] Organizer attendance page shows correct list
- [ ] Attendance can be marked present/absent
- [ ] Member analytics shows correct counts
- [ ] Activity status calculated correctly
- [ ] Individual member history displays
- [ ] CSV export works
- [ ] Dashboard widget shows summary

---

## 📊 Example Data Flow

```
1. CREATE EVENT
   User → Frontend → POST /api/events
   Backend creates:
     - Event document
     - Attendance records (status: 'absent')
   
2. VIEW ORGANIZERS
   Frontend → GET /api/events/:id/organizers
   Backend returns:
     - List of organizers with attendance status
   
3. MARK ATTENDANCE
   User checks boxes → Frontend → POST /api/events/:id/organizer-attendance
   Backend updates:
     - Attendance.status = 'present'
     - Attendance.checkInTime = now()
   
4. VIEW ANALYTICS
   Frontend → GET /api/analytics/clubs/:id/members
   Backend calculates:
     - Count events per member
     - Calculate participation rate
     - Determine activity status
     - Sort by participation
```

---

## 🎯 Success Criteria

The system is working correctly when:

1. ✅ Events can be created with organizers
2. ✅ Organizers receive attendance records automatically
3. ✅ Attendance can be marked present/absent
4. ✅ Analytics accurately reflect participation
5. ✅ Activity status updates correctly
6. ✅ CSV export contains all data
7. ✅ No console errors in browser or server

---

## 📞 Need Help?

### Check logs:
- **Backend**: Terminal running `npm start` (Backend folder)
- **Frontend**: Browser console (F12)
- **Database**: Check MongoDB using Compass or CLI

### Verify data:
```bash
# Check if attendance records exist
mongo
> use ram-db
> db.attendances.find({ type: { $in: ['organizer', 'volunteer'] } })

# Check events with organizers
> db.events.find({ organizers: { $exists: true, $ne: [] } })
```

### Still stuck?
1. Check `BACKEND_IMPLEMENTATION_COMPLETE.md` for API reference
2. Verify authentication token is valid
3. Ensure user has correct permissions
4. Check network tab for actual request/response

---

## 🎉 You're Ready!

The system is fully functional. Start creating events with organizers and track member participation!
