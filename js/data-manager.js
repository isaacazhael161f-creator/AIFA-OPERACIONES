class DataManager {
    constructor() {
        this.isAdmin = false; // Will be set based on auth
    }

    get client() {
        return window.supabaseClient;
    }

    async checkAuth() {
        const { data: { session } } = await this.client.auth.getSession();
        if (session) {
            // Check role or just assume authenticated user is admin/editor for now
            // In a real app, we'd check a 'profiles' table or custom claims
            this.isAdmin = true;
            document.body.classList.add('is-admin');
            window.dispatchEvent(new CustomEvent('admin-mode-changed', { detail: { isAdmin: true } }));
        } else {
            this.isAdmin = false;
            document.body.classList.remove('is-admin');
            window.dispatchEvent(new CustomEvent('admin-mode-changed', { detail: { isAdmin: false } }));
        }
        return this.isAdmin;
    }

    // --- Operations Summary ---
    async getOperationsSummary(year) {
        let query = this.client.from('operations_summary').select('*');
        if (year) query = query.eq('year', year);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async updateOperationsSummary(id, updates) {
        const { data, error } = await this.client
            .from('operations_summary')
            .update(updates)
            .eq('id', id)
            .select();
        if (error) throw error;
        return data;
    }

    // --- Daily Operations ---
    async getDailyOperations(limit = 100) {
        const { data, error } = await this.client
            .from('daily_operations')
            .select('*')
            .order('date', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    }

    // --- Medical Attentions ---
    async getMedicalAttentions(year) {
        let query = this.client.from('medical_attentions').select('*').order('id', { ascending: true });
        if (year) query = query.eq('year', year);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    // --- Wildlife Incidents ---
    async getWildlifeIncidents(limit = 100) {
        const { data, error } = await this.client
            .from('wildlife_incidents')
            .select('*')
            .order('date', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    }

    // --- Flight Itinerary ---
    async getFlightItinerary() {
        const { data, error } = await this.client
            .from('flight_itinerary')
            .select('*')
            .order('arrival_date', { ascending: true });
        if (error) throw error;
        return data;
    }

    // --- Delays ---
    async getDelays(year, month) {
        let query = this.client.from('delays').select('*');
        if (year) query = query.eq('year', year);
        if (month) query = query.eq('month', month);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    // --- Punctuality ---
    async getPunctuality(year, month) {
        let query = this.client.from('punctuality').select('*');
        if (year) query = query.eq('year', year);
        if (month) query = query.eq('month', month);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    // --- Weekly Frequencies ---
    async getWeeklyFrequencies(weekLabel) {
        let query = this.client.from('weekly_frequencies')
            .select('*')
            .order('valid_from', { ascending: false })
            .order('route_id', { ascending: true })
            .order('airline', { ascending: true });
            
        if (weekLabel) {
            query = query.eq('week_label', weekLabel);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async getWeeklyFrequenciesInt(weekLabel) {
        let query = this.client.from('weekly_frequencies_int')
            .select('*')
            .order('valid_from', { ascending: false })
            .order('route_id', { ascending: true })
            .order('airline', { ascending: true });
            
        if (weekLabel) {
            query = query.eq('week_label', weekLabel);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    // --- Monthly / Annual Operations ---
    async getMonthlyOperations(year) {
        let query = this.client.from('monthly_operations').select('*').order('year', { ascending: false }).order('month', { ascending: false });
        if (year) query = query.eq('year', year);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async getAnnualOperations(year) {
        let query = this.client.from('annual_operations').select('*').order('year', { ascending: false });
        if (year) query = query.eq('year', year);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }
    
    async upsertAnnualOperation(year, data) {
        const existing = await this.getAnnualOperations(year);
        if (existing && existing.length > 0) {
            const id = existing[0].id;
            return this.updateTable('annual_operations', id, data);
        } else {
            return this.insertTable('annual_operations', { year, ...data });
        }
    }

    // Generic update
    async updateTable(table, id, updates) {
        const { data, error } = await this.client
            .from(table)
            .update(updates)
            .eq('id', id)
            .select();
        if (error) throw error;
        return data;
    }

    async insertTable(table, row) {
        const { data, error } = await this.client
            .from(table)
            .insert(row)
            .select();
        if (error) throw error;
        return data;
    }

    async deleteTable(table, id) {
        const { error } = await this.client
            .from(table)
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    }

    async loadAirportsCatalog() {
        if (this.airportsCatalog) return this.airportsCatalog;
        try {
            const response = await fetch('data/master/airports.csv');
            const text = await response.text();
            const lines = text.split('\n').filter(l => l.trim());
            const headers = lines[0].split(',').map(h => h.trim());
            
            this.airportsCatalog = lines.slice(1).map(line => {
                // Handle CSV parsing (simple split, assuming no commas in values for now or simple quotes)
                // A robust parser would be better but for this specific file simple split might suffice if no quoted commas
                const values = line.split(','); 
                const entry = {};
                headers.forEach((h, i) => entry[h] = values[i] ? values[i].trim() : '');
                return entry;
            });
            return this.airportsCatalog;
        } catch (e) {
            console.error('Error loading airports catalog:', e);
            return [];
        }
    }

    getMexicanState(iata) {
        const mapping = {
            'ACA': 'Guerrero', 'AGU': 'Aguascalientes', 'BJX': 'Guanajuato', 'CEN': 'Sonora', 'CJS': 'Chihuahua',
            'CME': 'Campeche', 'CPE': 'Campeche', 'CTM': 'Quintana Roo', 'CUL': 'Sinaloa', 'CUN': 'Quintana Roo',
            'CUU': 'Chihuahua', 'CVM': 'Tamaulipas', 'CYW': 'Guanajuato', 'CZM': 'Quintana Roo', 'DGO': 'Durango',
            'GDL': 'Jalisco', 'GYM': 'Sonora', 'HMO': 'Sonora', 'HUX': 'Oaxaca', 'ICD': 'Baja California',
            'IZT': 'Oaxaca', 'JJC': 'Estado de México', 'LAP': 'Baja California Sur', 'LMM': 'Sinaloa',
            'LTO': 'Baja California Sur', 'MAM': 'Tamaulipas', 'MEX': 'Ciudad de México', 'MID': 'Yucatán',
            'MLM': 'Michoacán', 'MTT': 'Veracruz', 'MTY': 'Nuevo León', 'MXL': 'Baja California', 'MZT': 'Sinaloa',
            'NLD': 'Tamaulipas', 'NLU': 'Estado de México', 'OAX': 'Oaxaca', 'PAZ': 'Veracruz', 'PBC': 'Puebla',
            'PCA': 'Hidalgo', 'PDS': 'Coahuila', 'PPE': 'Sonora', 'PQM': 'Chiapas', 'PVR': 'Jalisco',
            'PXM': 'Oaxaca', 'QRO': 'Querétaro', 'REX': 'Tamaulipas', 'SJD': 'Baja California Sur',
            'SLP': 'San Luis Potosí', 'SLW': 'Coahuila', 'TAM': 'Tamaulipas', 'TAP': 'Chiapas', 'TGZ': 'Chiapas',
            'TIJ': 'Baja California', 'TLC': 'Estado de México', 'TPQ': 'Nayarit', 'TQO': 'Quintana Roo',
            'TRC': 'Coahuila', 'UPN': 'Michoacán', 'VER': 'Veracruz', 'VSA': 'Tabasco', 'ZCL': 'Zacatecas',
            'ZIH': 'Guerrero', 'ZLO': 'Colima'
        };
        return mapping[iata] || '';
    }

    // --- Punctuality Stats ---
    async getPunctualityStats(month, year) {
        let query = this.client.from('punctuality_stats').select('*').order('airline', { ascending: true });
        
        // Fix: Ensure month is treated correctly regardless of string/number type in DB
        // The UI sends '11', '12', check if usage is correct.
        if (month && month !== '') query = query.eq('month', month);
        if (year && year !== '') query = query.eq('year', year);
        
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async addPunctualityStat(stat) {
        const { data, error } = await this.client
            .from('punctuality_stats')
            .insert(stat)
            .select();
        if (error) throw error;
        return data;
    }

    async updatePunctualityStat(id, updates) {
        const { data, error } = await this.client
            .from('punctuality_stats')
            .update(updates)
            .eq('id', id)
            .select();
        if (error) throw error;
        return data;
    }

    async deletePunctualityStat(id) {
        const { data, error } = await this.client
            .from('punctuality_stats')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return data;
    }
}

window.dataManager = new DataManager();
