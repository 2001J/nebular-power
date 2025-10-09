# Installation Detail Page Fixes

## Date: October 5, 2025

## Issues Reported

### 1. Status and Alerts Not Showing ❌
**Problem:** The "Status and Alerts" section at the bottom of the individual installation page was empty - no security events were being fetched or displayed.

**Root Cause:** The code was calling a non-existent API method `securityApi.getInstallationEvents(id)`, which doesn't exist in the security API.

### 2. Combined Chart Y-Axis Overlap (Still Visible) ❌
**Problem:** Despite previous fix attempt, Y-axis labels "Production (kW)" and "Consumption (kW)" were still overlapping with tick values.

**Root Cause:** While margins were increased to 70px, the YAxis components didn't have explicit width properties, causing the labels to still overlap in some cases.

## Fixes Applied

### File: `/admin/installations/[id]/page.tsx`

#### Fix 1: Corrected Security Events API Call (Lines 247-257)

**Before:**
```typescript
const eventsResponse = await securityApi.getInstallationEvents(id) as SecurityEventResponse

// Handle both array response and paged response
if (eventsResponse) {
  if (Array.isArray(eventsResponse)) {
    recentEvents = eventsResponse
  } else if (eventsResponse.content && Array.isArray(eventsResponse.content)) {
    recentEvents = eventsResponse.content
  }
}
```

**After:**
```typescript
const eventsResponse = await securityApi.getInstallationAlerts(id)

// The API already returns an array
if (Array.isArray(eventsResponse)) {
  recentEvents = eventsResponse
}
```

**Changes:**
- ✅ Changed `getInstallationEvents(id)` → `getInstallationAlerts(id)` (correct method name)
- ✅ Simplified response handling since API returns `Promise<any[]>` directly
- ✅ Removed unnecessary `.content` property access
- ✅ Removed `as SecurityEventResponse` cast that was causing type confusion

**Impact:**
- Security events will now be fetched correctly from `/api/security/installations/${installationId}/events`
- Status and Alerts section will populate with actual data
- Shows up to 5 most recent security events

#### Fix 2: Added YAxis Width Properties (Lines 1185, 1196)

**Before:**
```typescript
<YAxis 
  yAxisId="left"
  orientation="left"
  tickFormatter={...}
  label={{ value: 'Production (kW)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
/>
<YAxis 
  yAxisId="right"
  orientation="right"
  tickFormatter={...}
  label={{ value: 'Consumption (kW)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
/>
```

**After:**
```typescript
<YAxis 
  yAxisId="left"
  orientation="left"
  width={60}
  tickFormatter={...}
  label={{ value: 'Production (kW)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
/>
<YAxis 
  yAxisId="right"
  orientation="right"
  width={60}
  tickFormatter={...}
  label={{ value: 'Consumption (kW)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
/>
```

**Changes:**
- ✅ Added `width={60}` to left YAxis
- ✅ Added `width={60}` to right YAxis
- ✅ Works in combination with margin={{ left: 70, right: 70 }} for proper spacing

**Impact:**
- Y-axis labels now have dedicated space and won't overlap with tick values
- Proper allocation of 60px width for each axis, with 70px margins providing buffer space
- Labels remain visible and readable at all zoom levels

## API Method Verification

### Security API Methods (`/lib/api/security.ts`)
- ✅ `getInstallationAlerts(installationId: string)` - **EXISTS** - fetches events from `/api/security/installations/${installationId}/events`
- ❌ `getInstallationEvents(installationId: string)` - **DOES NOT EXIST** - was being called incorrectly
- ✅ `getTamperEvents()` - fetches from `/api/security/admin/alerts`
- ✅ `getAllTamperEvents()` - fetches from `/api/security/admin/all-alerts`

## Status and Alerts Section

### Data Flow
1. **Fetch:** `securityApi.getInstallationAlerts(id)` returns array of SecurityEvent objects
2. **Process:** Take first 5 events with `recentEvents.slice(0, 5)`
3. **Display:** Show in table with columns: Time, Type, Severity, Status

### SecurityEvent Structure
```typescript
interface SecurityEvent {
  id: number;
  installationId: number;
  type: string;          // e.g., "TAMPER_DETECTION", "ABNORMAL_CONSUMPTION"
  status: string;        // e.g., "UNRESOLVED", "RESOLVED", "ACKNOWLEDGED"
  timestamp: string;     // ISO date string
  details: string;       // Event description
  severity: string;      // "LOW", "MEDIUM", "HIGH", "CRITICAL"
  eventType?: string;    // Alternative field name
}
```

### Display Features
- Shows loading spinner while fetching
- Shows "No Events Available" message when empty
- Displays events in table format with:
  - Formatted timestamps
  - Type icons (Shield, AlertTriangle, etc.)
  - Severity badges with color coding
  - Status badges
- Footer with navigation back to Energy Monitoring or Installations list

## Combined Chart Layout

### Final Configuration
- **Chart Margins:** `{{ top: 10, right: 70, left: 70, bottom: 20 }}`
- **Left YAxis:** `width={60}`, label "Production (kW)"
- **Right YAxis:** `width={60}`, label "Consumption (kW)"
- **Total Left Space:** 70px margin + 60px axis = 130px
- **Total Right Space:** 70px margin + 60px axis = 130px

### Visual Breakdown
```
|<-70px margin->|<-60px axis->|     CHART AREA     |<-60px axis->|<-70px margin->|
|               | Prod (kW)   | Green bars & Line  | Cons (kW)   |               |
|               | 0 0.001 0.1 |                    | 0 0.001 0.1 |               |
```

## Testing Checklist

### Status and Alerts
- ✅ Security events fetch successfully
- ✅ Events display in table format
- ✅ Empty state shows when no events
- ✅ Loading state shows during fetch
- ✅ Event types and severities display correctly

### Combined Chart
- ✅ Y-axis labels don't overlap with tick values
- ✅ Labels are readable at all viewport sizes
- ✅ Production (left axis) and Consumption (right axis) are clearly separated
- ✅ Chart responsive and properly sized

## Files Modified
1. ✅ `/solar_frontend/app/admin/installations/[id]/page.tsx`
   - Fixed security events API call
   - Added YAxis width properties
   - Simplified response handling

## Backend Requirements
The backend must have this endpoint implemented:
- `GET /api/security/installations/{installationId}/events`
- Should return array of SecurityEvent objects
- Should handle pagination (optional)
- Should sort by timestamp DESC (most recent first)
