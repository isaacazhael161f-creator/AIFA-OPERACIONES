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
}

window.dataManager = new DataManager();
