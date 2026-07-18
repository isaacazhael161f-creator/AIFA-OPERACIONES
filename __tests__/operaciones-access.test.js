describe('AIFA Operaciones access rules', () => {
  const allowed = (rows, globalRole) => rows.some(r => r.app === 'OPERACIONES' && r.estado === 'ACTIVO')
    || ['superuser', 'superadmin'].includes(String(globalRole || '').toLowerCase());
  test.each([
    ['solo MHR', [{ app: 'MHR', estado: 'ACTIVO' }], null, false],
    ['solo OPERACIONES', [{ app: 'OPERACIONES', estado: 'ACTIVO' }], null, true],
    ['ambos', [{ app: 'MHR', estado: 'ACTIVO' }, { app: 'OPERACIONES', estado: 'ACTIVO' }], null, true],
    ['INACTIVO', [{ app: 'OPERACIONES', estado: 'INACTIVO' }], null, false],
    ['superuser', [], 'superuser', true],
    ['superadmin', [], 'superadmin', true],
  ])('%s', (_name, rows, role, expected) => expect(allowed(rows, role)).toBe(expected));
});
