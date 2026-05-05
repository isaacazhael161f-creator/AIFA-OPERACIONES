
const SUPABASE_URL = (window.APP_CONFIG && window.APP_CONFIG.SUPABASE_URL) || 'https://fgstncvuuhpgyzmjceyr.supabase.co';
const SUPABASE_ANON_KEY = (window.APP_CONFIG && window.APP_CONFIG.SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnc3RuY3Z1dWhwZ3l6bWpjZXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzQ0NDQsImV4cCI6MjA4MTQ1MDQ0NH0.YEDIKuWt5iKUEI0BAvidINUz0aZBvQM0h6XRJ-uslB8';

// Initialize client if UMD `window.supabase` is present (script loaded before this file)
if (typeof window !== 'undefined') {
	try {
		if (window.supabase && !window.supabaseClient) {
			window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
			console.log('Supabase client initialized (UMD).');
		}
	} catch (err) {
		console.error('Error initializing Supabase (UMD):', err);
	}
}

// Ensure function to initialize client (returns the client)
window.ensureSupabaseClient = async function ensureSupabaseClient() {
	if (window.supabaseClient) return window.supabaseClient;
	// If UMD supabase is available, use it
	if (typeof window !== 'undefined' && window.supabase) {
		window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
		return window.supabaseClient;
	}
	// Fallback: dynamic ESM import
	try {
		const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
		const createClient = mod.createClient || mod.default?.createClient || mod.createClient;
		if (!createClient) throw new Error('createClient not found in ESM bundle');
		window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
		console.log('Supabase client initialized (ESM).');
		return window.supabaseClient;
	} catch (err) {
		console.error('Failed to initialize Supabase client:', err);
		throw err;
	}
};
