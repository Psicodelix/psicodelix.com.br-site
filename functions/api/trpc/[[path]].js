// Serve blog.list com dados estáticos e leads.capture com WhatsApp + Meta CAPI
// Credenciais da Meta (WhatsApp Business API)
const WHATSAPP_TOKEN = "EAAYAEniMET4BRuo1R2b7hZAiVe9Tmjjpu39z6seAn68XTav6Adxkp4eGhyoTpanRCEWGZAOQyzNOhpaHq67ZC8pe11oKMFKsg4qRLw6d8RWZCZCf1zAicL61L8qP2O59GYIMUCPE8ewUSFoZCfbr4ra6r4niprKnwPjePH597wWH2EnlZAq4tteWtJOmC4zBgZDZD";
const WHATSAPP_PHONE_NUMBER_ID = "1041344529072503";
const WHATSAPP_TEMPLATE_NAME = "envio_ebook_central";

// Meta CAPI (Conversions API)
const META_PIXEL_ID = "1246756067574264";
const META_CAPI_TOKEN = "EAAYAEniMET4BRuo1R2b7hZAiVe9Tmjjpu39z6seAn68XTav6Adxkp4eGhyoTpanRCEWGZAOQyzNOhpaHq67ZC8pe11oKMFKsg4qRLw6d8RWZCZCf1zAicL61L8qP2O59GYIMUCPE8ewUSFoZCfbr4ra6r4niprKnwPjePH597wWH2EnlZAq4tteWtJOmC4zBgZDZD";

// Google Sheets webhook
const GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwYG5NNVxe2pmtg_ULi4usu0ES4piBQ1M7z7V2iQnTXfTu-eZ-hhVtaiyETO3lBMHr4/exec";

// Blog posts estáticos (Atualizados com os posts de ontem e hoje)
const BLOG_POSTS = [
  {
    id: 'ritual-do-cacau-sagrado-neurociencia',
    title: 'Ritual do Cacau Sagrado: A Neurociência por trás da Medicina Ancestral',
    excerpt: 'Descubra como o cacau sagrado atua no cérebro, liberando anandamida e teobromina para promover remissão da ansiedade e bem-estar sustentado.',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000',
    date: '30 de Maio de 2026',
    author: 'Equipe Psicodelix',
    slug: 'ritual-do-cacau-sagrado-neurociencia'
  },
  {
    id: 'ansiedade-burnout-remissao-psicodelica',
    title: 'Ansiedade e Burnout: O Framework de Remissão da Johns Hopkins',
    excerpt: 'Como novos protocolos de psicoterapia assistida estão alcançando 96% de eficácia na remissão de sintomas de burnout crônico.',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=1000',
    date: '29 de Maio de 2026',
    author: 'Equipe Psicodelix',
    slug: 'ansiedade-burnout-remissao-psicodelica'
  }
];

// Nomes amigáveis das personas
const personaNames = {
  andre: 'Buscador de Equilíbrio',
  ricardo: 'Executor de Alta Performance',
  sofia: 'Viajante Interior',
  helena: 'Guardião da Família',
  home: 'Visitante da Home',
};

// Mapeamento de protocolos
function getProtocol(persona, usesMedication) {
  if (usesMedication) return 'DESS';
  if (persona === 'home') return 'MED';
  return 'ELEVE';
}

// Formatar número de WhatsApp para o padrão internacional
function formatWhatsAppNumber(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.startsWith('0')) return '55' + digits.slice(1);
  return '55' + digits;
}

