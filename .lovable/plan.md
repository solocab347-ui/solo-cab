

# Audit & Fix: Guest Booking Process

## Issues Found

### 1. Guest courses appear in "Confirmée" instead of "En attente" (CRITICAL)
**Root cause:** In `CoursesList.tsx` (lines 2244-2252), the tab sorting logic moves any course with `status: 'pending'` AND a devis with `status: 'accepted'` into the "Confirmée" tab. Since `create-devis-auto` auto-accepts devis for guest bookings (line 304: `autoAcceptDevis = isGuestBooking`), ALL guest courses bypass the "En attente" tab entirely.

**Fix:** The devis for guest bookings should NOT be auto-accepted. The devis should stay `pending` until the driver explicitly accepts the course. The `create-devis-auto` function must be updated to set `devisStatus = 'pending'` for guest bookings too.

### 2. No tracking email sent to guest after booking
**Root cause:** The `send-guest-tracking-email` function exists and works, but it is only called in `useDirectCourseCreation.ts` (driver-created courses). In `GuestBooking.tsx`, after the course is created, NO call to `send-guest-tracking-email` is made. The guest only sees the tracking page if they don't close the browser.

**Fix:** Call `send-guest-tracking-email` in `GuestBooking.tsx` after course creation (both Stripe and non-Stripe flows).

### 3. Tracking page missing payment integration
**Root cause:** `GuestBookingTracking.tsx` shows course status but has no payment section for when the driver uses Stripe Connect and the course is completed.

**Fix:** Add a payment section to the tracking page that shows when the course is completed and payment is pending, with a Stripe checkout link if applicable.

## Implementation Plan

### Step 1: Fix `create-devis-auto` — Stop auto-accepting guest devis
- Change `autoAcceptDevis` logic: guest bookings should create devis with `status: 'pending'`
- The driver must explicitly accept the course like any other booking
- This makes guest courses appear correctly in the "En attente" tab

### Step 2: Send tracking email in `GuestBooking.tsx`
- After course creation (both Stripe and non-Stripe paths), invoke `send-guest-tracking-email`
- Non-blocking: use `.catch()` to avoid failing the booking if email fails

### Step 3: Add payment section to `GuestBookingTracking.tsx`
- When course status is `completed` and driver uses Stripe, show payment button
- Link to existing payment flow (Stripe Checkout for guest)
- Show payment status (paid/pending) based on facture data

### Step 4: Update `CoursesList.tsx` accept flow for guest courses
- When driver accepts a guest course from "En attente", the existing `handleAcceptCourse` should work as-is since the course status will be `pending`
- Verify the accept flow triggers devis acceptance + course status update

### Files to modify:
1. `supabase/functions/create-devis-auto/index.ts` — Remove guest auto-accept
2. `src/pages/GuestBooking.tsx` — Add tracking email call
3. `src/pages/GuestBookingTracking.tsx` — Add payment section + realtime updates
4. Potentially `CoursesList.tsx` — Verify accept flow handles guest courses

