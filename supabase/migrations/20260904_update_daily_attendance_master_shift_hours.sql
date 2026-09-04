-- Migration: Update daily_attendance_master to calculate missing checkout hours based on employee shift
-- Run within Supabase pg_cron job daily_attendance_master_job

CREATE OR REPLACE FUNCTION public.daily_attendance_master()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    -- First, proactively insert any weekend/holiday records for TODAY
    PERFORM public.insert_weekend_holiday_attendance();
    
    -- Second, retroactively clean up any missed attendances for the LAST 30 DAYS
    PERFORM public.finalize_attendance();
    
    -- Third, resolve any incomplete check-ins from previous days
    -- Dynamically calculate hours worked up to the employee's individual shift end time
    WITH missing_checkouts AS (
        SELECT 
            a.id,
            CASE 
                WHEN a.status ILIKE '%late%' THEN 'present (late+checkout missing)'
                ELSE 'present (checkout missing)'
            END AS new_status,
            GREATEST(0.00, ROUND(
                EXTRACT(EPOCH FROM (
                    (CASE 
                        WHEN COALESCE(st."endTime", '18:30:00'::time) < COALESCE(st."startTime", '09:45:00'::time)
                        THEN (a.date + INTERVAL '1 day' + COALESCE(st."endTime", '18:30:00'::time))
                        ELSE (a.date + COALESCE(st."endTime", '18:30:00'::time))
                    END) - a."checkIn"
                )) / 3600.0, 2
            )) AS calc_hours
        FROM attendance a
        LEFT JOIN employee e ON (a."employeeId" = e."userId" OR a."employeeId" = e.id)
        LEFT JOIN shift_times st ON e."shiftTime" = st."shiftLabel"
        WHERE a."checkIn" IS NOT NULL
          AND a."checkOut" IS NULL
          AND a.date < CURRENT_DATE
          AND (
              a.status NOT ILIKE '%checkout missing%'
              OR a.hours IS NULL 
              OR a.hours = 0.00
          )
    )
    UPDATE attendance a
    SET status = mc.new_status,
        hours = mc.calc_hours,
        "updatedAt" = CURRENT_TIMESTAMP
    FROM missing_checkouts mc
    WHERE a.id = mc.id;
END;
$function$;
