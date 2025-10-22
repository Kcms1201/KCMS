# 📋 Implementation TODO - Frontend-Backend Gap Fixes

## 🚨 PRIORITY 1 - CRITICAL (Implement First)

### 1. Account Merge Feature

**Backend:** ✅ Already implemented  
**Frontend:** ❌ Needs implementation

#### Files to Create:
```
src/pages/admin/MergeAccountsPage.jsx
```

#### Files to Modify:
```
src/services/adminService.js - Add merge methods
src/App.jsx - Add route
src/pages/dashboards/AdminDashboard.jsx - Add navigation link
```

#### Implementation Steps:

**Step 1:** Add service methods
```javascript
// src/services/adminService.js

previewMerge: async (sourceUserId, targetUserId) => {
  const response = await api.post('/admin/merge/preview', { 
    sourceUserId, 
    targetUserId 
  });
  return response.data;
},

executeMerge: async (sourceUserId, targetUserId, reason) => {
  const response = await api.post('/admin/merge/execute', { 
    sourceUserId, 
    targetUserId, 
    reason 
  });
  return response.data;
},
```

**Step 2:** Create page component
```javascript
// src/pages/admin/MergeAccountsPage.jsx

Required features:
- Search users by roll number or email
- Display user details side-by-side
- Preview merge button (shows warnings)
- Execute merge button (with confirmation dialog)
- Show transfer results after merge
```

**Step 3:** Add route
```javascript
// src/App.jsx (around line 273)

<Route
  path="/admin/merge-accounts"
  element={
    <ProtectedRoute requiredRole="admin">
      <MergeAccountsPage />
    </ProtectedRoute>
  }
/>
```

**Step 4:** Add navigation
```javascript
// src/pages/dashboards/AdminDashboard.jsx

<Link to="/admin/merge-accounts">
  <Button>🔀 Merge Duplicate Accounts</Button>
</Link>
```

---

### 2. Push Notification Subscription UI

**Backend:** ✅ Fully implemented  
**Frontend:** ⚠️ Service exists, NO UI

#### Files to Create:
```
src/pages/user/PushNotificationsPage.jsx
```

#### Files to Modify:
```
src/App.jsx - Add route
src/pages/user/ProfilePage.jsx - Add navigation tab
```

#### Implementation Steps:

**Step 1:** Create page component
```javascript
// src/pages/user/PushNotificationsPage.jsx

Required features:
- Check browser support
- Show permission status (granted/denied/default)
- Subscribe button (requests permission + subscribes)
- Show active subscriptions list
- Unsubscribe button for each device
- Test notification button
- Instructions/help text
```

**Step 2:** Add route
```javascript
// src/App.jsx (around line 237)

<Route
  path="/profile/push-notifications"
  element={
    <ProtectedRoute>
      <PushNotificationsPage />
    </ProtectedRoute>
  }
/>
```

**Step 3:** Add navigation tab
```javascript
// src/pages/user/ProfilePage.jsx

Add tab:
<Tab onClick={() => navigate('/profile/push-notifications')}>
  📱 Push Notifications
</Tab>
```

---

### 3. Cache Management UI

**Backend:** ✅ Route exists `/admin/cache/clear`  
**Frontend:** ❌ No service, no UI

#### Files to Modify:
```
src/services/adminService.js - Add clearCache method
src/pages/admin/SystemSettings.jsx - Add UI button
```

#### Implementation Steps:

**Step 1:** Add service method
```javascript
// src/services/adminService.js

clearCache: async () => {
  const response = await api.post('/admin/cache/clear');
  return response.data;
},
```

**Step 2:** Add UI button
```javascript
// src/pages/admin/SystemSettings.jsx

Add section:
<Card>
  <CardHeader>
    <h3>Cache Management</h3>
  </CardHeader>
  <CardBody>
    <p>Clear Redis cache to refresh club listings and search results.</p>
    <Button 
      onClick={handleClearCache}
      variant="warning"
    >
      Clear All Cache
    </Button>
  </CardBody>
</Card>

// Handler:
const handleClearCache = async () => {
  try {
    const result = await adminService.clearCache();
    toast.success(`Cleared ${result.data.clearedKeys} cache entries`);
  } catch (error) {
    toast.error('Failed to clear cache');
  }
};
```

---

