-- Create enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'driver', 'client');
CREATE TYPE public.driver_status AS ENUM ('pending', 'validated', 'rejected');
CREATE TYPE public.course_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.devis_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create drivers table
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  license_number TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_plate TEXT,
  status driver_status NOT NULL DEFAULT 'pending',
  validation_date TIMESTAMPTZ,
  bio TEXT,
  rating DECIMAL(3, 2) DEFAULT 0.0,
  total_rides INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create qr_codes table
CREATE TABLE public.qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  scans_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_exclusive BOOLEAN NOT NULL DEFAULT true,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  qr_code_id UUID REFERENCES public.qr_codes(id) ON DELETE SET NULL,
  total_spent DECIMAL(10, 2) DEFAULT 0.0,
  total_rides INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create courses table (supporting both driver_id and driver_ids)
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  driver_ids UUID[],
  pickup_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  pickup_latitude DECIMAL(10, 8),
  pickup_longitude DECIMAL(11, 8),
  destination_latitude DECIMAL(10, 8),
  destination_longitude DECIMAL(11, 8),
  distance_km DECIMAL(10, 2),
  duration_minutes INTEGER,
  scheduled_date TIMESTAMPTZ NOT NULL,
  passengers_count INTEGER NOT NULL DEFAULT 1,
  status course_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create devis table
CREATE TABLE public.devis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL,
  distance_price DECIMAL(10, 2) NOT NULL,
  time_price DECIMAL(10, 2) DEFAULT 0.0,
  status devis_status NOT NULL DEFAULT 'pending',
  valid_until TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create factures table
CREATE TABLE public.factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  devis_id UUID REFERENCES public.devis(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  stripe_payment_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function to get driver_id from user_id
CREATE OR REPLACE FUNCTION public.get_driver_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.drivers WHERE user_id = _user_id
$$;

-- Helper function to get client_id from user_id
CREATE OR REPLACE FUNCTION public.get_client_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.clients WHERE user_id = _user_id
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for drivers
CREATE POLICY "Drivers can view their own profile"
  ON public.drivers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Drivers can update their own profile"
  ON public.drivers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Clients can view their exclusive driver"
  ON public.drivers FOR SELECT
  USING (
    id IN (
      SELECT driver_id FROM public.clients 
      WHERE user_id = auth.uid() AND is_exclusive = true
    )
  );

CREATE POLICY "Admins can manage all drivers"
  ON public.drivers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for qr_codes
CREATE POLICY "Drivers can manage their QR codes"
  ON public.qr_codes FOR ALL
  USING (driver_id = public.get_driver_id(auth.uid()));

CREATE POLICY "Anyone can view active QR codes"
  ON public.qr_codes FOR SELECT
  USING (is_active = true);

-- RLS Policies for clients
CREATE POLICY "Clients can view their own profile"
  ON public.clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Clients can update their own profile"
  ON public.clients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Drivers can view their exclusive clients"
  ON public.clients FOR SELECT
  USING (
    driver_id = public.get_driver_id(auth.uid()) AND is_exclusive = true
  );

CREATE POLICY "Admins can manage all clients"
  ON public.clients FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for courses
CREATE POLICY "Clients can manage their own courses"
  ON public.courses FOR ALL
  USING (client_id = public.get_client_id(auth.uid()));

CREATE POLICY "Drivers can view their assigned courses"
  ON public.courses FOR SELECT
  USING (
    driver_id = public.get_driver_id(auth.uid()) OR
    public.get_driver_id(auth.uid()) = ANY(driver_ids)
  );

CREATE POLICY "Drivers can update their assigned courses"
  ON public.courses FOR UPDATE
  USING (
    driver_id = public.get_driver_id(auth.uid()) OR
    public.get_driver_id(auth.uid()) = ANY(driver_ids)
  );

CREATE POLICY "Admins can manage all courses"
  ON public.courses FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for devis
CREATE POLICY "Clients can view their devis"
  ON public.devis FOR SELECT
  USING (client_id = public.get_client_id(auth.uid()));

CREATE POLICY "Clients can update their devis status"
  ON public.devis FOR UPDATE
  USING (client_id = public.get_client_id(auth.uid()));

CREATE POLICY "Drivers can manage devis for their courses"
  ON public.devis FOR ALL
  USING (driver_id = public.get_driver_id(auth.uid()));

CREATE POLICY "Admins can manage all devis"
  ON public.devis FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for factures
CREATE POLICY "Clients can view their factures"
  ON public.factures FOR SELECT
  USING (client_id = public.get_client_id(auth.uid()));

CREATE POLICY "Drivers can view their factures"
  ON public.factures FOR SELECT
  USING (driver_id = public.get_driver_id(auth.uid()));

CREATE POLICY "Admins can manage all factures"
  ON public.factures FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.qr_codes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.devis FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.factures FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_drivers_user_id ON public.drivers(user_id);
CREATE INDEX idx_drivers_status ON public.drivers(status);
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_clients_driver_id ON public.clients(driver_id);
CREATE INDEX idx_courses_client_id ON public.courses(client_id);
CREATE INDEX idx_courses_driver_id ON public.courses(driver_id);
CREATE INDEX idx_courses_status ON public.courses(status);
CREATE INDEX idx_devis_course_id ON public.devis(course_id);
CREATE INDEX idx_devis_client_id ON public.devis(client_id);
CREATE INDEX idx_devis_driver_id ON public.devis(driver_id);
CREATE INDEX idx_factures_client_id ON public.factures(client_id);
CREATE INDEX idx_factures_driver_id ON public.factures(driver_id);
CREATE INDEX idx_qr_codes_driver_id ON public.qr_codes(driver_id);
CREATE INDEX idx_qr_codes_code ON public.qr_codes(code);