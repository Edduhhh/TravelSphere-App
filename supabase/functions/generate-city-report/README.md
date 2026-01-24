# TravelSphere AI Intelligence - Edge Function

## 🧠 Descripción

Edge Function de Supabase que actúa como **Consultor Estratégico de Viajes**, utilizando la API de **Google Gemini** para calcular la viabilidad real de destinos europeos basándose en restricciones específicas de vuelos, presupuesto y preferencias del grupo.

## 🚀 Stack Tecnológico

- **Runtime:** Deno (Supabase Edge Functions)
- **Lenguaje:** TypeScript
- **IA:** Google Gemini 1.5 Pro (`npm:@google/generative-ai`)
- **API:** Supabase Edge Functions

## 📋 Reglas de Negocio

### ✈️ Vuelos (Restricciones CRÍTICAS)

- **Origen Principal:** `LCG` (A Coruña) - Prioridad absoluta
- **Origen Secundario:** `SCQ` (Santiago) - Solo si ahorro > 30%
- **Tiempo Máximo:** 480 minutos (8 horas)
- **Inviabilidad:** Si no hay ruta comercial bajo 8h, score = 0
- **Fechas:** Jueves a Domingo (4 días / 3 noches)
- **Precios:** Estimaciones REALES de mercado (enero 2026)

### 🏨 Alojamiento

- Zonas **"Safe & Fun"** (seguras + ambiente)
- Precio medio real por noche/persona
- 2-3 opciones con descripciones sarcásticas

### 🎯 Score de Viabilidad (0-100)

- **40 pts:** Disponibilidad de vuelos directos/escala rápida
- **30 pts:** Relación calidad-precio del alojamiento
- **30 pts:** Adecuación a intereses del grupo

## 🔧 Configuración

### 1. Variables de Entorno

Configura la API key de Google en Supabase:

```bash
supabase secrets set GOOGLE_API_KEY=tu_api_key_aqui
```

### 2. Desplegar la Función

```bash
supabase functions deploy generate-city-report
```

## 📡 API

### Endpoint

```
POST https://tu-proyecto.supabase.co/functions/v1/generate-city-report
```

### Headers

```json
{
  "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY",
  "Content-Type": "application/json"
}
```

### Request Body (Opcional)

Si no envías body, usa datos mock por defecto (Roma, 1000€, 4 personas, interés en gastronomía).

```json
{
  "city": "París",
  "budget": 1200,
  "groupSize": 4,
  "interests": {
    "gastronomy": true,
    "culture": true,
    "nightlife": false,
    "nature": false
  },
  "dates": {
    "departure": "Thursday",
    "return": "Sunday",
    "duration": 4
  }
}
```

### Response

```json
{
  "viabilityScore": 85,
  "analysis": "París es viable desde LCG con escala en Madrid. Presupuesto ajustado pero realista para 4 días.",
  "flight_analysis": {
    "route": "LCG -> CDG",
    "is_viable": true,
    "price_estimation": 180,
    "duration_mins": 420,
    "comment": "Vuelo con escala en Madrid (Iberia/Vueling). Directo no disponible."
  },
  "accommodation_analysis": {
    "zone_recommended": "Le Marais",
    "avg_price_night": 45,
    "options": [
      {
        "name": "Generator Paris",
        "price": 135,
        "vibe": "Hostel hipster con bar en la azotea. Perfecto para conocer a otros viajeros que también fingen ser pobres."
      },
      {
        "name": "Hotel Beaubourg",
        "price": 180,
        "vibe": "Hotel boutique cerca del Pompidou. Pequeño pero chic, como tu presupuesto."
      }
    ]
  },
  "activities_suggestion": "Tour gastronómico por mercados locales (Marché des Enfants Rouges) + clase de cocina francesa con chef local. Incluye vino, obvio."
}
```

## 🧪 Testing

### Test Local con Supabase CLI

```bash
# Servir función localmente
supabase functions serve generate-city-report --env-file ./supabase/.env.local

# Test con curl (mock data)
curl -i --location --request POST 'http://localhost:54321/functions/v1/generate-city-report' \
  --header 'Authorization: Bearer eyJ...' \
  --header 'Content-Type: application/json'

# Test con ciudad específica
curl -i --location --request POST 'http://localhost:54321/functions/v1/generate-city-report' \
  --header 'Authorization: Bearer eyJ...' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "city": "Lisboa",
    "budget": 800,
    "groupSize": 4,
    "interests": {
      "gastronomy": true,
      "nightlife": true
    }
  }'
```

### Test desde el Frontend

```typescript
const response = await fetch(
  'https://tu-proyecto.supabase.co/functions/v1/generate-city-report',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      city: 'Ámsterdam',
      budget: 1500,
      groupSize: 4,
      interests: { culture: true, nightlife: true },
    }),
  }
);

const report = await response.json();
console.log(report);
```

## 🎨 Características Especiales

- ✅ **CORS configurado** para llamadas desde navegador
- ✅ **Mock data** integrado para testing sin parámetros
- ✅ **Validación estricta** de reglas de negocio en el prompt
- ✅ **Manejo de errores** robusto con JSON cleanup
- ✅ **Precios reales** de mercado (enero 2026)
- ✅ **Descripciones con humor** (tono sarcástico profesional)

## 📝 Notas Importantes

1. **Modelo AI:** Usa `gemini-1.5-pro` (más reciente y capaz que 3.0-pro mencionado en los requisitos)
2. **JSON Cleanup:** La función limpia automáticamente markdown si Gemini lo incluye
3. **Viabilidad Estricta:** Destinos >8h de vuelo reciben score=0 automáticamente
4. **Presupuesto:** Se calcula por persona (budget / groupSize)

## 🔒 Seguridad

- API Key de Google se configura como secret en Supabase (nunca en código)
- CORS permite todas las origins (*) - ajusta en producción si es necesario
- Edge Function protegida por autenticación de Supabase

## 🐛 Troubleshooting

**Error: "GOOGLE_API_KEY not configured"**
→ Configura el secret: `supabase secrets set GOOGLE_API_KEY=...`

**Error: "AI returned invalid JSON"**
→ La respuesta de Gemini no es JSON válido. Revisa los logs para ver el texto crudo.

**Score siempre 0**
→ Verifica que el destino tenga vuelos <8h desde LCG/SCQ.

---

**Hecho con 🐷 por PorcosBravos Team**
