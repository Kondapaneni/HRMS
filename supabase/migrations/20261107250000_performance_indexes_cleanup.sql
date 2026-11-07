-- Improve lookup and referential-integrity performance for origination activities.
-- The assigned_to foreign key is queried by user/assignee workflows but had no
-- leading-column index. Keep the remaining employee trigram indexes and remove
-- only four exact duplicate definitions; no unused non-duplicate indexes are dropped.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_loan_activities_assigned_to
    ON public.origination_activities (assigned_to);

DROP INDEX IF EXISTS public.idx_emp_code_trgm;
DROP INDEX IF EXISTS public.idx_emp_firstname_trgm;
DROP INDEX IF EXISTS public.idx_emp_lastname_trgm;
DROP INDEX IF EXISTS public.idx_emp_email_trgm;

COMMIT;
