-- Limpieza para instalaciones donde la carga inicial de matrículas ya se ejecutó.
-- Conserva el registro con mayor fila_origen del Excel y elimina los anteriores.

begin;

with ranked as (
    select
        id,
        row_number() over (
            partition by upper(btrim(replace(matricula, chr(160), ' ')))
            order by fila_origen desc, id desc
        ) as rn
    from public.matriculas_manifiestos
)
delete from public.matriculas_manifiestos m
using ranked r
where m.id = r.id
  and r.rn > 1;

update public.matriculas_manifiestos
set matricula = upper(btrim(replace(matricula, chr(160), ' '))),
    updated_at = now();

create unique index if not exists uq_matriculas_manifiestos_matricula_normalizada
    on public.matriculas_manifiestos
    (upper(btrim(replace(matricula, chr(160), ' '))));

commit;
