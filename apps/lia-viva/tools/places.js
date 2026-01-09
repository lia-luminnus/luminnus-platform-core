// ======================================================================
// 📍 GOOGLE PLACES API - Locais Próximos REAIS
// ======================================================================
// API: Google Places (usa a mesma key do Google Search)
// ======================================================================

import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const PLACES_API_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

// ======================================================================
// 📍 BUSCAR LOCAIS PRÓXIMOS
// ======================================================================
export async function searchNearby(type = "restaurant", lat, lon, radius = 1500) {
  try {
    if (!GOOGLE_API_KEY) {
      console.warn("⚠️ GOOGLE_API_KEY não configurada");
      return "Preciso de uma chave de API do Google para buscar locais próximos.";
    }
    
    if (!lat || !lon) {
      return "Preciso da sua localização para buscar lugares próximos.";
    }
    
    console.log(`📍 Buscando ${type} perto de: ${lat}, ${lon}`);
    
    const url = `${PLACES_API_URL}?location=${lat},${lon}&radius=${radius}&type=${type}&key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API retornou status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return `Não encontrei ${translateType(type)} perto de você.`;
    }
    
    // Pegar top 3
    const places = data.results.slice(0, 3);
    
    let response_text = `Encontrei ${places.length} ${translateType(type)} perto de você:\n\n`;
    
    places.forEach((place, index) => {
      const name = place.name;
      const rating = place.rating ? `⭐ ${place.rating}` : '';
      const address = place.vicinity || '';
      const isOpen = place.opening_hours?.open_now;
      const status = isOpen === true ? '🟢 Aberto' : isOpen === false ? '🔴 Fechado' : '';
      
      response_text += `${index + 1}. ${name}\n`;
      if (rating) response_text += `   ${rating}\n`;
      if (address) response_text += `   📍 ${address}\n`;
      if (status) response_text += `   ${status}\n`;
      response_text += '\n';
    });
    
    console.log(`✅ Encontrados ${places.length} locais`);
    return response_text.trim();
    
  } catch (err) {
    console.error("❌ Erro ao buscar locais:", err);
    return "Não consegui buscar locais próximos agora.";
  }
}

// ======================================================================
// 📍 TRADUZIR TIPOS DE LOCAL
// ======================================================================
function translateType(type) {
  const translations = {
    'restaurant': 'restaurantes',
    'cafe': 'cafés',
    'bar': 'bares',
    'pharmacy': 'farmácias',
    'hospital': 'hospitais',
    'gas_station': 'postos de gasolina',
    'bank': 'bancos',
    'atm': 'caixas eletrônicos',
    'supermarket': 'supermercados',
    'gym': 'academias',
    'park': 'parques',
    'museum': 'museus',
    'movie_theater': 'cinemas',
    'shopping_mall': 'shoppings',
    'hotel': 'hotéis'
  };
  
  return translations[type] || type;
}

// ======================================================================
// 📍 DETECTAR TIPO DE LOCAL NO TEXTO
// ======================================================================
export function detectPlaceType(text) {
  const textLower = text.toLowerCase();
  
  const keywords = {
    'restaurant': ['restaurante', 'comida', 'comer', 'almoçar', 'jantar'],
    'cafe': ['café', 'cafeteria'],
    'bar': ['bar', 'beber', 'cerveja'],
    'pharmacy': ['farmácia', 'remédio', 'medicamento'],
    'hospital': ['hospital', 'médico', 'emergência'],
    'gas_station': ['posto', 'gasolina', 'combustível'],
    'bank': ['banco', 'agência'],
    'atm': ['caixa eletrônico', 'atm', 'sacar dinheiro'],
    'supermarket': ['supermercado', 'mercado', 'compras'],
    'gym': ['academia', 'ginásio', 'treinar'],
    'park': ['parque', 'praça'],
    'museum': ['museu'],
    'movie_theater': ['cinema'],
    'shopping_mall': ['shopping'],
    'hotel': ['hotel', 'hospedagem']
  };
  
  for (const [type, words] of Object.entries(keywords)) {
    if (words.some(word => textLower.includes(word))) {
      return type;
    }
  }
  
  // Padrão: restaurante
  return 'restaurant';
}

// ======================================================================
// 📍 BUSCAR LOCAIS INTELIGENTE (detecta tipo automaticamente)
// ======================================================================
export async function searchNearbySmart(query, lat, lon) {
  try {
    // ✅ VALIDAÇÃO: Verifica se lat/lon são números válidos
    if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
      console.warn(`⚠️ Parâmetros de localização inválidos: lat=${lat}, lon=${lon}`);
      return "Preciso de coordenadas válidas para buscar locais próximos. Ative a geolocalização no navegador.";
    }
    
    const type = detectPlaceType(query);
    return await searchNearby(type, lat, lon);
  } catch (err) {
    console.error("❌ Erro na busca inteligente de locais:", err);
    return "Erro ao buscar locais próximos.";
  }
}

// ======================================================================
// EXPORTS
// ======================================================================
export default {
  searchNearby,
  searchNearbySmart,
  detectPlaceType,
  translateType
};