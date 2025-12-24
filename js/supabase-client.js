
// Allow overriding from index.html via `window.APP_CONFIG = { SUPABASE_URL, SUPABASE_ANON_KEY }`.
const SUPABASE_URL = (window.APP_CONFIG && window.APP_CONFIG.SUPABASE_URL) || 'https://fgstncvuuhpgyzmjceyr.supabase.co';
const SUPABASE_ANON_KEY = (window.APP_CONFIG && window.APP_CONFIG.SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnc3RuY3Z1dWhwZ3l6bWpjZXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzQ0NDQsImV4cCI6MjA4MTQ1MDQ0NH0.YEDIKuWt5iKUEI0BAvidINUz0aZBvQM0h6XRJ-uslB8';

// Provide a safe initializer that does not redeclare a global `supabase` identifier.
// Expose `window.ensureSupabaseClient()` which returns the initialized client or null.
window.ensureSupabaseClient = async function ensureSupabaseClient(options = {}) {
	const maxRetries = options.maxRetries || 3;
	const baseDelay = options.baseDelay || 700;
	function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

	if (window.supabaseClient) return window.supabaseClient;

	// If the UMD bundle already set `window.supabase`, use it without declaring a local name
	if (window.supabase && typeof window.supabase.createClient === 'function') {
		try {
			const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
			window.supabaseClient = client;
			console.info('Supabase client initialized from window.supabase');
			return client;
		} catch (err) {
			console.warn('Error initializing Supabase from window.supabase:', err);
		}
	}

	// Dynamic import fallback (ESM) with retries
	let attempt = 0;
	while (attempt < maxRetries) {
		attempt += 1;
		try {
			const url = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
			const mod = await import(url);
			const createClient = mod.createClient || (mod.supabase && mod.supabase.createClient);
			if (typeof createClient === 'function') {
				const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
				window.supabaseClient = client;
				console.info(`Supabase client initialized via dynamic import (attempt ${attempt})`);
				return client;
			}
		} catch (err) {
			console.warn(`Supabase dynamic import attempt ${attempt} failed:`, err);
			if (attempt < maxRetries) await sleep(baseDelay * Math.pow(2, attempt - 1));
		}
	}

	console.warn('Could not initialize Supabase client; window.supabaseClient is null');
	window.supabaseClient = null;
	return null;
};

// Non-blocking auto-init (other modules can call ensureSupabaseClient explicitly)
window.ensureSupabaseClient().catch(() => {});
