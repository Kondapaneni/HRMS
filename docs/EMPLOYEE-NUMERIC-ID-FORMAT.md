# Eight-digit numeric employee IDs (owner-requested format)

## Display code
New employees receive **exactly eight decimal digits** such as `48392017`.
There is no `EMP-` prefix, no letters, and no leading zero. The server
generates the code using PHP's cryptographically secure `random_int()` across
the inclusive range `10000000` to `99999999`.

## Identity and authorization remain unchanged
`public.employee."employeeId"` remains `varchar(50) NOT NULL UNIQUE`.
It is a **human-facing label only**, not a password, access token,
authorization key, or substitute for the `employee.id` / `users.id` UUID.
Never authorize a request solely by knowing the eight-digit display number.

The eight-digit space has **90 million** possibilities (about 26.4 bits,
far less than the previous 128-bit code). Codes can be guessed or collide:
the existing database unique constraint enforces uniqueness. Both Admin
employee creation and candidate conversion use
`ON CONFLICT ON CONSTRAINT "employee_employeeId_key" DO NOTHING RETURNING id`
and retry at most 12 times. Unrelated database errors fail the entire
transaction rather than silently producing a duplicate account, partial
conversion or invitation.

## Backward compatibility
Existing historical IDs are unchanged, including any 36-character
`EMP-...` record created under SEC-019. They remain searchable/displayable;
only **new** employee IDs use eight digits. No schema migration or data reset
is necessary. Numeric codes must remain strings in APIs and exports.

## Validation
- PHP source and generator format/collision/exhaustion tests
- PostgreSQL 16/17 isolated unique-constraint collision tests
- Existing SEC-019 integrity and previous security regression workflows
- Post-deployment read-only DB check and one controlled Admin creation test

This owner-preference change is separate from the already merged SEC-019
squash commit. It does not expand any authorization permissions.
