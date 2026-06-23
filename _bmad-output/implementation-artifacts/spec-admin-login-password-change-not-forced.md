---
title: 'Admin Login Password Change Not Forced'
type: 'bugfix'
created: '2026-06-23T13:56:25+07:00'
status: 'done'
route: 'one-shot'
---

# Admin Login Password Change Not Forced

## Intent

**Problem:** AIMS redirected ADMIN-only staff to the change-password screen after successful login, which made password change feel mandatory even though the Problem Statement only grants staff the option to change password whenever they want.

**Approach:** Keep product managers landing on product administration, send other staff to the neutral home route until Story 5.2 adds an admin landing page, and preserve `/staff/change-password` as an authenticated self-service destination.

## Suggested Review Order

**Login fallback**

- Removes the ADMIN-only forced password-change fallback.
  [`login-screen.ts:287`](../../frontend/src/app/auth/boundary/login-screen/login-screen.ts#L287)

**Traceability**

- Aligns Story 5.3 notes with the Problem Statement-driven behavior.
  [`5-3-staff-authentication-password-management.md:128`](./5-3-staff-authentication-password-management.md#L128)

**Tests**

- Locks Product Manager default navigation to product administration.
  [`auth-forms.atdd.spec.ts:48`](../../frontend/src/app/auth/boundary/auth-forms.atdd.spec.ts#L48)

- Proves ADMIN-only staff are not forced to change password.
  [`auth-forms.atdd.spec.ts:59`](../../frontend/src/app/auth/boundary/auth-forms.atdd.spec.ts#L59)

- Keeps user-initiated change-password navigation valid via sanitized return URL.
  [`auth-forms.atdd.spec.ts:71`](../../frontend/src/app/auth/boundary/auth-forms.atdd.spec.ts#L71)
