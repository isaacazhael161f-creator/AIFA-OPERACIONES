
async function checkTable() {
    try {
        const { data, error } = await window.supabaseClient.from('system_logs').select('*').limit(1);
        if (error) {
            console.error('Error checking system_logs:', error);
            document.body.innerHTML += '<div id="test-result">ERROR: ' + JSON.stringify(error) + '</div>';
        } else {
            console.log('system_logs exists:', data);
            document.body.innerHTML += '<div id="test-result">SUCCESS: Table found</div>';
        }
    } catch (e) {
        console.error('Exception:', e);
        document.body.innerHTML += '<div id="test-result">EXCEPTION: ' + e.message + '</div>';
    }
}
checkTable();
