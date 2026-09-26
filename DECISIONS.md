# Decisions Log

## 2026-09-26 Keep one rental form and move it inline for edits

**Decision:** Reuse the existing rental form and move its DOM node into a full-width table row directly beneath the selected rental while editing. Return it to its original anchor for new rentals and cancellation.
**Context:** Rental editing should match the existing chamber and machine editing experience without duplicating form markup or save logic.
**Alternatives considered:** A duplicate per-row form or a modal would create divergent validation/save paths or fail the requested inline interaction.
**Status:** Confirmed

## 2026-09-26 Treat rental months as calendar billing periods

**Decision:** A selected month count ends on the day before the corresponding calendar-month anniversary, using UTC date arithmetic and clamping month-end anniversaries to the target month's final day. Leap days are part of the rental period and do not create an extra charge or an omitted day.
**Context:** The rental editor needs predictable subscription-style terms while retaining a custom end-date option.
**Alternatives considered:** Fixed 30-day blocks drift away from monthly subscription billing; raw JavaScript `setMonth()` can overflow dates such as January 31 into March.
**Status:** Confirmed
