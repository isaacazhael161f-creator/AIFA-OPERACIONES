
(function() {
    const COMP_BUCKET = 'comparativa';
    const COMP_FILE_NAME = 'operatividad_aerolineas.pdf';
    
    // Helper to get public URL
    function getComparativaPdfUrl() {
        const supabaseUrl = (window.APP_CONFIG && window.APP_CONFIG.SUPABASE_URL) || 'https://fgstncvuuhpgyzmjceyr.supabase.co';
        // Cache busting with timestamp
        return `${supabaseUrl}/storage/v1/object/public/${COMP_BUCKET}/${COMP_FILE_NAME}`;
    }

    const ComparativaManager = {
        init: function() {
            this.bindEvents();
            this.loadCurrentPdf();
        },

        bindEvents: function() {
            const uploadBtn = document.getElementById('btn-upload-comparativa');
            if (uploadBtn) {
                uploadBtn.addEventListener('click', () => this.handleUpload());
            }

            // Refresh preview when tab is shown (Admin tab)
            const tabEl = document.querySelector('button[data-bs-target="#pane-comparativa"]');
            if (tabEl) {
                tabEl.addEventListener('shown.bs.tab', () => {
                    this.updateAdminPreview(true);
                });
            }

             // Listen for menu click for the main section
             const menuLink = document.querySelector('.menu-item[data-section="comparativa"]');
             if (menuLink) {
                 menuLink.addEventListener('click', () => {
                     this.updatePublicView(true);
                 });
             }
        },

        handleUpload: async function() {
            const fileInput = document.getElementById('comparativa-pdf-upload');
            const statusDiv = document.getElementById('comparativa-upload-status');
            
            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                if(statusDiv) statusDiv.innerHTML = '<div class="alert alert-warning">Por favor selecciona un archivo PDF.</div>';
                return;
            }

            const file = fileInput.files[0];
            if (file.type !== 'application/pdf') {
                if(statusDiv) statusDiv.innerHTML = '<div class="alert alert-danger">El archivo debe ser un PDF.</div>';
                return;
            }

            try {
                if(statusDiv) statusDiv.innerHTML = '<div class="alert alert-info">Subiendo archivo... <i class="fas fa-spinner fa-spin"></i></div>';
                
                const supabase = await window.ensureSupabaseClient();
                
                // Upload file to Supabase Storage
                // Upsert: true to overwrite
                const { data, error } = await supabase.storage
                    .from(COMP_BUCKET)
                    .upload(COMP_FILE_NAME, file, {
                        cacheControl: '0',
                        upsert: true
                    });

                if (error) throw error;

                if(statusDiv) {
                    statusDiv.innerHTML = '<div class="alert alert-success">Archivo actualizado correctamente.</div>';
                    setTimeout(() => statusDiv.innerHTML = '', 3000);
                }
                
                // Clear input
                fileInput.value = '';

                // Update previews
                this.updateAdminPreview(true);
                this.updatePublicView(true);

            } catch (err) {
                console.error('Error uploading comparativa PDF:', err);
                if(statusDiv) statusDiv.innerHTML = `<div class="alert alert-danger">Error al subir: ${err.message}</div>`;
            }
        },

        loadCurrentPdf: function() {
            // Check if file exists in Supabase, otherwise fallback or show empty
            // For now, we assume it might exist or we just set the src.
            // If it doesn't exist, Supabase returns 404, iframe might show error.
            
            this.updatePublicView(true);
        },

        updateAdminPreview: function(forceRefresh = false) {
            const iframe = document.getElementById('preview-comparativa-admin');
            if (iframe) {
                let url = getComparativaPdfUrl();
                if (forceRefresh) {
                    url += `?t=${new Date().getTime()}`;
                }
                iframe.src = url;
            }
        },

        updatePublicView: function(forceRefresh = false) {
            // The public "Comparativa" section iframe
            const iframe = document.getElementById('pdf-preview-2');
            if (iframe) {
                let url = getComparativaPdfUrl();
                if (forceRefresh) {
                    url += `?t=${new Date().getTime()}`;
                }
                // Check if we can verify existence first? 
                // We'll just set it. If it fails (404), maybe we should fallback to local?
                // But the user wants it from Supabase.
                
                // We can check if file exists using HEAD request or just set it.
                // Let's just set it.
                iframe.src = url;
            }
        }
    };

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        ComparativaManager.init();
    });

    // Validar el acceso a window
    window.ComparativaManager = ComparativaManager;

})();
