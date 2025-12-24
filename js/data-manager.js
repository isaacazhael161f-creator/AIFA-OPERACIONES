class DataManager {
    constructor() {
        this.isAdmin = false; // Will be set based on auth
    }

    // Resolve the client dynamically to support async initialization
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

    // --- Daily Operations Breakdown (Resumen Parte Operaciones) ---
    async getDailyOperationsBreakdown() {
        try {
            const { data, error } = await this.client
                .from('daily_operations_breakdown')
                .select('*')
                .order('date', { ascending: true });
            
            if (error) {
                console.warn('Error fetching daily_operations_breakdown from DB, falling back to JSON:', error);
                throw error;
            }
            
            return data;
        } catch (err) {
            console.error('Error in getDailyOperationsBreakdown:', err);
            // Fallback to JSON if DB fails or table doesn't exist yet
            const response = await fetch('data/resumen_parte_operaciones.json', { cache: 'no-store' });
            const json = await response.json();
            
            // Transform JSON to flat list to match DB format if needed, 
            // OR just return the JSON and let the consumer handle it.
            // But to be consistent, the consumer should expect one format.
            // However, the consumer currently expects the JSON format.
            // So maybe I should transform the DB result to the JSON format HERE?
            // No, let's return the raw data and let the consumer adapt.
            // Wait, if I return JSON here, it's the nested structure.
            // If I return DB data, it's a flat list.
            // I should probably standardize on the consumer side or here.
            // Let's return the raw DB data (flat list) here.
            // If fallback happens, I should probably flatten the JSON to match DB format?
            // Or better: The consumer `loadParteOperacionesSummary` in script.js currently expects JSON.
            // I will modify `loadParteOperacionesSummary` to handle both or prefer DB format.
            
            // For now, let's just return null or throw if DB fails, and let script.js handle the fallback logic 
            // (which it already has somewhat, but I'll improve it).
            // Actually, the existing code in script.js fetches JSON directly.
            // I will change script.js to call this method.
            
            // If I return the JSON here, I should probably return it as is, 
            // and let script.js decide how to process it.
            // But `daily_operations_breakdown` is a specific table structure.
            
            // Let's just return the data or throw.
            throw err;
        }
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

    // --- Wildlife Incidents ---
    async getWildlifeIncidents(limit = 1000) {
        try {
            const { data, error } = await this.client
                .from('wildlife_strikes')
                .select('*')
                .order('date', { ascending: false })
                .limit(limit);
            
            if (error) {
                console.warn('Error fetching wildlife strikes from DB, falling back to JSON:', error);
                throw error;
            }

            if (data && data.length > 0) {
                // Map DB columns to JSON keys (Spanish) for compatibility
                return data.map(item => {
                    // Format date YYYY-MM-DD to DD/MM/YYYY
                    let fecha = '';
                    if (item.date) {
                        const [y, m, d] = item.date.split('-');
                        fecha = `${d}/${m}/${y}`;
                    }
                    // Format time HH:MM:SS to HH:MM
                    let hora = '';
                    if (item.time) {
                        hora = item.time.substring(0, 5);
                    }

                    return {
                        ...item, // Keep original DB columns for Admin UI
                        "No.": String(item.id),
                        "Fecha": fecha,
                        "Hora": hora,
                        "Ubicación": item.location,
                        "Zona de impacto": item.impact_zone,
                        "Fase de la operación": item.operation_phase,
                        "Aerolineas": item.airline,
                        "Aeronave": item.aircraft,
                        "Matricula": item.registration,
                        "Zona de impacto resto": item.remains_impact_zone,
                        "Cantidad de restos": item.remains_quantity,
                        "Tamaño": item.size,
                        "Especie": item.species,
                        "Nombre común": item.common_name,
                        "Personal que reporta": item.reporter,
                        "Medidas proactivas": item.proactive_measures,
                        "Condiciones meteorológicas": item.weather_conditions,
                        "Resultados de las medidas": item.results
                    };
                });
            } else {
                console.log('No wildlife data in DB, loading from JSON');
                const response = await fetch('data/fauna.json');
                return await response.json();
            }
        } catch (err) {
            console.error('Error in getWildlifeIncidents:', err);
            const response = await fetch('data/fauna.json');
            return await response.json();
        }
    }

    // --- Rescued Wildlife ---
    async getRescuedWildlife() {
        try {
            const { data, error } = await this.client
                .from('rescued_wildlife')
                .select('*')
                .order('date', { ascending: false });

            if (error) {
                console.warn('Error fetching rescued wildlife from DB, falling back to JSON:', error);
                throw error;
            }

            if (data && data.length > 0) {
                // Map DB fields to JSON structure expected by frontend
                // Group by year as the original JSON structure is {"2022": [...], "2025": [...]}
                // But wait, the frontend might expect the raw array or the grouped object depending on how it's used.
                // Let's check js/fauna.js to see how it consumes this data.
                // For now, I'll return the mapped array and let the consumer handle grouping if needed, 
                // OR I can replicate the structure if I know it.
                // Let's assume for now we return the flat list and I'll check js/fauna.js next.
                
                return data.map(item => {
                    // Format date back to DD/MM/YYYY
                    let dateStr = '';
                    if (item.date) {
                        const [y, m, d] = item.date.split('-');
                        dateStr = `${d}/${m}/${y}`;
                    }
                    
                    // Format time to HH:MM
                    let timeStr = '';
                    if (item.time) {
                        timeStr = item.time.substring(0, 5);
                    }

                    return {
                        ...item, // Keep original DB columns for Admin UI
                        "No. captura": item.capture_number,
                        "Fecha": dateStr,
                        "Hora": timeStr,
                        "Mes": item.month,
                        "Clase": item.class,
                        "Nombre común": item.common_name,
                        "Nombre científico": item.scientific_name,
                        "No. individuos": item.quantity,
                        "Método de captura": item.capture_method,
                        "Cuadrante": item.quadrant,
                        "Disposición final": item.final_disposition,
                        "Año": item.year
                    };
                });
            } else {
                console.log('No rescued wildlife data in DB, loading from JSON');
                const response = await fetch('data/fauna_rescatada.json');
                return await response.json();
            }
        } catch (err) {
            console.error('Error in getRescuedWildlife:', err);
            const response = await fetch('data/fauna_rescatada.json');
            return await response.json();
        }
    }

    // --- Delays ---
    async getDelays(year, month) {
        try {
            let query = this.client.from('delays').select('*');
            if (year) query = query.eq('year', year);
            if (month) query = query.eq('month', month);
            
            const { data, error } = await query;
            
            if (error) {
                console.warn('Error fetching delays from DB, falling back to JSON:', error);
                throw error;
            }

            if (data && data.length > 0) {
                // Group by period (year-month)
                const periodsMap = {};
                data.forEach(item => {
                    const key = `${item.year}-${item.month}`;
                    if (!periodsMap[key]) {
                        periodsMap[key] = {
                            year: item.year,
                            periodo: `${item.month} ${item.year}`,
                            causas: []
                        };
                    }
                    periodsMap[key].causas.push({
                        causa: item.cause,
                        demoras: item.count,
                        descripcion: item.description,
                        incidentes: item.incidents || [],
                        observaciones: item.observations || ''
                    });
                });
                
                return { periods: Object.values(periodsMap) };
            } else {
                console.log('No delays data in DB, loading from JSON');
                const response = await fetch('data/demoras.json');
                return await response.json();
            }
        } catch (err) {
            console.error('Error in getDelays:', err);
            const response = await fetch('data/demoras.json');
            return await response.json();
        }
    }

    // --- Punctuality ---
    async getPunctuality(year, month) {
        try {
            let query = this.client.from('punctuality_stats').select('*');
            if (year) query = query.eq('year', year);
            if (month) query = query.eq('month', month);
            
            const { data, error } = await query;
            
            if (error) {
                console.warn('Error fetching punctuality from DB, falling back to JSON:', error);
                throw error;
            }

            if (data && data.length > 0) {
                // Calculate percentage for compatibility if not stored or just to be safe
                return data.map(item => ({
                    ...item,
                    categoria: item.category, // Map for frontend compatibility
                    aerolinea: item.airline,
                    a_tiempo: item.on_time,
                    demora: item.delayed,
                    cancelado: item.cancelled,
                    total: item.total_flights,
                    puntualidad: item.total_flights > 0 
                        ? Math.round((item.on_time / item.total_flights) * 100) + '%' 
                        : '0%'
                }));
            } else {
                // Fallback to JSON if DB is empty (optional, but good for transition)
                console.log('No punctuality data in DB, loading from JSON');
                const response = await fetch('data/puntualidad.json');
                return await response.json();
            }
        } catch (err) {
            console.error('Error in getPunctuality:', err);
            // Final fallback
            const response = await fetch('data/puntualidad.json');
            return await response.json();
        }
    }

    // --- Aviation Analytics ---
    async getAviationAnalytics() {
        const { data, error } = await this.client
            .from('aviation_analytics')
            .select('*');
        if (error) throw error;
        return data;
    }

    // --- Flight Itinerary ---
    async getFlightItinerary(date) {
        let query = this.client.from('flight_itinerary').select('*');
        
        // If date is provided, filter by arrival OR departure date matching that date
        if (date) {
            query = query.or(`arrival_date.eq.${date},departure_date.eq.${date}`);
        }
        
        const { data, error } = await query;
        if (error) throw error;

        // Transform to match the format expected by itinerario.js
        return data.map(row => ({
            id: row.id,
            vuelo: row.flight_number,
            aerolinea: row.airline,
            origen: row.origin,
            destino: row.destination,
            fecha_llegada: this.formatDateToDMY(row.arrival_date),
            hora_llegada: this.formatTimeToHM(row.arrival_time),
            fecha_salida: this.formatDateToDMY(row.departure_date),
            hora_salida: this.formatTimeToHM(row.departure_time),
            estatus: row.status,
            sala: row.gate,
            terminal: row.terminal,
            categoria: row.category
        }));
    }

    formatDateToDMY(isoDate) {
        if (!isoDate) return '';
        const [y, m, d] = isoDate.split('-');
        return `${d}/${m}/${y}`;
    }

    formatTimeToHM(isoTime) {
        if (!isoTime) return '';
        return isoTime.substring(0, 5);
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
