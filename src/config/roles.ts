// Super admin, admin y vendedor (editor) tienen su propia vista (inventario); no usan el catálogo de clientes.
export const STAFF_ROLES = ['admin', 'editor', 'super_admin'];
export const ADMIN_ROLES = ['admin', 'super_admin'];

export const isStaff = (role: string) => STAFF_ROLES.includes(role);
export const isAdmin = (role: string) => ADMIN_ROLES.includes(role);
export const homeFor = (role: string, authenticated: boolean) => (authenticated && isStaff(role) ? '/admin/inventario' : '/catalogo');
