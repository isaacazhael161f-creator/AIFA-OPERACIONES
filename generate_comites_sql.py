import re
import json

html_path = r"C:\Users\misaa\Documents\AIFA-OPERACIONES\AIFA-OPERACIONES-main\agenda.html"

with open(html_path, "r", encoding="utf-8") as f:
    text = f.read()

# Extract AREAS
areas_match = re.search(r"const AREAS = \{(.*?)\};", text, re.DOTALL)
areas = []
if areas_match:
    areas_text = areas_match.group(1)
    for line in areas_text.split("\n"):
        match = re.search(r"([A-Z]+):\s*\{\s*label:'.*?',\s*full:'(.*?)',\s*color:'(.*?)',\s*bg:'(.*?)'\s*\}", line)
        if match:
            areas.append({
                "acronimo": match.group(1),
                "nombre": match.group(2).replace("'", "''"),
                "color_text": match.group(3),
                "color_bg": match.group(4)
            })

# Extract BASE_COMMITTEES
committees_match = re.search(r"const BASE_COMMITTEES = \[(.*?)\s+\];", text, re.DOTALL)
comites = []

if committees_match:
    com_text = committees_match.group(1)
    # This is tricky because it's JS and not valid JSON. 
    # Let's extract them block by block
    blocks = re.findall(r"\{\s*id:'(.*?)',\s*nombre:'(.*?)',\s*acr:'(.*?)',\s*area:'(.*?)',\s*hora:'(.*?)',\s*tipo:'(.*?)',\s*normativa:\[(.*?)\],?\s*obs:'(.*?)',(.*?)(?:\s*dates:\[(.*?)\])?\s*\}", com_text, re.DOTALL)
    
    for b in blocks:
        cid, nombre, acr, area, hora, tipo, norm, obs, misc, dates = b
        
        # remove quotes from dates array
        dates_list = []
        for d in dates.split(","):
            d = d.strip().strip("'")
            if d:
                dates_list.append(d)
                
        # Parse extra fields like miembros, prepTimeline
        miembros_m = re.search(r"miembros:'(.*?)'", misc)
        miembros = miembros_m.group(1).replace("'", "''") if miembros_m else ""
        
        prep_m = re.search(r"prepTimeline:'(.*?)'", misc)
        prep = prep_m.group(1).replace("'", "''") if prep_m else ""
        
        norm_list = []
        for n in norm.split("',"):
            n = n.strip().strip("'")
            if n:
                norm_list.append(n.replace("'", "''"))

        comites.append({
            "id": cid,
            "nombre": nombre.replace("'", "''"),
            "acr": acr,
            "area": area,
            "hora": hora,
            "tipo": tipo,
            "normativa": norm_list,
            "obs": obs.replace("'", "''"),
            "miembros": miembros,
            "prep_timeline": prep,
            "dates": dates_list
        })


sql = []
sql.append("-- =============================================================================")
sql.append("-- 1. CREAR TABLA CATÁLOGO DE ÁREAS")
sql.append("-- =============================================================================")
sql.append("CREATE TABLE IF NOT EXISTS public.areas_config (")
sql.append("    acronimo VARCHAR(10) PRIMARY KEY,")
sql.append("    nombre VARCHAR(100) NOT NULL,")
sql.append("    color_text VARCHAR(7),")
sql.append("    color_bg VARCHAR(7)")
sql.append(");\n")

sql.append("-- Insertar Áreas")
for a in areas:
    sql.append(f"INSERT INTO public.areas_config (acronimo, nombre, color_text, color_bg) VALUES ('{a['acronimo']}', '{a['nombre']}', '{a['color_text']}', '{a['color_bg']}') ON CONFLICT (acronimo) DO UPDATE SET color_text=EXCLUDED.color_text, color_bg=EXCLUDED.color_bg, nombre=EXCLUDED.nombre;")

sql.append("\n-- =============================================================================")
sql.append("-- 2. CREAR TABLA CATÁLOGO DE COMITÉS (DEFINICIONES)")
sql.append("-- =============================================================================")
sql.append("CREATE TABLE IF NOT EXISTS public.comites_catalogo (")
sql.append("    id_comite VARCHAR(50) PRIMARY KEY,")
sql.append("    nombre VARCHAR(255) NOT NULL,")
sql.append("    acr VARCHAR(50) NOT NULL,")
sql.append("    area VARCHAR(10) REFERENCES public.areas_config(acronimo),")
sql.append("    hora_predeterminada VARCHAR(100),")
sql.append("    tipo_predeterminado VARCHAR(50) DEFAULT 'ordinaria',")
sql.append("    obs TEXT,")
sql.append("    miembros TEXT,")
sql.append("    prep_timeline TEXT,")
sql.append("    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
sql.append(");\n")

sql.append("-- Insertar Comités Base")
for c in comites:
    sql.append(f"INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)")
    sql.append(f"VALUES ('{c['id']}', '{c['nombre']}', '{c['acr']}', '{c['area']}', '{c['hora']}', '{c['tipo']}', '{c['obs']}', '{c['miembros']}', '{c['prep_timeline']}')")
    sql.append("ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;")

sql.append("\n-- =============================================================================")
sql.append("-- 3. CREAR TABLA DE NORMATIVA (Relacionada al comité)")
sql.append("-- =============================================================================")
sql.append("CREATE TABLE IF NOT EXISTS public.comites_normativa (")
sql.append("    id SERIAL PRIMARY KEY,")
sql.append("    id_comite VARCHAR(50) REFERENCES public.comites_catalogo(id_comite) ON DELETE CASCADE,")
sql.append("    normativa_texto TEXT NOT NULL")
sql.append(");\n")

for c in comites:
    for n in c['normativa']:
        sql.append(f"INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT '{c['id']}', '{n}' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='{c['id']}' AND normativa_texto='{n}');")

sql.append("\n-- =============================================================================")
sql.append("-- 4. CREAR TABLA DE SESIONES O ACCIONES (EJ. agenda_comites_sesiones)")
sql.append("-- =============================================================================")
sql.append("CREATE TABLE IF NOT EXISTS public.agenda_comites_sesiones (")
sql.append("    id SERIAL PRIMARY KEY,")
sql.append("    id_comite VARCHAR(50) REFERENCES public.comites_catalogo(id_comite) ON DELETE CASCADE,")
sql.append("    area VARCHAR(10) REFERENCES public.areas_config(acronimo),  -- Copiado al crear, facilita RLS")
sql.append("    fecha DATE NOT NULL,")
sql.append("    hora VARCHAR(50),")
sql.append("    tipo VARCHAR(50) DEFAULT 'ordinaria',")
sql.append("    obs_sesion TEXT,")
sql.append("    usuario_id UUID REFERENCES auth.users(id), -- Quien agendó")
sql.append("    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),")
sql.append("    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
sql.append(");\n")

sql.append("-- Insertar Sesiones Anuales Pre-Agendadas")
for c in comites:
    for d in c['dates']:
        sql.append(f"INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT '{c['id']}', '{c['area']}', '{d}', '{c['hora']}', '{c['tipo']}' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='{c['id']}' AND fecha='{d}');")


out_path = r"C:\Users\misaa\Documents\AIFA-OPERACIONES\AIFA-OPERACIONES-main\setup_comites_catalogo.sql"
with open(out_path, "w", encoding="utf-8") as f:
    f.write("\n".join(sql))

print("Listo!")
