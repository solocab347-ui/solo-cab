import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z, parseBody, jsonResponse, corsHeaders, Email, Password } from '../_shared/validation.ts';

const LoginSchema = z.object({
  email: Email,
  password: Password,
});

// Simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): { allowed: boolean; response?: Response } {
  const now = Date.now();
  const limit = rateLimiter.get(ip);
  
  if (limit && now < limit.resetTime) {
    if (limit.count >= 5) {
      return {
        allowed: false,
        response: new Response(
          JSON.stringify({ success: false, error: 'Trop de tentatives. Réessayez dans une minute.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        ),
      };
    }
    limit.count++;
  } else {
    rateLimiter.set(ip, { count: 1, resetTime: now + 60000 });
  }
  
  return { allowed: true };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apply rate limiting: 5 attempts per minute per IP
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitResult = checkRateLimit(ip);
  if (!rateLimitResult.allowed) {
    console.log('🚫 Rate limit exceeded for:', ip);
    return rateLimitResult.response!;
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const parsed = await parseBody(req, LoginSchema);
    if (!parsed.ok) return parsed.response;
    const { email, password } = parsed.data;

    console.log('Login attempt for:', email);

    // Authenticate user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email ou mot de passe incorrect' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Utilisateur non trouvé' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user profile with roles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone, roles, profile_photo_url')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erreur lors de la récupération du profil' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Login successful for:', email, 'Roles:', profile.roles);

    // Return user data with JWT token
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          phone: profile.phone,
          roles: profile.roles || [],
          profile_photo_url: profile.profile_photo_url,
        },
        token: authData.session.access_token,
        session: authData.session,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erreur serveur' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
