const FLIGHT_SERVICE_TYPES = {
    "A": { "Category": "Cargo/Mail", "Description": "Cargo/Mail", "Group": "Cargo" },
    "B": { "Category": "Passenger", "Description": "Shuttle Mode", "Group": "Passenger" },
    "C": { "Category": "Passenger", "Description": "Passenger Only", "Group": "Passenger" },
    "D": { "Category": "General Aviation", "Description": "General Aviation", "Group": "Other" },
    "E": { "Category": "Test", "Description": "Test", "Group": "Other" },
    "F": { "Category": "Cargo/Mail", "Description": "Loose Loaded cargo", "Group": "Cargo" },
    "G": { "Category": "Passenger", "Description": "Normal Service", "Group": "Passenger" },
    "H": { "Category": "Cargo/Mail", "Description": "Cargo and /or Mail", "Group": "Cargo" },
    "I": { "Category": "State/Diplomatic", "Description": "State/Diplomatic/Air Ambulance", "Group": "Other" },
    "J": { "Category": "Passenger", "Description": "Normal Service", "Group": "Passenger" },
    "K": { "Category": "Training", "Description": "Training", "Group": "Other" },
    "L": { "Category": "Pax/Cargo/Mail", "Description": "Passenger/Cargo/Mail", "Group": "Mixed" },
    "M": { "Category": "Mail", "Description": "Mail only", "Group": "Cargo" },
    "N": { "Category": "Business Aviation", "Description": "Business Aviation", "Group": "Other" },
    "O": { "Category": "Charter", "Description": "Charter special handling", "Group": "Passenger" },
    "P": { "Category": "Non-revenue", "Description": "Non-revenue (Positioning)", "Group": "Other" },
    "Q": { "Category": "Pax/Cargo", "Description": "Passenger/Cargo in Cabin", "Group": "Mixed" },
    "R": { "Category": "Pax/Cargo", "Description": "Passenger/Cargo in Cabin", "Group": "Mixed" },
    "S": { "Category": "Passenger", "Description": "Shuttle Mode", "Group": "Passenger" },
    "T": { "Category": "Technical", "Description": "Technical Test", "Group": "Other" },
    "U": { "Category": "Surface", "Description": "Surface Vehicle (Pax)", "Group": "Other" },
    "V": { "Category": "Surface", "Description": "Surface Vehicle (Cargo)", "Group": "Other" },
    "W": { "Category": "Military", "Description": "Military", "Group": "Other" },
    "X": { "Category": "Technical", "Description": "Technical Stop", "Group": "Other" },
    "Y": { "Category": "Special", "Description": "Special internal purposes", "Group": "Other" },
    "Z": { "Category": "Special", "Description": "Special internal purposes", "Group": "Other" }
};

