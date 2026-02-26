const test = async () => {
    for (let i = 0; i < 5; i++) {
        try {
            const res = await fetch("https://evolution-api-luminnus.onrender.com/instance/connect/test_node_qr_2", {
                headers: { "apikey": "4211a768-bdf3-4eb0-8a1a-3e5f22e8db12" }
            });
            console.log(`POLL ${i + 1} STATUS:`, res.status);
            const data = await res.text();
            try {
                const json = JSON.parse(data);
                console.log(`POLL ${i + 1} RESPONSE:`, JSON.stringify(json).substring(0, 300));
            } catch {
                console.log(`POLL ${i + 1} RESPONSE (TEXT):`, data.substring(0, 300));
            }
        } catch (err) {
            console.error("ERROR:", err);
        }
        await new Promise(r => setTimeout(r, 2000));
    }
};
test();
