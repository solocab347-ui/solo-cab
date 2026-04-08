
-- Table for anonymous VoIP call sessions
CREATE TABLE public.call_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL,
  room_id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  caller_id UUID NOT NULL,
  caller_type TEXT NOT NULL CHECK (caller_type IN ('client', 'driver')),
  receiver_id UUID NOT NULL,
  receiver_type TEXT NOT NULL CHECK (receiver_type IN ('client', 'driver')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended', 'missed', 'rejected')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by ride
CREATE INDEX idx_call_sessions_ride_id ON public.call_sessions(ride_id);
CREATE INDEX idx_call_sessions_receiver ON public.call_sessions(receiver_id, status);
CREATE INDEX idx_call_sessions_caller ON public.call_sessions(caller_id, status);

-- Enable RLS
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

-- Participants can view their own call sessions
CREATE POLICY "Participants can view call sessions"
  ON public.call_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Authenticated users can create call sessions
CREATE POLICY "Authenticated users can create call sessions"
  ON public.call_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = caller_id);

-- Participants can update call sessions (accept, reject, end)
CREATE POLICY "Participants can update call sessions"
  ON public.call_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Enable realtime for call signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;

-- Auto-update updated_at
CREATE TRIGGER update_call_sessions_updated_at
  BEFORE UPDATE ON public.call_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