// Mapped from 'aircraft type.csv' provided by user
const AIRCRAFT_MAP = {
    // Narrowbodies & Regionals (Groups B, C)
    "E95": { Name: "Embraer 195", Group: "Narrowbody", Class: "C" },
    "ER4": { Name: "Embraer 145", Group: "Regional", Class: "B" },
    "E7W": { Name: "Embraer 175W", Group: "Regional", Class: "C" },
    "E90": { Name: "Embraer 190", Group: "Narrowbody", Class: "C" },
    "E70": { Name: "Embraer 170", Group: "Regional", Class: "C" },
    "E75": { Name: "Embraer 175", Group: "Regional", Class: "C" },
    "CRJ": { Name: "CRJ-Generic", Group: "Regional", Class: "B" },
    "CRK": { Name: "CRJ-1000", Group: "Regional", Class: "C" },
    "M80": { Name: "MD-80", Group: "Narrowbody", Class: "C" },
    "CRA": { Name: "CRJ-700", Group: "Regional", Class: "C" },
    "CNF": { Name: "Cessna 208B", Group: "Light", Class: "B" },
    "CR7": { Name: "CRJ-700", Group: "Regional", Class: "B" },
    "CR9": { Name: "CRJ-900", Group: "Regional", Class: "B" },
    "CR1": { Name: "CRJ-1000", Group: "Regional", Class: "B" },
    "CR2": { Name: "CRJ-200", Group: "Regional", Class: "B" },
    "AT7": { Name: "ATR-72", Group: "Regional", Class: "C" },
    "CES": { Name: "Cessna Generic", Group: "Light", Class: "B" },
    "SF3": { Name: "Saab 340", Group: "Regional", Class: "B" },
    "SW4": { Name: "Swearingen Metroliner", Group: "Regional", Class: "B" },
    "DC9": { Name: "DC-9-33F", Group: "Narrowbody", Class: "C" },
    "SW3": { Name: "Swearingen Aircraft", Group: "Regional", Class: "B" },
    "EM2": { Name: "Embraer 120", Group: "Regional", Class: "B" },
    "F20": { Name: "Falcon 20", Group: "Business Jet", Class: "B" },
    "YA":  { Name: "Saab 340B", Group: "Regional", Class: "B" },

    // B737 Family (Group C)
    "73S": { Name: "B737-700F", Group: "Narrowbody", Class: "C" },
    "73K": { Name: "B737-800F", Group: "Narrowbody", Class: "C" },
    "7M8": { Name: "B737 MAX 8", Group: "Narrowbody", Class: "C" },
    "73C": { Name: "B737-300W", Group: "Narrowbody", Class: "C" },
    "73W": { Name: "B737-700W", Group: "Narrowbody", Class: "C" },
    "7M7": { Name: "B737 MAX 7", Group: "Narrowbody", Class: "C" },
    "73J": { Name: "B737-900", Group: "Narrowbody", Class: "C" },
    "73M": { Name: "B737-200 Combi", Group: "Narrowbody", Class: "C" },
    "73G": { Name: "B737-700", Group: "Narrowbody", Class: "C" },
    "73H": { Name: "B737-800W", Group: "Narrowbody", Class: "C" },
    "7M9": { Name: "B737 MAX 9", Group: "Narrowbody", Class: "C" },
    "7M1": { Name: "B737 MAX 10", Group: "Narrowbody", Class: "C" },
    "737": { Name: "B737-700", Group: "Narrowbody", Class: "C" },
    "738": { Name: "B737-800", Group: "Narrowbody", Class: "C" },
    "735": { Name: "B737-500", Group: "Narrowbody", Class: "C" },
    "736": { Name: "B737-600", Group: "Narrowbody", Class: "C" },
    "733": { Name: "B737-300", Group: "Narrowbody", Class: "C" },
    "734": { Name: "B737-400", Group: "Narrowbody", Class: "C" },
    "731": { Name: "B737-100", Group: "Narrowbody", Class: "C" },
    "732": { Name: "B737-200", Group: "Narrowbody", Class: "C" },
    "7S8": { Name: "B737-800 Scimitar", Group: "Narrowbody", Class: "C" },
    "722": { Name: "B727-200", Group: "Narrowbody", Class: "C" },
    "721": { Name: "B727-100", Group: "Narrowbody", Class: "C" },
    "727": { Name: "B727-200", Group: "Narrowbody", Class: "C" },

    // Airbus A320 Family (Group C)
    "32N": { Name: "A320neo", Group: "Narrowbody", Class: "C" },
    "32Q": { Name: "A321neo", Group: "Narrowbody", Class: "C" },
    "320": { Name: "A320-200", Group: "Narrowbody", Class: "C" },
    "321": { Name: "A321-200", Group: "Narrowbody", Class: "C" },
    "32A": { Name: "A320-200 Ceo", Group: "Narrowbody", Class: "C" },
    "319": { Name: "A319", Group: "Narrowbody", Class: "C" },
    "318": { Name: "A318", Group: "Narrowbody", Class: "C" },

    // Widebodies (Group D, E, F)
    "LOH": { Name: "C-130 Hercules", Group: "Widebody (Military)", Class: "D" },
    "76F": { Name: "B767 Freighter", Group: "Widebody", Class: "D" },
    "739": { Name: "B737-900ER", Group: "Narrowbody", Class: "C" }, // Technically C, but large
    "789": { Name: "B787-9 Dreamliner", Group: "Widebody", Class: "E" },
    "781": { Name: "B787-10 Dreamliner", Group: "Widebody", Class: "E" },
    "788": { Name: "B787-8 Dreamliner", Group: "Widebody", Class: "E" },
    "AB3": { Name: "A300B4", Group: "Widebody", Class: "D" },
    "77F": { Name: "B777-200F", Group: "Widebody", Class: "E" },
    "77L": { Name: "B777-200LR", Group: "Widebody", Class: "E" },
    "77W": { Name: "B777-300ER", Group: "Widebody", Class: "E" },
    "773": { Name: "B777-300", Group: "Widebody", Class: "E" },
    "772": { Name: "B777-200ER", Group: "Widebody", Class: "E" },
    "77X": { Name: "B777-200F", Group: "Widebody", Class: "E" },
    "764": { Name: "B767-400ER", Group: "Widebody", Class: "D" },
    "76W": { Name: "B767-300W", Group: "Widebody", Class: "D" },
    "762": { Name: "B767-200", Group: "Widebody", Class: "D" },
    "763": { Name: "B767-300ER", Group: "Widebody", Class: "D" },
    "76X": { Name: "B767-200F", Group: "Widebody", Class: "D" },
    "76Y": { Name: "B767-300F", Group: "Widebody", Class: "D" },
    "359": { Name: "A350-900", Group: "Widebody", Class: "E" },
    "380": { Name: "A380-800", Group: "Widebody (Heavy)", Class: "F" },
    "75F": { Name: "B757-200PF", Group: "Narrowbody (Heavy)", Class: "D" }, // 757 is heavy for wake turbulence
    "75W": { Name: "B757-200W", Group: "Narrowbody (Heavy)", Class: "D" },
    "752": { Name: "B757-200", Group: "Narrowbody (Heavy)", Class: "D" },
    "753": { Name: "B757-300", Group: "Narrowbody (Heavy)", Class: "D" },
    "346": { Name: "A340-600", Group: "Widebody", Class: "E" },
    "351": { Name: "A350-1000", Group: "Widebody", Class: "E" },
    "343": { Name: "A340-300", Group: "Widebody", Class: "E" },
    "345": { Name: "A340-500", Group: "Widebody", Class: "E" },
    "333": { Name: "A330-300", Group: "Widebody", Class: "E" },
    "332": { Name: "A330-200", Group: "Widebody", Class: "E" },
    "342": { Name: "A340-200", Group: "Widebody", Class: "E" },
    "339": { Name: "A330-900neo", Group: "Widebody", Class: "E" },
    "74Y": { Name: "B747-400F", Group: "Widebody (Heavy)", Class: "E" },
    "748": { Name: "B747-8I", Group: "Widebody (Heavy)", Class: "F" },
    "74N": { Name: "B747-8F", Group: "Widebody (Heavy)", Class: "F" },
    "744": { Name: "B747-400", Group: "Widebody (Heavy)", Class: "E" },
    "747": { Name: "B747-100", Group: "Widebody (Heavy)", Class: "E" },
    "742": { Name: "B747-200", Group: "Widebody (Heavy)", Class: "E" },
    "743": { Name: "B747-300", Group: "Widebody (Heavy)", Class: "E" },
    "M11": { Name: "MD-11", Group: "Widebody", Class: "D" },
    "312": { Name: "A310-200", Group: "Widebody", Class: "D" },
    "310": { Name: "A310", Group: "Widebody", Class: "D" },
    "313": { Name: "A310-300", Group: "Widebody", Class: "D" },
    "ANF": { Name: "Antonov An-12", Group: "Cargo (Prop)", Class: "D" },
    "770": { Name: "Test B770", Group: "Widebody", Class: "A" }
};

