// ======================================================================
// 🌤️ WEATHER API - Clima REAL e Atualizado
// ======================================================================
// API: OpenWeatherMap (gratuita, 1000 requests/dia)
// Precisa de API Key: https://openweathermap.org/api
// ======================================================================

import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const WEATHER_API_URL = "https://api.openweathermap.org/data/2.5/weather";

// ======================================================================
// 🌤️ OBTER CLIMA POR CIDADE
// ======================================================================
export async function getWeather(city = "Lisboa", countryCode = "PT") {
  try {
    if (!WEATHER_API_KEY) {
      console.warn("⚠️ OPENWEATHER_API_KEY não configurada no .env");
      return "Preciso de uma chave de API para consultar o clima. Configure OPENWEATHER_API_KEY no .env";
    }
    
    console.log(`🌤️ Buscando clima: ${city}, ${countryCode}`);
    
    const url = `${WEATHER_API_URL}?q=${encodeURIComponent(city)},${countryCode}&appid=${WEATHER_API_KEY}&units=metric&lang=pt`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return `Não encontrei informações de clima para ${city}.`;
      }
      throw new Error(`API retornou status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extrair dados
    const temp = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const description = data.weather[0].description;
    const humidity = data.main.humidity;
    const windSpeed = (data.wind.speed * 3.6).toFixed(1); // m/s → km/h
    
    // Formatar resposta natural
    let response_text = `Em ${city} agora: ${temp}°C, ${description}.`;
    
    if (Math.abs(temp - feelsLike) > 2) {
      response_text += ` Sensação térmica de ${feelsLike}°C.`;
    }
    
    response_text += ` Umidade ${humidity}%, vento ${windSpeed} km/h.`;
    
    console.log(`✅ Clima: ${response_text}`);
    return response_text;
    
  } catch (err) {
    console.error("❌ Erro ao buscar clima:", err);
    return "Não consegui buscar o clima agora. Tente de novo em alguns instantes.";
  }
}

// ======================================================================
// 🌤️ OBTER CLIMA POR COORDENADAS (geolocalização)
// ======================================================================
export async function getWeatherByCoords(lat, lon) {
  try {
    if (!WEATHER_API_KEY) {
      return "Preciso de uma chave de API para consultar o clima.";
    }
    
    console.log(`🌤️ Buscando clima: lat=${lat}, lon=${lon}`);
    
    const url = `${WEATHER_API_URL}?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&lang=pt`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API retornou status ${response.status}`);
    }
    
    const data = await response.json();
    
    const temp = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const description = data.weather[0].description;
    const cityName = data.name;
    
    let response_text = `Aqui em ${cityName}: ${temp}°C, ${description}.`;
    
    if (Math.abs(temp - feelsLike) > 2) {
      response_text += ` Sensação de ${feelsLike}°C.`;
    }
    
    console.log(`✅ Clima: ${response_text}`);
    return response_text;
    
  } catch (err) {
    console.error("❌ Erro ao buscar clima por coords:", err);
    return "Não consegui buscar o clima da sua localização.";
  }
}

// ======================================================================
// 🌤️ DETECTAR CIDADE NO TEXTO (helper)
// ======================================================================
export function detectCity(text) {
  const textLower = text.toLowerCase();
  
  // Cidades comuns
  const cities = {
    'lisboa': { city: 'Lisboa', country: 'PT' },
    'porto': { city: 'Porto', country: 'PT' },
    'aveiro': { city: 'Aveiro', country: 'PT' },
    'coimbra': { city: 'Coimbra', country: 'PT' },
    'faro': { city: 'Faro', country: 'PT' },
    'braga': { city: 'Braga', country: 'PT' },
    'são paulo': { city: 'São Paulo', country: 'BR' },
    'rio de janeiro': { city: 'Rio de Janeiro', country: 'BR' },
    'rio': { city: 'Rio de Janeiro', country: 'BR' },
    'brasília': { city: 'Brasília', country: 'BR' },
    'londres': { city: 'London', country: 'GB' },
    'paris': { city: 'Paris', country: 'FR' },
    'nova york': { city: 'New York', country: 'US' },
    'tóquio': { city: 'Tokyo', country: 'JP' },
    'tokyo': { city: 'Tokyo', country: 'JP' }
  };
  
  for (const [key, value] of Object.entries(cities)) {
    if (textLower.includes(key)) {
      return value;
    }
  }
  
  // Padrão: Lisboa
  return { city: 'Lisboa', country: 'PT' };
}

// ======================================================================
// 🌤️ BUSCAR CLIMA INTELIGENTE (detecta cidade automaticamente)
// ======================================================================
export async function getWeatherSmart(query) {
  try {
    const { city, country } = detectCity(query);
    return await getWeather(city, country);
  } catch (err) {
    console.error("❌ Erro na busca inteligente de clima:", err);
    return "Erro ao buscar clima.";
  }
}

// ======================================================================
// EXPORTS
// ======================================================================
export default {
  getWeather,
  getWeatherByCoords,
  getWeatherSmart,
  detectCity
};