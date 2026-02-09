(function() {
    function applyViewerPermissions(detail) {
        const { role, permissions } = detail;
        
        // Filter out legacy events from script.js that don't include permissions object
        // This prevents 'script.js' from accidentally resetting UI to "no permissions" state (hiding everything)
        if (typeof permissions === 'undefined') {
            console.warn('Ignored admin-mode-changed event without permissions data (legacy script source)');
            return;
        }

        // Remove existing restriction class
        document.body.classList.remove('viewer-restricted');
        
        // Find all menu items with data-section
        const menuItems = document.querySelectorAll('.menu-item[data-section]');
        
        // Reset visibility first to ensure clean state
        menuItems.forEach(el => el.classList.remove('d-none-auth'));

        // If not a viewer, we don't apply these specific restrictions
        if (role !== 'viewer') {
            return;
        }

        document.body.classList.add('viewer-restricted');
        
        const allowed = permissions?.allowed_sections || [];
        
        console.log('Appying Viewer Permissions:', allowed);

        menuItems.forEach(item => {
            const section = item.dataset.section;
            
            // Special handling for 'Inicio' dashboard alias
            if (section === 'operaciones-totales') { 
                 if (!allowed.includes('operaciones-totales') && !allowed.includes('inicio')) {
                     item.classList.add('d-none-auth');
                 }
                 return;
            }
           
            if (!allowed.includes(section)) {
                item.classList.add('d-none-auth');
            }
        });
    }

    // Listen for admin mode changes
    window.addEventListener('admin-mode-changed', (e) => {
        applyViewerPermissions(e.detail);
    });

    // Check immediate state on load (in case event fired before we listened)
    document.addEventListener('DOMContentLoaded', () => {
        if (window.dataManager) {
            // Apply if already determined
            if (window.dataManager.userRole || window.dataManager.isAdmin) {
                 applyViewerPermissions({
                     role: window.dataManager.userRole,
                     permissions: window.dataManager.permissions
                 });
            } 
            // Also check for cached state manually just in case dataManager isn't exposing props yet
            // (Though dataManager properties are updated before event dispatch)
        }
    });

    // Also check right now if scripts run sequentially and body is mostly parsed
    if (window.dataManager && (window.dataManager.userRole === 'viewer')) {
         // Try to apply immediately if DOM elements exist, waiting for DOMContentLoaded is usually safer
         // but if this script is at end of body, it's fine.
    }
})();