// Hash SHA-256 para Meta CAPI
async function hashData(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Enviar evento para Meta CAPI
async function sendMetaCAPI(data, clientIp, userAgent, sourceUrl) {
  if (!META_PIXEL_ID || !META_CAPI_TOKEN) return;

  try {
    const [hashedEmail, hashedPhone, hashedFirstName] = await Promise.all([
      hashData(data.email),
      hashData(data.whatsapp.replace(/\D/g, '')),
      hashData(data.name.split(' ')[0]),
    ]);

    const payload = {
      data: [{
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: sourceUrl,
        action_source: 'website',
        user_data: {
          em: hashedEmail,
          ph: hashedPhone,
          fn: hashedFirstName,
          client_ip_address: clientIp,
          client_user_agent: userAgent,
        },
        custom_data: {
          content_name: `Persona: ${personaNames[data.persona] || data.persona}`,
          content_category: `Protocolo: ${data.protocol}`,
          currency: 'BRL',
          value: data.protocol === 'DESS' ? 1350 : data.protocol === 'ELEVE' ? 720 : 217,
        },
      }],
    };

    await fetch(`https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_CAPI_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[CAPI] Erro:', err);
  }
}

// Enviar e-book via WhatsApp Business API
async function sendWhatsAppEbook(data) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) return;

  const ebookMap = {
    med: {
      title: 'Protocolo MED — Microdosagem Estruturada Diária',
      url: 'https://drive.google.com/file/d/1YEDJyXrnHB47YZ4uLmPY7YbokthKDmT0/view?usp=drive_link',
    },
    nexus: {
      title: 'Protocolo NEXUS — Neuroplasticidade e Expansão',
      url: 'https://drive.google.com/file/d/1CFwJ6N8R1ZWLDltyoqZP4ilLqe4sue-E/view?usp=drive_link',
    }
  };

  let ebookKey = data.selectedEbook?.toLowerCase();
  if (!ebookKey || !ebookMap[ebookKey]) {
    const persona = data.persona.toLowerCase();
    ebookKey = (persona === 'ricardo' || persona === 'sofia') ? 'nexus' : 'med';
  }

  const ebook = ebookMap[ebookKey];
  const rawFirst = data.name ? data.name.trim().split(/\s+/)[0] : 'você';
  const firstName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase();
  const formattedPhone = formatWhatsAppNumber(data.whatsapp);

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: WHATSAPP_TEMPLATE_NAME,
          language: { code: 'pt_BR' },
          components: [
            { type: 'header', parameters: [{ type: 'text', text: firstName }] },
            { type: 'body', parameters: [
              { type: 'text', text: firstName },
              { type: 'text', text: ebook.title },
              { type: 'text', text: ebook.url },
            ]},
          ],
        },
      }),
    });

    if (res.ok) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      await fetch(`https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: {
            body: `🧠 *${firstName}, uma última coisa...*\n\nEnquanto você lê o e-book, surgiram dúvidas sobre psicoterapia assistida por psicodélicos?\n\nEu sou a *Delix IA* e estou disponível agora para tirar suas dúvidas com base científica, total sigilo e sem julgamentos — 24 horas por dia.\n\n👉 *Fale COMIGO AQUI AGORA. Basta continuar nesta conversa.*`,
          },
        }),
      });
    }
  } catch (err) {
    console.error('[WhatsApp] Erro:', err);
  }
}

// Salvar lead no Google Sheets
async function saveToGoogleSheets(data, clientIp, userAgent) {
  if (!GOOGLE_SHEETS_WEBHOOK_URL) return;

  try {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const personaLabel = personaNames[data.persona] || data.persona;

    await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        persona: personaLabel,
        timestamp: now,
      }),
    });
  } catch (err) {
    console.error('[Sheets] Erro:', err);
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/trpc/', '');

  // Endpoint para listar posts do blog
  if (path === 'blog.list' && request.method === 'GET') {
    return new Response(JSON.stringify({ result: { data: { json: BLOG_POSTS } } }), { status: 200 });
  }

  // Endpoint para capturar leads
  if (path === 'leads.capture' && request.method === 'POST') {
    try {
      const body = await request.json();
      const data = body.json || body;
      const { name, email, whatsapp, persona = 'home', usesMedication = false, source = 'site', selectedEbook } = data;

      if (!name || !email || !whatsapp) {
        return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes' }), { status: 400 });
      }

      const protocol = getProtocol(persona, usesMedication);
      const clientIp = request.headers.get('cf-connecting-ip') || '0.0.0.0';
      const userAgent = request.headers.get('user-agent') || '';
      const sourceUrl = request.headers.get('referer') || `https://psicodelix.com.br/${persona}`;

      await Promise.allSettled([
        saveToGoogleSheets({ name, email, whatsapp, persona, protocol, usesMedication, source, ip: clientIp, userAgent }),
        sendMetaCAPI({ name, email, whatsapp, persona, protocol, sourceUrl, clientIp, userAgent }),
        sendWhatsAppEbook({ name, whatsapp, persona, selectedEbook }),
      ]);

      return new Response(JSON.stringify({ result: { data: { json: { success: true, protocol } } } }), { status: 200 });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 });
}
