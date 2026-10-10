# Implementation Plan - Email & Admin Authentication Clarification

## Proposed Changes

### 1. Auth & Admin Clarification in UI and Login Flow
- Update `AuthModal.tsx` and related UI hints so users understand that entering their email address (e.g. `dataruruaa@gmail.com`) as their **Username / Email** field logs them into their admin account and restores career progression.
- Ensure auto-registration and login logic seamlessly accepts email addresses in the username input field.

## Verification Plan
- Compile applet with `compile_applet`.
- Verify admin recognition when logging in with `dataruruaa@gmail.com`.
