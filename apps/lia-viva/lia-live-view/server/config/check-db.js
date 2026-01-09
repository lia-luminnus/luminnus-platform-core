import './envLoader.js';
import { supabase } from './supabase.js';

async function checkIntegrations() {
    if (!supabase) {
        console.error('Supabase not initialized');
        return;
    }

    console.log('🔍 Checking integrations_connections table...');
    const { data, error } = await supabase
        .from('integrations_connections')
        .select('*');

    if (error) {
        console.error('❌ Error fetching integrations:', error);
    } else {
        console.log(`✅ Found ${data.length} records:`);
        data.forEach(conn => {
            console.log(`- User: ${conn.user_id}, Provider: ${conn.provider}, Tenant: ${conn.tenant_id}, Status: ${conn.status}`);
        });
    }
    process.exit(0);
}

checkIntegrations();
