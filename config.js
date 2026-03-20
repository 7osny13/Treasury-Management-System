// Supabase Configuration
// ⚠️ مهم: استبدل القيم التالية بقيمك الخاصة من Supabase

const SUPABASE_CONFIG = {
    // ضع هنا Project URL من Supabase
    url: 'https://murxgxltykedgxbndbrs.supabase.co',
    
    // ضع هنا anon public key من Supabase
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11cnhneGx0eWtlZGd4Ym5kYnJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NjE2NzEsImV4cCI6MjA4MzIzNzY3MX0.-vy4dVSHX9ViW4XKYZlY3qNprVH8TyfFB0LjAf8kn4s'
};

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Export for use in app.js
window.supabaseClient = supabaseClient;
