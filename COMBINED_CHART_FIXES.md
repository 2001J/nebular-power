# Combined Chart Fixes

## Date: October 5, 2025

## Issues Identified from Screenshot

### 1. Y-Axis Label Overlap ❌
**Problem:** Y-axis labels "Production (kW)" and "Consumption (kW)" were overlapping with the axis tick labels
**Screenshot Evidence:** Labels cramped and hard to read

### 2. Tooltip Mislabeling ❌
**Problem:** Tooltip showed "Consumption: 0.00015 kW" for both Production (green bars) AND Consumption (red line)
**Screenshot Evidence:** Hover over October production bar showed "Consumption" label instead of "Production"

### 3. Year View Issue ✅
**Status:** Already working correctly - shows all 12 months (Jan-Dec)
**Note:** Screenshot showed October data, which is correct for current date (Oct 5, 2025)

## Fixes Applied

### File: `/admin/installations/[id]/page.tsx`

#### Fix 1: Increased Margins (Line 1173)
**Before:**
```typescript
<ComposedChart data={energyData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
```

**After:**
```typescript
<ComposedChart data={energyData} margin={{ top: 10, right: 70, left: 70, bottom: 20 }}>
```

**Impact:**
- Left margin: 10 → 70 (prevents "Production (kW)" label overlap)
- Right margin: 10 → 70 (prevents "Consumption (kW)" label overlap)
- Labels now have proper spacing

#### Fix 2: Improved Y-Axis Label Positioning (Lines 1186, 1197)
**Before:**
```typescript
label={{ value: 'Production (kW)', angle: -90, position: 'insideLeft', offset: 10 }}
label={{ value: 'Consumption (kW)', angle: 90, position: 'insideRight', offset: 10 }}
```

**After:**
```typescript
label={{ value: 'Production (kW)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
label={{ value: 'Consumption (kW)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
```

**Impact:**
- Removed `offset: 10` which was causing positioning issues
- Added `style: { textAnchor: 'middle' }` for centered alignment
- Labels properly centered in their space

#### Fix 3: Corrected Tooltip Labels (Lines 1200-1209)
**Before:**
```typescript
<Tooltip formatter={(value: any, name: string) => {
  // name was 'generation' or 'consumption' (dataKey)
  if (typeof value === 'number') {
    if (value === 0) return ['0 kW', name === 'generation' ? 'Production' : 'Consumption'];
    // ... more formatting
  }
  return [`${value} kW`, name === 'generation' ? 'Production' : 'Consumption'];
}} />
```

**After:**
```typescript
<Tooltip 
  formatter={(value: any, name: string) => {
    // name is now 'Production' or 'Consumption' (Bar/Line name prop)
    const label = name === 'Production' ? 'Production' : 'Consumption';
    if (typeof value === 'number') {
      if (value === 0) return ['0 kW', label];
      if (value < 0.01) return [`${value.toFixed(5)} kW`, label];
      if (value < 1) return [`${value.toFixed(3)} kW`, label];
      return [`${value.toFixed(2)} kW`, label];
    }
    return [`${value} kW`, label];
  }} 
/>
```

**Impact:**
- Fixed tooltip to use the `name` prop from `<Bar name="Production" />` and `<Line name="Consumption" />`
- Green bars now correctly show "Production: X kW"
- Red line now correctly shows "Consumption: X kW"

#### Fix 4: Enhanced Legend (Line 1212)
**Before:**
```typescript
<Legend />
```

**After:**
```typescript
<Legend 
  wrapperStyle={{ paddingTop: '10px' }}
  iconType="rect"
/>
```

**Impact:**
- Added padding for better spacing
- Set icon type to rectangle for consistency

### File: `/admin/energy/page.tsx`

#### Fix: Added Proper Margins (Line 1062)
**Before:**
```typescript
<ComposedChart data={energyData}>
```

**After:**
```typescript
<ComposedChart data={energyData} margin={{ top: 10, right: 70, left: 70, bottom: 20 }}>
```

**Impact:**
- Consistent margins across all combined charts
- Prevents Y-axis label overlap

## Visual Improvements

### Before:
- ❌ Y-axis labels overlapping with tick values
- ❌ Tooltip showing "Consumption" for production bars
- ❌ Cramped layout

### After:
- ✅ Y-axis labels properly spaced with 70px margins
- ✅ Tooltip correctly shows "Production" for green bars, "Consumption" for red line
- ✅ Clean, readable layout
- ✅ Legend properly formatted with padding

## Technical Details

### Margin Adjustments
- **Left margin (70px):** Space for "Production (kW)" label + tick values
- **Right margin (70px):** Space for "Consumption (kW)" label + tick values
- **Top margin (10px):** Minimal space for chart
- **Bottom margin (20px):** Space for X-axis labels

### Tooltip Logic
The key fix was understanding that Recharts passes the `name` prop (from `<Bar name="Production" />`) to the tooltip formatter, not the dataKey. The original code was checking `name === 'generation'` which would never match because `name` was already "Production".

### Chart Components
- **Bar (Production):** Uses left Y-axis, green color (#10b981)
- **Line (Consumption):** Uses right Y-axis, red color (#ef4444)
- Both have independent Y-axes with smart formatting

## Files Modified
1. ✅ `/solar_frontend/app/admin/installations/[id]/page.tsx` - Combined chart with all fixes
2. ✅ `/solar_frontend/app/admin/energy/page.tsx` - Combined chart margin fix

## Testing Recommendations
1. ✅ Check Y-axis labels don't overlap on different screen sizes
2. ✅ Verify tooltip shows "Production" for green bars
3. ✅ Verify tooltip shows "Consumption" for red line
4. ✅ Test with different data values (small, medium, large)
5. ✅ Check monthly view with angled labels
