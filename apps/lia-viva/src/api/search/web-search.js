// ======================================================================
// 🌐 WEB SEARCH API — Google Custom Search (para Realtime Tools)
// ======================================================================

import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

export default async function webSearchHandler(req, res) {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: "Query é obrigatória" });
        }

        const url =
            "https://www.googleapis.com/customsearch/v1?" +
            `key=${GOOGLE_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(
                query
            )}`;

        const response = await fetch(url);
        const data = await response.json();

        const results = (data.items || []).map((item) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet
        }));

        return res.json({
            success: true,
            query,
            results
        });
    } catch (err) {
        console.error("❌ Erro web-search:", err);
        return res.status(500).json({ error: "Erro na busca web" });
    }
}
