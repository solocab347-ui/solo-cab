
-- Complete all 20 test courses to trigger financial records
UPDATE courses SET status = 'completed'
WHERE pickup_address LIKE 'Test %' 
AND (pickup_address LIKE '%Abdallah%' OR pickup_address LIKE '%Alexandre%')
AND status = 'accepted';
