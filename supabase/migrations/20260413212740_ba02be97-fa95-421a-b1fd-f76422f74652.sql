UPDATE public.notifications
SET message = REPLACE(message, 'Commission:', 'Frais:')
WHERE message LIKE '%Commission:%';

UPDATE public.notifications
SET message = REPLACE(message, 'Commission ', 'Frais ')
WHERE message LIKE '%Commission %' AND message NOT LIKE '%rétribution%';