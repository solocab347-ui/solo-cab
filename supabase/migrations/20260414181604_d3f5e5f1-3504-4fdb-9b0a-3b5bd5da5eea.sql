DELETE FROM stripe_transactions WHERE driver_id = 'd0f4960d-1f21-4844-8e91-4251c6ca106f';
DELETE FROM driver_weekly_balances WHERE driver_id = 'd0f4960d-1f21-4844-8e91-4251c6ca106f';
UPDATE drivers SET total_rides = 0, course_counter = 0, fees_balance_cents = 0 WHERE id = 'd0f4960d-1f21-4844-8e91-4251c6ca106f';