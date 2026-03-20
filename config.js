// Supabase Configuration
// ⚠️ مهم: استبدل القيم التالية بقيمك الخاصة من Supabase

const SUPABASE_CONFIG = {
    // ضع هنا Project URL من Supabase
    url: 'https://murxgxltykedgxbndbrs.supabase.co',
    
    // ضع هنا anon public key من Supabase
    anonKey: 'YOUR_ANON_KEY_HERE'
};

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Export for use in app.js
window.supabaseClient = supabaseClient;
