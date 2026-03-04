import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:\\luminnus-platform-core\\apps\\lia-viva\\lia-live-view\\.env' });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkDups() {
    const { data, error } = await supabase
        .from('integrations_connections')
        .select('*')
        .eq('user_id', '5d626893-2cdb-4a75-a84e-360713f65026')
        .eq('provider', 'google_workspace');

    console.log('Error:', error);
    console.log('Data:', JSON.stringify(data, null, 2));
}

checkDups();