// Mapped from 'delay.csv'
const DELAY_CODES = {
    // Aircraft and Ramp Handling
    "37": { Cat: "Handling", Desc: "Catering" }, 
    "GB": { Cat: "Handling", Desc: "Catering" },
    "36": { Cat: "Handling", Desc: "Fuelling" },
    "GF": { Cat: "Handling", Desc: "Fuelling" },
    "32": { Cat: "Handling", Desc: "Loading/Unloading" },
    "GL": { Cat: "Handling", Desc: "Loading/Unloading" },
    
    // Technical
    "41": { Cat: "Technical", Desc: "Aircraft Defects" },
    "TD": { Cat: "Technical", Desc: "Aircraft Defects" },
    "42": { Cat: "Technical", Desc: "Scheduled Maintenance" },
    
    // Operations & Crew
    "61": { Cat: "Ops/Crew", Desc: "Flight Plan" },
    "63": { Cat: "Ops/Crew", Desc: "Late Crew Boarding" },
    "FT": { Cat: "Ops/Crew", Desc: "Late Crew Boarding" },
    
    // Weather
    "71": { Cat: "Weather", Desc: "Departure Weather" },
    "WO": { Cat: "Weather", Desc: "Departure Weather" },
    "72": { Cat: "Weather", Desc: "Dest. Weather" },
    "75": { Cat: "Weather", Desc: "De-Icing" },
    
    // ATC /  Government
    "81": { Cat: "ATC/Gov", Desc: "ATC En-route" },
    "AT": { Cat: "ATC/Gov", Desc: "ATC En-route" },
    "83": { Cat: "ATC/Gov", Desc: "ATC Restriction at Dest" },
    "89": { Cat: "ATC/Gov", Desc: "Airport Restrictions" },
    "AM": { Cat: "ATC/Gov", Desc: "Airport Restrictions" },
    
    // Reactionary
    "93": { Cat: "Reactionary", Desc: "Aircraft Rotation" },
    "RA": { Cat: "Reactionary", Desc: "Aircraft Rotation" },
    "96": { Cat: "Reactionary", Desc: "Ops Control / Rerouting" }
};

document.addEventListener('DOMContentLoaded', () => {
    // Initial Load? Wait for user interaction
    const refreshBtn = document.getElementById('btn-refresh-ops-analysis');
    if (refreshBtn) refreshBtn.addEventListener('click', loadOpsAnalysis);

    const filterMonth = document.getElementById('ops-analysis-month');
    if (filterMonth) filterMonth.addEventListener('change', loadOpsAnalysis);
});

let charts = {}; // Store chart instances

async function loadOpsAnalysis() {
    const monthSelect = document.getElementById('ops-analysis-month');
    const yearInput = document.getElementById('ops-analysis-year');
    
    if (!monthSelect || !yearInput) return;

    const month = monthSelect.value; // "Enero", "Febrero"...
    const year = yearInput.value || 2025;
    const tableName = `Demoras ${month}`; // Assuming "Demoras Enero", "Demoras Febrero" based on user prompt

    // Show Loading
    showLoadingStats();

    try {
        const supabase = window.supabaseClient;
        if (!supabase) throw new Error("Supabase client not initialized");

        console.log(`Fetching from table: ${tableName}`);
        
        // Fetch ALL data using pagination loop
        let allData = [];
        let page = 0;
        const pageSize = 1000;
        let fetchMore = true;

        while (fetchMore) {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;

            if (data && data.length > 0) {
                allData = allData.concat(data);
                console.log(`Page ${page}: Loaded ${data.length} rows`);
                if (data.length < pageSize) fetchMore = false;
                else page++;
            } else {
                fetchMore = false;
            }
            
            // Safety break 
            if (page > 50) fetchMore = false; 
        }

        console.log(`Total Loaded: ${allData.length} records`);
        processOpsAnalysis(allData);

    } catch (err) {
        console.error(err);
        showErrorStats(err.message + ` (Intento de tabla: '${tableName}')`);
    }
}

