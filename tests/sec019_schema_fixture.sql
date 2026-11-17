\set ON_ERROR_STOP on
-- Disposable fixture representing only confirmed SEC-019 relevant columns.
CREATE TABLE public.users (id uuid PRIMARY KEY);
CREATE TABLE public.employee (
 id uuid PRIMARY KEY,
 "employeeId" varchar(50) NOT NULL UNIQUE,
 "userId" uuid REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE TABLE public.payslips (
 id uuid PRIMARY KEY, "employeeId" uuid REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE TABLE public.attendance (
 id uuid PRIMARY KEY, "employeeId" uuid REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE TABLE public.leaves (
 id uuid PRIMARY KEY, "employeeId" uuid REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE TABLE public.loan_applications (
 id uuid PRIMARY KEY, application_id varchar(50) UNIQUE
);
CREATE TABLE public.loan_application_audit_logs (
 id uuid PRIMARY KEY, application_id varchar(50) NOT NULL,
 loan_application_id uuid, editor_user_id uuid
);
-- Intentionally NOT applying a loan_documents FK: historical values can refer
-- to legacy identifiers and require separate application-path reconciliation.
CREATE TABLE public.loan_documents (
 id uuid PRIMARY KEY, application_id varchar(50) NOT NULL
);
INSERT INTO public.users(id) VALUES ('11111111-1111-4111-8111-111111111111');
INSERT INTO public.employee(id,"employeeId","userId") VALUES
 ('22222222-2222-4222-8222-222222222222','EMP-LEGACY','11111111-1111-4111-8111-111111111111');
INSERT INTO public.payslips VALUES
 ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111');
INSERT INTO public.attendance VALUES
 ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111');
INSERT INTO public.leaves VALUES
 ('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111');
INSERT INTO public.loan_applications VALUES
 ('66666666-6666-4666-8666-666666666666','LN-EXISTING');
INSERT INTO public.loan_application_audit_logs VALUES
 ('77777777-7777-4777-8777-777777777777','LN-EXISTING',
 '66666666-6666-4666-8666-666666666666',
 '11111111-1111-4111-8111-111111111111');
