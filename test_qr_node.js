const test = async () => {
    try {
        const res = await fetch("https://evolution-api-luminnus.onrender.com/instance/create", {
            method: "POST",
            headers: {
                "apikey": "4211a768-bdf3-4eb0-8a1a-3e5f22e8db12",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                instanceName: "test_node_qr_2",
                description: "WhatsApp LIA para tenant test",
                qrcode: true,
                integration: "WHATSAPP-BAILEYS"
            })
        });
        const data = await res.json();
        console.log("RESPONSE:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("ERROR:", err);
    }
};
test();