## ⚡ PRIORITY 2 - HIGH (Implement This Week)

### 4. Export Audit Logs Button

**Backend:** ✅ `/audit/export`  
**Frontend:** ✅ Service exists, ❌ No button

#### Files to Modify:
```
src/pages/admin/AuditLogs.jsx - Add export button
```

#### Implementation:

```javascript
// src/pages/admin/AuditLogs.jsx

// Add button in header:
<Button onClick={handleExport}>
  📥 Export CSV
</Button>

// Handler:
const handleExport = async () => {
  try {
    const blob = await auditService.exportCSV(filters);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString()}.csv`;
    link.click();
  } catch (error) {
    toast.error('Failed to export logs');
  }
};
```

---

### 5. Financial Override UI (Coordinator Only)

**Backend:** ✅ `/events/:id/financial-override`  
**Frontend:** ✅ Service exists, ❌ Not used

#### Files to Modify:
```
src/pages/events/EventDetailPage.jsx - Add override button
```

#### Implementation:

```javascript
// src/pages/events/EventDetailPage.jsx

// Add in coordinator/admin section:
{isCoordinator && event.status === 'pending_financial_approval' && (
  <Button 
    onClick={() => setShowFinancialOverrideModal(true)}
    variant="warning"
  >
    Financial Override
  </Button>
)}

// Modal:
<Modal show={showFinancialOverrideModal}>
  <ModalHeader>Financial Override</ModalHeader>
  <ModalBody>
    <p>Override budget approval for special circumstances.</p>
    <textarea 
      placeholder="Reason for override (required)"
      value={overrideReason}
      onChange={(e) => setOverrideReason(e.target.value)}
    />
  </ModalBody>
  <ModalFooter>
    <Button onClick={handleFinancialOverride}>
      Confirm Override
    </Button>
  </ModalFooter>
</Modal>

// Handler:
const handleFinancialOverride = async () => {
  await eventService.financialOverride(eventId, {
    reason: overrideReason,
    approvedBudget: event.budget
  });
  toast.success('Financial override applied');
  refetchEvent();
};
```

---

### 6. Settings Reset Button

**Backend:** ✅ `/settings/reset`  
**Frontend:** ✅ Service exists, ❌ Not used

#### Files to Modify:
```
src/pages/admin/SystemSettings.jsx - Add reset button
```

#### Implementation:

```javascript
// src/pages/admin/SystemSettings.jsx

<Button 
  onClick={handleResetSettings}
  variant="danger"
>
  Reset to Defaults
</Button>

const handleResetSettings = async () => {
  if (!confirm('Reset ALL settings to defaults? This cannot be undone.')) {
    return;
  }
  try {
    await settingsService.resetToDefaults();
    toast.success('Settings reset to defaults');
    refetchSettings();
  } catch (error) {
    toast.error('Failed to reset settings');
  }
};
```

---

## 📦 PRIORITY 3 - MEDIUM (Next Sprint)

### 7. Batch Member Operations

**Backend:** ❌ Not implemented  
**Frontend:** ❌ Not implemented

#### Backend Changes Needed:

```javascript
// Backend/src/modules/club/club.routes.js

router.post(
  '/:clubId/members/batch-approve',
  authenticate,
  clubMiddleware.extractClubId,
  permit({ club: { roles: ['president', 'vicePresident', 'secretary'] } }),
  validate(validators.batchApproveMembersSchema),
  clubController.batchApproveMembers
);

router.post(
  '/:clubId/members/batch-reject',
  authenticate,
  clubMiddleware.extractClubId,
  permit({ club: { roles: ['president', 'vicePresident', 'secretary'] } }),
  validate(validators.batchRejectMembersSchema),
  clubController.batchRejectMembers
);
```

#### Frontend Changes:

```javascript
// src/services/clubService.js

batchApproveMembers: async (clubId, memberIds) => {
  const response = await api.post(`/clubs/${clubId}/members/batch-approve`, { 
    memberIds 
  });
  return response.data;
},

batchRejectMembers: async (clubId, memberIds) => {
  const response = await api.post(`/clubs/${clubId}/members/batch-reject`, { 
    memberIds 
  });
  return response.data;
},
```

```javascript
// src/pages/clubs/ClubDetailPage.jsx

