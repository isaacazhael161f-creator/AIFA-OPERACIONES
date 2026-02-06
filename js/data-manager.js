class DataManager {
    constructor() {
        this.isAdmin = false; // Will be set based on auth
        // Listen for session changes to re-check
        if (this.client) {
            this.client.auth.onAuthStateChange((event, session) => {
                this.checkAuth().catch(console.error);
            });
        }
    }

    get client() {
        return window.supabaseClient;
    }

    async checkAuth() {
        const { data: { session } } = await this.client.auth.getSession();
        if (session) {
            // Check role in user_roles table
            try {
                const { data: roleData, error } = await this.client
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', session.user.id)
                    .single();

                this.userEmail = session.user.email; // Store email for history logs

                if (roleData && ['admin', 'editor', 'superadmin', 'control_fauna', 'servicio_medico'].includes(roleData.role)) {
                    this.isAdmin = true;
                    this.userRole = roleData.role;
                } else {
                    this.isAdmin = false;
                    this.userRole = roleData ? roleData.role : null; // Keep role even if not admin, useful for UI checks
                }
            } catch (e) {
                console.error('Error checking role:', e);
                this.isAdmin = false;
                this.userRole = null;
            }
        } else {
            this.isAdmin = false;
            this.userRole = null;
        }

        // Apply visual state
        document.body.classList.toggle('is-admin', this.isAdmin);

        // Dispatch detailed event for AdminUI
        window.dispatchEvent(new CustomEvent('admin-mode-changed', {
            detail: {
                isAdmin: this.isAdmin,
                role: this.userRole,
                timestamp: Date.now()
            }
        }));

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

    async getMedicalTypes(year) {
        let query = this.client.from('medical_types').select('*').order('id', { ascending: true });
        if (year) query = query.eq('year', year);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async getMedicalDirectory() {
        const { data, error } = await this.client
            .from('medical_directory')
            .select('*')
            // Sort by order_index first, then by Creation date
            .order('order_index', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: true });
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

    async getWeeklyFrequenciesCargo(weekLabel) {
        let query = this.client.from('weekly_frequencies_cargo')
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
    async updateTable(table, id, updates, pkField = 'id') {
        let query = this.client.from(table).update(updates);

        if (pkField === null && typeof id === 'object') {
            query = query.match(id);
        } else {
            query = query.eq(pkField, id);
        }

        const { data, error } = await query.select();
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

    async deleteTable(table, id, pkField = 'id') {
        let query = this.client.from(table).delete();

        if (pkField === null && typeof id === 'object') {
            // Composite key delete using match
            query = query.match(id);
        } else {
            // Standard key delete
            query = query.eq(pkField, id);
        }

        const { data, error } = await query.select();
        if (error) throw error;
        
        // If data is empty, it means no rows were deleted (due to ID mismatch or RLS)
        // NOTE: For 'wildlife_strikes' specifically, the ID type (String vs Int) matters. 
        // Supabase usually handles it, but if it doesn't, we might need to cast.
        // Also, if the user didn't refresh the page after applying RLS fix, the token might be stale? No, RLS is DB side.
        
        if (!data || data.length === 0) {
             console.warn(`Delete ${table} id=${JSON.stringify(id)} returned 0 rows.`);
             
             // Check if it's likely a permission issue
             if (this.isAdmin) {
                 throw new Error(`Permisos insuficientes en base de datos para borrar en "${table}". Ejecute el script "fix_fauna_permissions_final.sql" en Supabase.`);
             } else {
                 throw new Error("No se pudo eliminar el registro (verifique permisos o si ya fue eliminado).");
             }
        }
        
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

    // --- Wildlife Strikes ---
    async getWildlifeStrikes() {
        // Fetch all, ordered by date desc
        const { data, error } = await this.client
            .from('wildlife_strikes')
            .select('*')
            .order('date', { ascending: false });
        if (error) throw error;
        return data;
    }

    async addWildlifeStrike(item) {
        const { data, error } = await this.client
            .from('wildlife_strikes')
            .insert(item)
            .select();
        if (error) throw error;
        return data;
    }

    async updateWildlifeStrike(id, updates) {
        const { data, error } = await this.client
            .from('wildlife_strikes')
            .update(updates)
            .eq('id', id)
            .select();
        if (error) throw error;
        return data;
    }

    async deleteWildlifeStrike(id) {
        const { data, error } = await this.client
            .from('wildlife_strikes')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return data;
    }

    // --- Rescued Wildlife ---
    async getRescuedWildlife() {
        const { data, error } = await this.client
            .from('rescued_wildlife')
            .select('*')
            .order('date', { ascending: false });
        if (error) throw error;
        return data;
    }

    async addRescuedWildlife(item) {
        const { data, error } = await this.client
            .from('rescued_wildlife')
            .insert(item)
            .select();
        if (error) throw error;
        return data;
    }

    async updateRescuedWildlife(id, updates) {
        const { data, error } = await this.client
            .from('rescued_wildlife')
            .update(updates)
            .eq('id', id)
            .select();
        if (error) throw error;
        return data;
    }

    async deleteRescuedWildlife(id) {
        const { data, error } = await this.client
            .from('rescued_wildlife')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return data;
    }

    // --- Library ---
    async getLibraryCategories() {
        const { data, error } = await this.client
            .from('library_categories')
            .select('*')
            .order('order_index', { ascending: true });
        if (error) throw error;
        return data;
    }

    async getLibraryItems() {
        const { data, error } = await this.client
            .from('library_items')
            .select('*')
            .order('order_index', { ascending: true });
        if (error) throw error;
        return data;
    }
}

window.dataManager = new DataManager();
