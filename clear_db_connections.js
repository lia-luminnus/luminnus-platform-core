const { Client } = require('pg');

async function main() {
    console.log("Connecting to Supabase to clear idle connections...");
    const client = new Client({
        connectionString: 'postgresql://postgres.trnszeolsvyikavhqqid:OS2oyzvXENxi5gOz@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?schema=evolution_api'
    });

    try {
        await client.connect();

        // Kill all idle connections except our own
        const res = await client.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = 'postgres' 
        AND pid <> pg_backend_pid() 
        AND state = 'idle';
    `);

        console.log(`Successfully killed ${res.rowCount} idle connection(s).`);
    } catch (err) {
        console.error("Error clearing connections:", err);
    } finally {
        await client.end();
    }
}

main();