// Add checkboxes for member selection
// Add batch approve/reject buttons
// Implement selection logic
```

---

### 8. Advanced Search Integration

**Backend:** ✅ All endpoints exist  
**Frontend:** ✅ Services exist, ❌ Not used in UI

#### Files to Modify:
```
src/pages/search/SearchPage.jsx - Add advanced search form
```

#### Implementation:

Add tabs:
- Basic Search (current)
- Advanced Search (new)
- Recommendations (new)

Advanced search form fields:
- Search type (clubs, events, users, documents)
- Date range
- Category/tags
- Location
- Status filters

---

### 9. Document Tagging Feature

**Backend:** ✅ `/clubs/:clubId/documents/:docId/tag`  
**Frontend:** ✅ Service exists, ❌ Not used

#### Files to Modify:
```
src/pages/media/GalleryPage.jsx - Add tagging UI
```

#### Implementation:

```javascript
// Add tag icon on photo hover
<Button onClick={() => setShowTagModal(true)}>
  🏷️ Tag Members
</Button>

// Modal with member selection
<Modal show={showTagModal}>
  <ModalHeader>Tag Members</ModalHeader>
  <ModalBody>
    <MemberMultiSelect 
      clubId={clubId}
      selected={taggedMembers}
      onChange={setTaggedMembers}
    />
  </ModalBody>
  <ModalFooter>
    <Button onClick={handleTagMembers}>
      Save Tags
    </Button>
  </ModalFooter>
</Modal>
```

---

### 10. Document Analytics Dashboard

**Backend:** ✅ `/clubs/:clubId/documents/analytics`  
**Frontend:** ✅ Service exists, ❌ Not shown

#### Files to Modify:
```
src/pages/media/GalleryPage.jsx - Add analytics section
```

#### Implementation:

Add analytics card showing:
- Total documents/photos
- Storage used
- Most popular albums
- Upload trend chart
- Document types breakdown

---

## 🎨 PRIORITY 4 - LOW (Future Enhancements)

### 11. Club/User Recommendations

**Backend:** ✅ Implemented  
**Frontend:** ✅ Services exist, ❌ Not displayed

Suggested locations:
- Homepage: "Recommended clubs for you"
- Club Dashboard: "Suggested members to recruit"

---

### 12. Critical Audit Logs Widget

**Backend:** ✅ `/audit/critical`  
**Frontend:** ✅ Service exists, ❌ Not used

Add to AdminDashboard.jsx:
- Widget showing recent critical logs
- Click to view full log details

---

### 13. User Activity Audit View

**Backend:** ✅ `/audit/user/:userId`  
**Frontend:** ✅ Service exists, ❌ Not accessible

Add to UsersManagementPage.jsx:
- "View Activity" button for each user
- Shows all actions by that user

---

### 14. Event Report Submission Endpoint

**Backend:** ❌ Missing  
**Frontend:** ❌ Using upload-materials workaround

Backend route to add:
```javascript
// Backend/src/modules/event/event.routes.js

router.post(
  '/:id/report',
  authenticate,
  upload.single('reportFile'),
  eventController.submitReport
);
```

---

## 📝 TESTING CHECKLIST

After implementing each feature:

- [ ] Service method works (Postman/API test)
- [ ] UI renders correctly
- [ ] Loading states work
- [ ] Error handling works
- [ ] Success messages shown
- [ ] Navigation links work
- [ ] Permission checks work
- [ ] Mobile responsive
- [ ] Accessibility checked
- [ ] Console has no errors

---

## 🎯 IMPLEMENTATION ORDER RECOMMENDATION

**Week 1:**
1. Account Merge Page (Priority 1.1)
2. Push Notifications Page (Priority 1.2)
3. Cache Management UI (Priority 1.3)

**Week 2:**
4. Export Audit Logs (Priority 2.4)
5. Financial Override UI (Priority 2.5)
6. Settings Reset (Priority 2.6)

**Week 3:**
7. Batch Member Operations (Priority 3.7)
8. Advanced Search (Priority 3.8)

**Week 4:**
9. Document Tagging (Priority 3.9)
10. Document Analytics (Priority 3.10)

**Future Sprints:**
- Recommendations
- Critical audit widget
- User activity view
- Event report endpoint

---

**Total Tasks:** 14  
**Estimated Time:** 3-4 weeks  
**Complexity:** Medium