function processOpsAnalysis(data) {
    if (!data || data.length === 0) {
        showErrorStats("No se encontraron registros para este mes.");
        return;
    }


    // --- 1. Metrics Calculation ---
    let stats = {
        totalOps: data.length,
        totalDelayMinutes: 0,
        delayedOps: 0,
        serviceTypes: { "Passenger": 0, "Cargo": 0, "Other": 0 },
        aircraftGroups: {}, // Only counts for chart
        aircraftDetails: {}, // { "738": { name, group, total, pax, cargo, other } }
        airlineStats: {}, // { "AMX": { name, total, delayed, fleets: {} } }
        topDelayCauses: {},
        hourlyHeatmap: Array(7).fill(0).map(() => Array(24).fill(0)),
        hourlyDetails: Array(7).fill(0).map(() => Array(24).fill(null).map(() => []))
    };

    data.forEach(row => {
        // Find Columns (Flexible Search)
        const cols = {
            svc: findValue(row, ['Service Type', 'Tipo Servicio', 'Code', 'servicio']),
            ac: findValue(row, ['Type', 'Aircraft Type', 'Tipo Avion', 'Equipo', 'aircraft']),
            airline: findValue(row, ['Airline', 'Aerolinea', 'Empresa', 'Compañia', 'Operator']),
            flight: findValue(row, ['Flight', 'Vuelo', 'Numero']), // Backup for airline
            date: findValue(row, ['Fecha', 'Date', 'Programada']),
            time: findValue(row, ['Hora', 'Time', 'Hora Real']),
            delayCode: findValue(row, ['Delay Code', 'Code', 'Codigo', 'Demora Cod']),
            delayTime: findValue(row, ['Delay Time', 'Tiempo', 'Minutos', 'Duration', 'Demora'])
        };
        
        // Debugging: Check if we are finding the AC column
        if (cols.ac && cols.ac !== 'UNK') {
            console.log(`Found AC: ${cols.ac}`);
        } else if (!cols.ac) {
             // Fallback: Try to find ANY key that looks like it holds an aircraft code (3-4 chars, alphanumeric)
             for (const [key, val] of Object.entries(row)) {
                 if (typeof val === 'string' && val.length >= 3 && val.length <= 4 && /^[A-Z0-9]+$/.test(val)) {
                     // Check against our map to see if it's a known aircraft
                     if (AIRCRAFT_MAP[val]) {
                         cols.ac = val;
                         break;
                     }
                 }
             }
        }

         // A. Service Type & Grouping
        let svcGroup = "Other";
        if (cols.svc) {
            let letter = cols.svc.toString().trim().toUpperCase().charAt(0);
            if (FLIGHT_SERVICE_TYPES[letter]) {
                svcGroup = FLIGHT_SERVICE_TYPES[letter].Group;
                if(svcGroup === 'Mixed') svcGroup = 'Passenger'; // Simplification
            }
        }
        stats.serviceTypes[svcGroup] = (stats.serviceTypes[svcGroup] || 0) + 1;

        // B. Aircraft Grouping using Map AND Detailed Tracking
        let acCode = 'UNK';
        if (cols.ac) {
             acCode = cols.ac.toString().trim().toUpperCase();
        } else {
             // Second chance: Scan row values for any familiar AC code
             Object.values(row).forEach(val => {
                 if (typeof val === 'string' && val.length >= 3 && val.length <= 4 && AIRCRAFT_MAP[val.toUpperCase()]) {
                     acCode = val.toUpperCase();
                 }
             });
        }
        
        // Final fallback if map doesn't have it but it looks like a code
        if (!AIRCRAFT_MAP[acCode] && acCode !== 'UNK' && acCode.length <= 4) {
             // Assume unknown narrower body
             acInfo = { Name: acCode, Group: "Desconocido", Class: "?" };
        } else {
             acInfo = AIRCRAFT_MAP[acCode];
        }

        // 1. Chart Grouping
        let chartLabel = acInfo ? acInfo.Name : acCode;
        stats.aircraftGroups[chartLabel] = (stats.aircraftGroups[chartLabel] || 0) + 1;

        // 2. Detailed Tracking
        if (!stats.aircraftDetails[acCode]) {
            stats.aircraftDetails[acCode] = {
                code: acCode,
                name: acInfo ? acInfo.Name : acCode,
                group: acInfo ? acInfo.Group : 'General / Desconocido',
                total: 0,
                pax: 0, cargo: 0, other: 0
            };
        }
        stats.aircraftDetails[acCode].total++;
        if (svcGroup === 'Passenger') stats.aircraftDetails[acCode].pax++;
        else if (svcGroup === 'Cargo') stats.aircraftDetails[acCode].cargo++;
        else stats.aircraftDetails[acCode].other++;

        // C. Airline Analysis
        // Try direct column, else extraction from Flight Number (e.g. AMX123 -> AMX)
        let airlineCode = 'UNK';
        if (cols.airline) {
            airlineCode = cols.airline.toString().trim().toUpperCase();
        } else if (cols.flight) {
            // 1. STANDARD ICAO (AMX123) -> Start with 3 letters
            let match = cols.flight.toString().trim().match(/^([A-Z]{3})/);
            
            // 2. IATA (AM123) -> Start with 2 letters
            if (!match) {
                 match = cols.flight.toString().trim().match(/^([A-Z0-9]{2})\d/);
            }
            
            // 3. SPECIAL (AMX 123) -> Space separator
            if (!match) {
                 match = cols.flight.toString().trim().match(/^([A-Z]{3})\s/);
            }

            if (match) airlineCode = match[1];
        }

        // Final fallback: Scan row for known airline codes if still UNK
        if (airlineCode === 'UNK' || airlineCode.length < 2) {
            // Common Mexican/Intl codes to look for in other fields
            const commonAirlines = ['AMX', 'VOI', 'VIV', 'SLI', 'JAL', 'UAL', 'AAL', 'DAL', 'QTR', 'KLM', 'AFR', 'IBE', 'BAW', 'LKA', 'CMP', 'AVA', 'GIA', 'TAO', 'GMT', 'LRC', 'LCT', 'MAS', 'M7', 'QT', 'CV', '6R', 'UC', 'RU', 'CX', 'CVG', 'CJT', 'MGN', 'MCS', 'TNO', 'VFR', 'ERU', 'VB', 'AM', 'Y4', 'YQ', 'XN', 'M7', 'W8', 'E7', 'DM', 'CV', '5Y', 'CX', 'LH', 'CZ', 'EK', 'TK', 'NH', 'JL', 'KE', 'CI', 'BR', 'CA', 'MU', 'OZ', 'VS', 'AC', 'WS', 'TS', 'PD', 'WG', 'F8', '3S', '5T', '7F', '8C', '9S', 'AB', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AO', 'AP', 'AR', 'AS', 'AT', 'AU', 'AV', 'AW', 'AX', 'AY', 'AZ', 'B6', 'BA', 'BB', 'BC', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BK', 'BL', 'BM', 'BN', 'BO', 'BP', 'BQ', 'BR', 'BS', 'BT', 'BU', 'BV', 'BW', 'BX', 'BY', 'BZ', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'CA', 'CB', 'CC', 'CD', 'CE', 'CF', 'CG', 'CH', 'CI', 'CJ', 'CK', 'CL', 'CM', 'CN', 'CO', 'CP', 'CQ', 'CR', 'CS', 'CT', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'DA', 'DB', 'DC', 'DD', 'DE', 'DF', 'DG', 'DH', 'DI', 'DJ', 'DK', 'DL', 'DM', 'DN', 'DO', 'DP', 'DQ', 'DR', 'DS', 'DT', 'DU', 'DV', 'DW', 'DX', 'DY', 'DZ', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'EA', 'EB', 'EC', 'ED', 'EE', 'EF', 'EG', 'EH', 'EI', 'EJ', 'EK', 'EL', 'EM', 'EN', 'EO', 'EP', 'EQ', 'ER', 'ES', 'ET', 'EU', 'EV', 'EW', 'EX', 'EY', 'EZ', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'FA', 'FB', 'FC', 'FD', 'FE', 'FF', 'FG', 'FH', 'FI', 'FJ', 'FK', 'FL', 'FM', 'FN', 'FO', 'FP', 'FQ', 'FR', 'FS', 'FT', 'FU', 'FV', 'FW', 'FX', 'FY', 'FZ', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'GA', 'GB', 'GC', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GJ', 'GK', 'GL', 'GM', 'GN', 'GO', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GV', 'GW', 'GX', 'GY', 'GZ', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'HA', 'HB', 'HC', 'HD', 'HE', 'HF', 'HG', 'HH', 'HI', 'HJ', 'HK', 'HL', 'HM', 'HN', 'HO', 'HP', 'HQ', 'HR', 'HS', 'HT', 'HU', 'HV', 'HW', 'HX', 'HY', 'HZ', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8', 'I9', 'IA', 'IB', 'IC', 'ID', 'IE', 'IF', 'IG', 'IH', 'II', 'IJ', 'IK', 'IL', 'IM', 'IN', 'IO', 'IP', 'IQ', 'IR', 'IS', 'IT', 'IU', 'IV', 'IW', 'IX', 'IY', 'IZ', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7', 'J8', 'J9', 'JA', 'JB', 'JC', 'JD', 'JE', 'JF', 'JG', 'JH', 'JI', 'JJ', 'JK', 'JL', 'JM', 'JN', 'JO', 'JP', 'JQ', 'JR', 'JS', 'JT', 'JU', 'JV', 'JW', 'JX', 'JY', 'JZ', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9', 'KA', 'KB', 'KC', 'KD', 'KE', 'KF', 'KG', 'KH', 'KI', 'KJ', 'KK', 'KL', 'KM', 'KN', 'KO', 'KP', 'KQ', 'KR', 'KS', 'KT', 'KU', 'KV', 'KW', 'KX', 'KY', 'KZ', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'LA', 'LB', 'LC', 'LD', 'LE', 'LF', 'LG', 'LH', 'LI', 'LJ', 'LK', 'LL', 'LM', 'LN', 'LO', 'LP', 'LQ', 'LR', 'LS', 'LT', 'LU', 'LV', 'LW', 'LX', 'LY', 'LZ', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'MA', 'MB', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MI', 'MJ', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9', 'NA', 'NB', 'NC', 'ND', 'NE', 'NF', 'NG', 'NH', 'NI', 'NJ', 'NK', 'NL', 'NM', 'NN', 'NO', 'NP', 'NQ', 'NR', 'NS', 'NT', 'NU', 'NV', 'NW', 'NX', 'NY', 'NZ', 'O2', 'O3', 'O4', 'O5', 'O6', 'O7', 'O8', 'O9', 'OA', 'OB', 'OC', 'OD', 'OE', 'OF', 'OG', 'OH', 'OI', 'OJ', 'OK', 'OL', 'OM', 'ON', 'OO', 'OP', 'OQ', 'OR', 'OS', 'OT', 'OU', 'OV', 'OW', 'OX', 'OY', 'OZ', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'PA', 'PB', 'PC', 'PD', 'PE', 'PF', 'PG', 'PH', 'PI', 'PJ', 'PK', 'PL', 'PM', 'PN', 'PO', 'PP', 'PQ', 'PR', 'PS', 'PT', 'PU', 'PV', 'PW', 'PX', 'PY', 'PZ', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'QA', 'QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH', 'QI', 'QJ', 'QK', 'QL', 'QM', 'QN', 'QO', 'QP', 'QQ', 'QR', 'QS', 'QT', 'QU', 'QV', 'QW', 'QX', 'QY', 'QZ', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'RA', 'RB', 'RC', 'RD', 'RE', 'RF', 'RG', 'RH', 'RI', 'RJ', 'RK', 'RL', 'RM', 'RN', 'RO', 'RP', 'RQ', 'RR', 'RS', 'RT', 'RU', 'RV', 'RW', 'RX', 'RY', 'RZ', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'SA', 'SB', 'SC', 'SD', 'SE', 'SF', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SP', 'SQ', 'SR', 'SS', 'ST', 'SU', 'SV', 'SW', 'SX', 'SY', 'SZ', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'TA', 'TB', 'TC', 'TD', 'TE', 'TF', 'TG', 'TH', 'TI', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TP', 'TQ', 'TR', 'TS', 'TT', 'TU', 'TV', 'TW', 'TX', 'TY', 'TZ', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9', 'UA', 'UB', 'UC', 'UD', 'UE', 'UF', 'UG', 'UH', 'UI', 'UJ', 'UK', 'UL', 'UM', 'UN', 'UO', 'UP', 'UQ', 'UR', 'US', 'UT', 'UU', 'UV', 'UW', 'UX', 'UY', 'UZ', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'VA', 'VB', 'VC', 'VD', 'VE', 'VF', 'VG', 'VH', 'VI', 'VJ', 'VK', 'VL', 'VM', 'VN', 'VO', 'VP', 'VQ', 'VR', 'VS', 'VT', 'VU', 'VV', 'VW', 'VX', 'VY', 'VZ', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'WA', 'WB', 'WC', 'WD', 'WE', 'WF', 'WG', 'WH', 'WI', 'WJ', 'WK', 'WL', 'WM', 'WN', 'WO', 'WP', 'WQ', 'WR', 'WS', 'WT', 'WU', 'WV', 'WW', 'WX', 'WY', 'WZ', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8', 'X9', 'XA', 'XB', 'XC', 'XD', 'XE', 'XF', 'XG', 'XH', 'XI', 'XJ', 'XK', 'XL', 'XM', 'XN', 'XO', 'XP', 'XQ', 'XR', 'XS', 'XT', 'XU', 'XV', 'XW', 'XX', 'XY', 'XZ', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7', 'Y8', 'Y9', 'YA', 'YB', 'YC', 'YD', 'YE', 'YF', 'YG', 'YH', 'YI', 'YJ', 'YK', 'YL', 'YM', 'YN', 'YO', 'YP', 'YQ', 'YR', 'YS', 'YT', 'YU', 'YV', 'YW', 'YX', 'YY', 'YZ', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8', 'Z9', 'ZA', 'ZB', 'ZC', 'ZD', 'ZE', 'ZF', 'ZG', 'ZH', 'ZI', 'ZJ', 'ZK', 'ZL', 'ZM', 'ZN', 'ZO', 'ZP', 'ZQ', 'ZR', 'ZS', 'ZT', 'ZU', 'ZV', 'ZW', 'ZX', 'ZY', 'ZZ'];
            
            for (const val of Object.values(row)) {
                if (typeof val === 'string') {
                     const v = val.toUpperCase().trim();
                     // Check if exact match with known airlines list OR startswith common ones
                     if (commonAirlines.includes(v)) {
                        airlineCode = v;
                        break;
                     }
                      // Special case for IATA 2-char followed by numbers in a random string field
                     const iataMatch = v.match(/^([A-Z0-9]{2})\d{1,4}/);
                     if (iataMatch && commonAirlines.includes(iataMatch[1])) {
                        airlineCode = iataMatch[1];
                        break;
                     }
                }
            }
        }

        if (!stats.airlineStats[airlineCode]) {
            stats.airlineStats[airlineCode] = { code: airlineCode, total: 0, delayed: 0, fleets: {} };
        }
        stats.airlineStats[airlineCode].total++;
        
        // Track fleet usage by airline
        // Use the code directly if no name is mapped, but try to use the mapped name if available
        let fleetName = acInfo ? acInfo.Name : acCode;
        if (fleetName === 'UNK') fleetName = 'No Identificado';
        
        stats.airlineStats[airlineCode].fleets[fleetName] = (stats.airlineStats[airlineCode].fleets[fleetName] || 0) + 1;

        // D. Delay Logic
        let delayMin = parseInt(cols.delayTime) || 0;
        stats.totalDelayMinutes += delayMin;
        
        if (delayMin >= 15) {
            stats.delayedOps++;
            stats.airlineStats[airlineCode].delayed++; // Track delays per airline
            
            let code = cols.delayCode ? cols.delayCode.toString().trim().toUpperCase() : 'UNK';
            let causeLabel = code;
            
            if (DELAY_CODES[code]) {
                causeLabel = `${code} - ${DELAY_CODES[code].Desc}`;
            } else if (code === 'UNK') {
                causeLabel = 'Sin Código';
            }
            stats.topDelayCauses[causeLabel] = (stats.topDelayCauses[causeLabel] || 0) + 1;
        }

        // E. Heatmap
        if (cols.date) {
            let d = new Date(cols.date);
            if (isNaN(d.getTime()) && cols.time) {
               d = new Date(`${cols.date}T${cols.time}`);
            }
            // Fallback for simple date format if Date() doesn't work (e.g. DD/MM/YYYY)
            if (isNaN(d.getTime())) {
                const parts = cols.date.toString().split(/[/-]/);
                // Try YYYY-MM-DD or DD-MM-YYYY
                if (parts.length === 3) {
                     if (parts[0].length === 4) d = new Date(`${cols.date}T${cols.time ? cols.time : '00:00:00'}`);
                     else d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T${cols.time ? cols.time : '00:00:00'}`);
                }
            }

            if (!isNaN(d.getTime())) {
                const day = d.getDay(); // 0 (Sun) - 6 (Sat)
                const hour = d.getHours();
                if(stats.hourlyHeatmap[day]) {
                     stats.hourlyHeatmap[day][hour]++;
                     // Store detail for click event
                     stats.hourlyDetails[day][hour].push({
                         airline: airlineCode,
                         flight: cols.flight || '?',
                         ac: acCode,
                         time: cols.time,
                         svc: svcGroup,
                         delay: delayMin
                     });
                }
            }
        }
    });

    statsGlobalTotal = stats.totalOps;

    // --- 2. Update UI ---
    
    // KPI Cards
    updateKPI('kpi-total-ops', stats.totalOps);
    updateKPI('kpi-pax-ops', stats.serviceTypes['Passenger']);
    updateKPI('kpi-cargo-ops', stats.serviceTypes['Cargo']);
    updateKPI('kpi-delay-total', stats.totalDelayMinutes);
    updateKPI('kpi-delay-ops', stats.delayedOps);
    
    // Charts (Resumen)
    renderServiceChart(stats.serviceTypes);
    renderAircraftChart(stats.aircraftGroups);
    renderDelayChart(stats.topDelayCauses);
    renderHeatmap(stats.hourlyHeatmap, stats.hourlyDetails);

    // New Tabs Rendering
    renderAircraftDetailTable(stats.aircraftDetails);
    renderAirlineAnalysis(stats.airlineStats);

    // Hide Loading
    document.getElementById('ops-analysis-loading').classList.add('d-none');
    document.getElementById('ops-analysis-content').classList.remove('d-none');
}

function findValue(obj, candidates) {
    if(!obj) return null;
    const keys = Object.keys(obj);
    for (let cand of candidates) {
        const foundKey = keys.find(k => k.toLowerCase().includes(cand.toLowerCase()));
        if (foundKey) return obj[foundKey];
    }
    return null;
}

function updateKPI(id, value) {
    const el = document.getElementById(id);
    if(el) el.innerText = value.toLocaleString();
}

function showLoadingStats() {
    document.getElementById('ops-analysis-loading').classList.remove('d-none');
    document.getElementById('ops-analysis-content').classList.add('d-none');
    document.getElementById('ops-analysis-error').classList.add('d-none');
}

function showErrorStats(msg) {
    document.getElementById('ops-analysis-loading').classList.add('d-none');
    document.getElementById('ops-analysis-content').classList.add('d-none');
    const errEl = document.getElementById('ops-analysis-error');
    errEl.classList.remove('d-none');
    errEl.innerText = msg;
}

function renderServiceChart(counts) {
    const ctx = document.getElementById('chart-ops-service').getContext('2d');
    if (charts.svc) charts.svc.destroy();

    charts.svc = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pasajeros', 'Carga', 'Otros'],
            datasets: [{
                data: [counts['Passenger'], counts['Cargo'], counts['Other']],
                backgroundColor: ['#0d6efd', '#198754', '#6c757d'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                title: { display: true, text: 'Distribución por Servicio' }
            }
        }
    });
}

function renderAircraftChart(counts) {
    const ctx = document.getElementById('chart-ops-aircraft').getContext('2d');
    if (charts.ac) charts.ac.destroy();

    // Sort top 15
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 15);
    
    charts.ac = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(x => x[0]),
            datasets: [{
                label: 'Operaciones',
                data: sorted.map(x => x[1]),
                backgroundColor: '#0dcaf0',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y', // Horizontal bars are better for names
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Top 15 Aeronaves (Agrupadas)' }
            },
            scales: {
                x: { beginAtZero: true }
            }
        }
    });
}


function renderHeatmap(matrix, details) {
    const container = document.getElementById('ops-heatmap-container');
    container.innerHTML = '';
    
    // Updated Gradient: Based on the ClickTale image (Blue -> Cyan -> Green -> Yellow -> Red)
    // We try to replicate the smooth, glowing transition.
    
    function getColor(intensity) {
        if (intensity === 0) return 'rgba(230,230,230,0.2)'; // Very light grey

        // Custom interpolation to match the reference image
        if (intensity <= 0.20) {
            // Dark Blue to Light Blue
            return `hsl(240, 90%, ${30 + (intensity * 5 * 30)}%)`; 
        } 
        if (intensity <= 0.40) {
             // Light Blue to Cyan
             return `hsl(${240 - ((intensity - 0.2) * 5 * 60)}, 100%, 60%)`;
        }
        if (intensity <= 0.60) {
             // Cyan to Green
             return `hsl(${180 - ((intensity - 0.4) * 5 * 60)}, 100%, 50%)`;
        }
        if (intensity <= 0.80) {
             // Green to Yellow
             return `hsl(${120 - ((intensity - 0.6) * 5 * 60)}, 100%, 50%)`;
        }
        // Yellow to Red
        return `hsl(${60 - ((intensity - 0.8) * 5 * 60)}, 100%, 50%)`;
    }

    // Text color logic for high contrast
    function getTextColor(intensity) {
         if (intensity > 0.45 && intensity < 0.75) return '#000'; // Dark text for Cyan/Green/Yellow
         return '#fff'; // White text for nice Deep Blue or Red
    }

    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    // Modal Creation (Clean & Modern)
    if (!document.getElementById('heatmap-modal')) {
        const modalHTML = `
        <div class="modal fade" id="heatmap-modal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg" style="border-radius: 12px; overflow: hidden;">
              <div class="modal-header text-white" style="background: linear-gradient(to right, #0d6efd, #0dcaf0);">
                <h5 class="modal-title fw-bold" id="heatmap-modal-title"><i class="fas fa-list me-2"></i>Detalle de Operaciones</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body p-0" style="max-height: 60vh; overflow-y: auto; background-color:#f8f9fa;">
                  <table class="table table-hover mb-0" id="heatmap-modal-table">
                    <thead class="bg-white sticky-top shadow-sm">
                        <tr>
                            <th class="ps-4 py-3 text-secondary text-uppercase small" style="letter-spacing:1px; border-bottom: none;">Hora</th>
                            <th class="py-3 text-secondary text-uppercase small" style="letter-spacing:1px; border-bottom: none;">Vuelo</th>
                            <th class="py-3 text-secondary text-uppercase small" style="letter-spacing:1px; border-bottom: none;">Aerolínea</th>
                            <th class="py-3 text-secondary text-uppercase small" style="letter-spacing:1px; border-bottom: none;">Equipo</th>
                            <th class="py-3 text-secondary text-uppercase small text-end pe-4" style="letter-spacing:1px; border-bottom: none;">Estado</th>
                        </tr>
                    </thead>
                    <tbody class="align-middle bg-white border-top-0"></tbody>
                  </table>
              </div>
            </div>
          </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Table Layout
    let html = '<div class="p-4"><div class="table-responsive"><table class="table table-borderless table-sm text-center small mb-0" style="border-collapse: separate; border-spacing: 3px;">';
    
    // Header (Hours)
    html += '<thead><tr><th style="width: 80px;"></th>';
    for(let h=0; h<24; h++) html += `<th class="text-secondary opacity-75" style="font-weight:600; font-size: 0.75rem;">${h}</th>`;
    html += '</tr></thead><tbody>';

    // Find max for color scaling
    let max = 0;
    matrix.forEach(row => row.forEach(val => max = Math.max(max, val)));

    // Rows (Days)
    matrix.forEach((row, dIndex) => {
        html += `<tr><th class="text-end pe-3 text-secondary align-middle" style="font-weight: 700; font-size: 0.8rem; opacity: 0.8;">${days[dIndex]}</th>`;
        row.forEach((val, hIndex) => {
            const intensity = max > 0 ? (val / max) : 0;
            const bg = getColor(intensity);
            const fg = getTextColor(intensity);
            
            const cursor = val > 0 ? 'pointer' : 'default';
            const opsText = val > 0 ? val : '';
            
            // Interaction: Scale up + Shadow
            const hoverEvents = val > 0 ? 
                `onmouseover="this.style.transform='scale(1.2)'; this.style.zIndex='10'; this.style.boxShadow='0 5px 15px rgba(0,0,0,0.2)'"` : 
                '';
            const outEvents = val > 0 ? 
                `onmouseout="this.style.transform='scale(1)'; this.style.zIndex='0'; this.style.boxShadow='none'"` : 
                '';

            // Cell styling
            const cellStyle = `
                background-color: ${bg}; 
                color: ${fg}; 
                cursor: ${cursor}; 
                border-radius: 6px; 
                font-weight: bold; 
                width: 38px; 
                height: 34px; 
                transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                box-shadow: ${val > 0 ? '1px 1px 2px rgba(0,0,0,0.05)' : 'none'};
            `;

            const clickAttr = val > 0 ? `onclick="showHeatmapDetails(${dIndex}, ${hIndex})"` : '';

            html += `<td style="${cellStyle}" title="${val} Operaciones" ${clickAttr} ${hoverEvents} ${outEvents}>${opsText}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table></div>';
    
    // Beautiful Gradient Legend
    html += `
    <div class="d-flex justify-content-center align-items-center mt-2 px-5">
        <span class="text-secondary fw-bold" style="font-size: 0.7rem;">BAJA</span>
        <div style="flex-grow: 1; height: 8px; margin: 0 15px; background: linear-gradient(90deg, hsl(240, 90%, 30%), hsl(180, 100%, 60%), hsl(120, 100%, 50%), hsl(60, 100%, 50%), hsl(0, 100%, 50%)); border-radius: 10px; opacity: 0.9;"></div>
        <span class="text-secondary fw-bold" style="font-size: 0.7rem;">ALTA</span>
    </div>
    <div class="text-center mt-2 mb-2">
      <small class="text-muted fst-italic" style="font-size: 0.7rem;">* Da clic en una celda para ver el detalle de vuelos.</small>
    </div>
    </div>
    `;

    container.innerHTML = html;
    
    // Store details in global scope
    window.currentHeatmapDetails = details;
}

// Global function for modal
window.showHeatmapDetails = function(dayIndex, hourIndex) {
    if (!window.currentHeatmapDetails) return;
    const list = window.currentHeatmapDetails[dayIndex][hourIndex];
    if (!list || list.length === 0) return;
    
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const modalTitle = document.getElementById('heatmap-modal-title');
    if(modalTitle) modalTitle.innerText = `Operaciones: ${days[dayIndex]} - Hora: ${hourIndex}:00 (${list.length})`;
    
    // Sort logic remains...
    list.sort((a,b) => {
        if(!a.time) return -1;
        if(!b.time) return 1;
        return a.time.localeCompare(b.time);
    });

    const tbody = document.querySelector('#heatmap-modal-table tbody');
    if(tbody) {
        tbody.innerHTML = '';
        list.forEach(op => {
            const tr = document.createElement('tr');
            let delayBadge = op.delay >= 15 ? `<span class="badge rounded-pill bg-danger shadow-sm">${op.delay}m</span>` : `<span class="badge rounded-pill bg-light text-muted border">${op.delay}m</span>`;
            if (op.delay === 0) delayBadge = '<span class="badge rounded-pill bg-success bg-opacity-10 text-success border border-success">A tiempo</span>';
            
            tr.innerHTML = `
                <td class="ps-4 fw-bold text-secondary font-monospace">${op.time || '--:--'}</td>
                <td class="fw-bold text-primary">${op.flight}</td>
                <td><span class="badge bg-white text-dark border shadow-sm">${op.airline}</span></td>
                <td><small class="text-muted font-monospace">${op.ac || 'UNK'}</small></td>
                <td class="text-end pe-4">${delayBadge}</td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    // Show Modal
    const modalEl = document.getElementById('heatmap-modal');
    if(modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
};

function renderAircraftDetailTable(details) {
    const tbody = document.querySelector('#table-ops-aircraft-detail tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Sort: Total Ops Descending
    const sorted = Object.values(details)
        .filter(d => d.total > 0)
        .sort((a,b) => b.total - a.total);
        
    sorted.forEach(ac => {
        let usage = '';
        if (ac.pax > ac.cargo && ac.pax > ac.other) {
            usage = '<span class="badge bg-primary">Pasajeros</span>';
        } else if (ac.cargo > ac.pax && ac.cargo > ac.other) {
            usage = '<span class="badge bg-success">Carga</span>';
        } else {
            usage = '<span class="badge bg-secondary">Otros</span>';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold fs-6 font-monospace text-dark">${ac.code}</td>
            <td>
                <span class="d-block text-dark fw-bold">${ac.name}</span>
            </td>
            <td class="text-muted small">${ac.group}</td>
            <td class="text-center fw-bold bg-light fs-6">${ac.total}</td>
            <td class="text-center text-primary fw-bold">${ac.pax}</td>
            <td class="text-center text-success fw-bold">${ac.cargo}</td>
            <td class="text-center text-secondary">${ac.other}</td>
            <td>${usage}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderAirlineAnalysis(airlines) {
    // Convert to Array & Sort
    const sortedAirlines = Object.values(airlines)
        .sort((a,b) => b.total - a.total);
    
    // 1. Chart (Top 15)
    // Create new canvas to avoid context reuse issues
    const container = document.getElementById('chart-ops-airlines')?.parentElement;
    if(container) {
       container.innerHTML = '<canvas id="chart-ops-airlines" style="max-height: 300px;"></canvas>';
    }

    const ctx = document.getElementById('chart-ops-airlines');
    
    if (ctx) {
        charts.airlines = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedAirlines.slice(0, 15).map(a => a.code),
                datasets: [{
                    label: 'Operaciones',
                    data: sortedAirlines.slice(0, 15).map(a => a.total),
                    backgroundColor: '#6f42c1',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Top 15 Aerolíneas / Operadores' }
                }
            }
        });
    }

    // 2. Table Data (Top 50)
    const tbody = document.querySelector('#table-ops-airlines-detail tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    sortedAirlines.slice(0, 50).forEach(al => {
        // Safe division
        let delayPct = al.total > 0 ? ((al.delayed / al.total) * 100).toFixed(1) : "0.0";
        
        let delayClass = 'text-success';
        if (delayPct > 10) delayClass = 'text-warning fw-bold';
        if (delayPct > 20) delayClass = 'text-danger fw-bold';

        // Find main aircraft used by this airline
        // List ALL of them, sorted by usage (Highest first)
        let allFleets = Object.entries(al.fleets)
            .sort((a,b) => b[1] - a[1]);
            
        // Show ALL fleets without truncation
        let fleetDisplay = allFleets.map(f => {
            let percentage = ((f[1] / al.total) * 100).toFixed(0);
            // Smaller padding and margin to fit more
            return `<span class="badge bg-light text-dark border me-1 mb-1" style="font-weight: normal;">${f[0]} (${percentage}%)</span>`;
        }).join(" ");

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold font-monospace text-primary">${al.code}</td>
            <td class="text-center fw-bold bg-light text-dark">${al.total}</td>
            <td class="text-center text-muted small">${(al.total / statsGlobalTotal * 100).toFixed(1)}%</td>
            <td class="text-center ${delayClass}">${al.delayed} <span class="small text-muted">(${delayPct}%)</span></td>
            <td>${fleetDisplay}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Global reference for percentage calc
let statsGlobalTotal = 0;



function renderDelayChart(counts) {
    const ctx = document.getElementById('chart-ops-delay').getContext('2d');
    if (charts.delay) charts.delay.destroy();

    // Sort top 10
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 10);
    
    charts.delay = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(x => x[0]),
            datasets: [{
                label: 'Vuelos Demorados',
                data: sorted.map(x => x[1]),
                backgroundColor: '#dc3545',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Top 10 Causas de Demora' }
            },
            scales: {
                x: { beginAtZero: true }
            }
        }
    });
}
