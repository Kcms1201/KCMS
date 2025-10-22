# 📅 SIMPLE MEETINGS FEATURE - QUICK PLAN

**Time:** 2-3 hours  
**Principle:** KISS - No complex workflows

---

## 🎯 FEATURES (SIMPLE)

### What It Does:
1. ✅ Core members schedule meetings
2. ✅ Set date, time, venue, agenda
3. ✅ All club members automatically invited
4. ✅ Mark attendance during/after meeting
5. ✅ View upcoming & past meetings

### What We Skip:
❌ No RSVP system
❌ No approvals
❌ No reminders (can add later)
❌ No conflicts checking

---

## 📊 DATABASE

### Meeting Model:
```
- club: Club ID
- title: String
- agenda: String
- date: Date
- time: String (e.g., "3:00 PM")
- duration: Number (minutes)
- venue: String
- type: 'in-person' | 'online'
- createdBy: User ID
- status: 'scheduled' | 'completed' | 'cancelled'
- attendees: [{ user, status: 'present'|'absent', markedAt, markedBy }]
```

---

## 🔧 IMPLEMENTATION STEPS

### Backend (1.5 hours):
1. Create Meeting model (15 min)
2. Create Meeting controller (30 min)
   - createMeeting()
   - listMeetings()
   - markAttendance()
   - completeMeeting()
3. Add routes (10 min)
4. Test with Postman (15 min)

### Frontend (1.5 hours):
1. ClubMeetingsPage.jsx (45 min)
   - List view
   - Create form
   - Attendance marking
2. CSS styling (30 min)
3. Add to navigation (15 min)

---

## 🎨 UI MOCKUP

### Meetings Page:
```
┌─────────────────────────────────────────┐
│  📅 Club Meetings     [+ Schedule]      │
├─────────────────────────────────────────┤
│                                         │
│  Upcoming Meetings                      │
│  ┌─────────────────────────────────┐   │
│  │ Weekly Planning Meeting          │   │
│  │ Oct 25, 2025 @ 3:00 PM          │   │
│  │ 📍 Room 101                      │   │
│  │ [Mark Attendance]                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Past Meetings                          │
│  ┌─────────────────────────────────┐   │
│  │ Tech Fest Discussion             │   │
│  │ Oct 18, 2025                     │   │
│  │ Attended: 15/20 members          │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Create Form (Simple):
```
┌─────────────────────────────────────┐
│  Schedule New Meeting               │
├─────────────────────────────────────┤
│  Title: [____________]              │
│  Agenda: [___________]              │
│  Date: [2025-10-25]                 │
│  Time: [3:00 PM]                    │
│  Duration: [60] minutes             │
│  Venue: [Room 101]                  │
│  Type: ● In-person ○ Online         │
│                                     │
│  [Cancel]  [Schedule Meeting]       │
└─────────────────────────────────────┘
```

---

## ✅ DONE CRITERIA

When finished, should be able to:
- [x] Core member creates meeting
- [x] All club members see it
- [x] Mark who attended
- [x] View past meetings
- [x] See attendance stats

**Ready to implement?** 🚀
