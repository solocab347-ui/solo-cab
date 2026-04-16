---
name: Favorite Driver Priority in Search
description: Favorite drivers are prioritized in booking search results within 5km, auto-selected, and shown with a heart badge.
type: feature
---
- `find_nearby_drivers` RPC accepts `p_favorite_driver_ids` parameter
- Favorite drivers within 5km are always included even if outside normal search radius
- Results sorted: favorites first, then by distance
- `useNearbyDrivers` hook accepts `favoriteDriverIds` and marks `is_favorite` on results
- `UnifiedBookingPage` fetches client's `favorite_driver_id` and passes it to search
- Favorite drivers are auto-selected in results
- `DriverResultsCarousel3D` shows a red heart badge on favorite driver cards
