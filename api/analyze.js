// api/analyze.js
// Vercel Serverless Function — proxy sicuro per l'API Anthropic.
// La API key resta server-side e non è mai esposta al browser.
//
// Deploy: metti ANTHROPIC_API_KEY nelle Environment Variables di Vercel
// (Settings → Environment Variables → aggiungi ANTHROPIC_API_KEY)

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  // CORS per vercel dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata nel server' });
  }

  try {
    // Parsing body — gestisce sia oggetto già parsato che stringa raw
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const { messages, max_tokens = 4000 } = body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Campo messages mancante o non valido' });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens,
        messages,
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      console.error('[analyze] Anthropic error:', data);
      return res.status(anthropicRes.status).json({
        error: data.error?.message || `Anthropic API error ${anthropicRes.status}`,
      });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('[analyze] errore interno:', err);
    return res.status(500).json({ error: err.message || 'Errore interno del server' });
  }
}