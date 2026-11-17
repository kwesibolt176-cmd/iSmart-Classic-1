# Project memory

## Product intent & audience

- Product has a password reset / "Create a new password" authentication flow.
- Desktop experience is the current focus; mobile UI is deferred until screens are provided later.

## Brand personality & voice

- UI copy uses clear, instructional tone (field labels, requirement hints, action verbs like "Save password and sign in").

## Visual design & UX direction

- Desktop-first development only; do not modify mobile layouts/styles in current passes.
- Password creation screen includes: heading + supporting text, labeled password and confirm-password fields, live password requirement hints, prominent primary action button.
- Placeholder text used in confirm-password field.
- Match supplied design screens precisely when provided for desktop.

## Decisions, constraints & rationale

- Explicitly avoid pushing changes to mobile UI until mobile screens are shared — rationale: avoid premature mobile work.
- Preserve existing authentication/reset behavior and validation when updating visual design.
- Desktop build must pass (compiles successfully) after changes.
- Framework in use: DEFAULT_TO_DEV.

## Open questions & assumptions

- Mobile screens not yet provided — assume mobile work is fully on hold.
- Specific design system, color palette, and typography not yet documented; infer from supplied screens as they arrive.
- Accessibility requirements (focus management, ARIA, contrast) not yet specified — assume standard expectations until stated.