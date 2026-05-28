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

  // Mapeamento exclusivo para Psicodelix.com.br
  const ebookMap = {
    med: {
      title: 'Protocolo MED — Microdosagem Estruturada Diária',
      url: 'https://drive.google.com/file/d/11i3u-cT3DPM5-JFULyynt2F8XS-zDxpF/view?usp=sharing',
    },
    nexus: {
      title: 'Protocolo NEXUS — Neuroplasticidade e Expansão',
      url: 'https://drive.google.com/file/d/1hlrlOCK9N_m5vgMXAaLs5MwlPfBECIqg/view?usp=sharing',
    }
  };

  // Lógica de seleção
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
    // Enviar template com e-book
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

    const resData = await res.json();
    console.log(`[WhatsApp API Response] Status: ${res.status} | Data: ${JSON.stringify(resData)}`);

    // Se o template foi enviado com sucesso, enviar mensagem de follow-up
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
        name: data.name,
        email: data.email,
        whatsapp: data.whatsapp,
        persona: personaLabel,
        protocol: data.protocol,
        usesMedication: data.usesMedication || false,
        source: data.source || 'psicodelix.com.br',
        ip: clientIp,
        userAgent: userAgent,
        timestamp: now,
      }),
    });
  } catch (err) {
    console.error('[Sheets] Erro:', err);
  }
}

// Blog posts estáticos (mantém a estrutura original)

const PROTOCOLS = {
  MED: {
    name: 'Protocolo MED',
    subtitle: 'Psicoterapia Digital por IA',
    price: 'R$ 217',
    originalPrice: 'R$ 397',
    badge: 'Mais Acessível',
    url: 'https://loja.psicodelix.com/products/protocolo-med-psicoterapia-digital-por-ia',
    features: [
      'Acompanhamento 24h por IA especializada',
      'Protocolo personalizado ao seu perfil',
      'Métricas clínicas semanais (PHQ-9)',
      'Biblioteca de práticas integrativas',
      'Suporte por chat ilimitado'
    ]
  },
  ELEVE: {
    name: 'Protocolo ELEVE',
    subtitle: 'Psicoterapia Assistida — 30 dias',
    price: 'R$ 720',
    originalPrice: 'R$ 1.200',
    badge: 'Mais Popular',
    url: 'https://loja.psicodelix.com/products/pesquisa-etnobotanica-psicoterapia-assistida-por-psicodelicos-protocolo-30-dias',
    features: [
      'Acompanhamento humano especializado',
      'Consultas semanais ao vivo',
      'Protocolo estruturado de 30 dias',
      'Acesso ao Protocolo MED incluído',
      'Suporte entre sessões por mensagem'
    ]
  },
  DESS: {
    name: 'Protocolo DESS',
    subtitle: 'Psicoterapia Intensiva — 60 dias',
    price: 'R$ 1.350',
    originalPrice: 'R$ 2.400',
    badge: 'Mais Completo',
    url: 'https://loja.psicodelix.com/products/pesquisa-etnobotanica-psicoterapia-assistida-por-psicodelicos-60-dias',
    features: [
      'Acompanhamento direto com Psicoterapeuta',
      'Protocolo de 60 dias personalizado',
      'Consultas semanais + suporte contínuo',
      'Processo seguro de integração supervisionada',
      'Acesso vitalício ao Protocolo MED'
    ]
  },
  NEXUS: {
    name: 'Protocolo NEXUS',
    subtitle: 'Imersão Terapêutica em Brumadinho',
    price: 'Sob Consulta',
    originalPrice: '',
    badge: 'Premium',
    url: 'https://loja.psicodelix.com/products/protocolo-nexus-imersao-terapeutica-brumadinho',
    features: [
      'Tudo do Protocolo MED incluído',
      'Imersão presencial em Brumadinho',
      'Conexão profunda com a natureza',
      'Protocolos avançados de expansão',
      'Experiência VIP e personalizada'
    ]
  }
};

const BLOG_POSTS = [{"id": 1780004965, "title": "Neuroplasticidade e Psicodélicos: Ciência da Reconexão Neural", "slug": "neuroplasticidade-e-psicodelicos-ciencia-da-reconexao-neural-1780004965", "description": "A busca por compreender como nosso cérebro pode se reorganizar diante de desafios emocionais e cognitivos ganhou um novo impulso com o estudo dos compostos psicodélicos clássicos. Muitas pessoas enfrentam dificuldades que parecem enraizadas em padrões neurais rígidos, tornando a conexão entre neurônios quebrada ou inflexível. Neste contexto, a neuroplasticidade surge como uma propriedade essencial para a adaptação cerebral, e os psicodélicos apresentam um potencial promissor em modular essa plasticidade.", "content": "# Neuroplasticidade e Psicodélicos: Ciência da Reconexão Neural\n\nA busca por compreender como nosso cérebro pode se reorganizar diante de desafios emocionais e cognitivos ganhou um novo impulso com o estudo dos compostos psicodélicos clássicos. Muitas pessoas enfrentam dificuldades que parecem enraizadas em padrões neurais rígidos, tornando a conexão entre neurônios quebrada ou inflexível. Neste contexto, a neuroplasticidade surge como uma propriedade essencial para a adaptação cerebral, e os psicodélicos apresentam um potencial promissor em modular essa plasticidade.\n\n## A Neuroplasticidade e Seus Mecanismos Cerebrais\n\nNeuroplasticidade refere-se à capacidade do cérebro de formar, fortalecer ou enfraquecer conexões sinápticas em resposta a experiências e ao ambiente. Um dos protagonistas desse processo é o fator neurotrófico derivado do cérebro (BDNF, do inglês *Brain-Derived Neurotrophic Factor*), uma proteína que promove a sobrevivência e a diferenciação neuronal.\n\nAlém disso, a formação de espinhas dendríticas — pequenas projeções nos neurônios responsáveis por receber sinais sinápticos — é fundamental na reestruturação neural. Estudos demonstram que compostos psicodélicos clássicos, como a psilocibina, podem aumentar significativamente a densidade destas espinhas, facilitando a criação de novas vias de comunicação entre neurônios.\n\nSegundo pesquisa publicada na revista *Cell Reports* (Ly et al., 2018), a exposição a psilocibina induziu um aumento de até 25% na formação de espinhas dendríticas em neurônios do córtex pré-frontal, área crucial para funções executivas e regulação emocional.\n\n## Benefícios Associados à Modulação da Neuroplasticidade por Psicodélicos Clássicos\n\n✦ Potencial para melhorar a flexibilidade cognitiva, ajudando na adaptação a novos padrões de pensamento\n\n✦ Facilitação de protocolos que promovem remissão de quadros ansiosos e depressivos, via ressignificação neural\n\n✦ Estímulo à criatividade e à abertura a novas experiências, refletida em maior conectividade cerebral\n\n✦ Possibilidade de acelerar processos de aprendizagem por meio da facilitação da remodelagem sináptica\n\n✦ Suporte à regulação emocional e ao manejo de traumas através da readaptação das redes neurais\n\n---\n\n## Referências\n\n- Ly, C. et al. Psychedelics Promote Structural and Functional Neural Plasticity. *Cell Reports*, 2018; 23(11):3170-3182.  \n- Carhart-Harris, R.L., Goodwin, G.M. The Therapeutic Potential of Psychedelic Compounds. *Nature Reviews Neuroscience*, 2017; 18(11): 642-653.\n\n---\n\n⚠ Educacional | Não é prescrição | +18", "category": "Neurociência", "readTime": "8 min", "date": "28 de Maio, 2026", "image": "https://psicodelix.com.br/assets-media/post-2026-05-28.png", "imageUrl": "https://psicodelix.com.br/assets-media/post-2026-05-28.png", "createdAt": "2026-05-28T21:49:25.562259Z", "author": "Dr. Bernardo", "featured": true}, {"id": 1, "title": "Burnout Profissional: Sinais, Prevenção e Caminhos para a Recuperação", "slug": "burnout-profissional-sinais-prevencao-e-caminhos-para-a-recuperacao-1778547567231", "description": "Explore o burnout profissional, uma síndrome de esgotamento que afeta milhões. Entenda seus sinais, descubra estratégias eficazes de prevenção e aprenda sobre os caminhos para uma recuperação plena, baseando-se em evidências científicas e abordagens integrativas.", "content": "# Burnout Profissional: Sinais, Prevenção e Caminhos para a Recuperação\n\nNo ritmo acelerado da vida moderna e das exigências do mercado de trabalho, o termo \"burnout\" deixou de ser um jargão para se tornar uma realidade preocupante para muitos profissionais. Reconhecido pela Organização Mundial da Saúde (OMS) como uma síndrome resultante do estresse crônico no local de trabalho que não foi gerenciado com sucesso, o burnout profissional é mais do que apenas cansaço; é um esgotamento profundo que afeta a saúde física e mental, a produtividade e a qualidade de vida. Este artigo visa desmistificar o burnout, apresentando seus sinais, estratégias de prevenção e os caminhos essenciais para a recuperação.\n\n## O Que é Burnout Profissional?\n\nO burnout, ou Síndrome do Esgotamento Profissional, é caracterizado por três dimensões principais, conforme descrito pelas pesquisadoras Christina Maslach e Susan Jackson:\n\n1.  **Exaustão Emocional:** Sentimento de esgotamento e de ter os recursos emocionais drenados.\n2.  **Despersonalização (ou Cinismo):** Desenvolvimento de uma atitude distante ou cínica em relação ao trabalho e às pessoas (colegas, clientes, pacientes).\n3.  **Redução da Realização Pessoal:** Sentimento de ineficácia e falta de realização no trabalho.\n\nÉ crucial diferenciar o burnout do estresse comum. Enquanto o estresse pode ser uma resposta temporária a demandas excessivas, o burnout é um estado prolongado de esgotamento que afeta a capacidade de funcionar em múltiplos níveis.\n\n## Sinais de Alerta: Como Identificar o Burnout?\n\nReconhecer os sinais precocemente é fundamental para intervir antes que a condição se agrave. Os sintomas do burnout podem se manifestar em diversas esferas:\n\n### Sinais Físicos\n\n*   **Fadiga Crônica:** Sensação constante de cansaço, mesmo após o repouso.\n*   **Distúrbios do Sono:** Insônia, sono não reparador ou hipersonia.\n*   **Dores Físicas:** Dores de cabeça frequentes, dores musculares, problemas gastrointestinais.\n*   **Queda da Imunidade:** Aumento da frequência de gripes, resfriados e outras infecções.\n*   **Alterações no Apetite:** Perda ou aumento significativo do apetite, levando a mudanças de peso.\n\n### Sinais Emocionais e Psicológicos\n\n*   **Irritabilidade e Cinismo:** Reações exageradas a pequenas frustrações, atitude negativa em relação ao trabalho e colegas.\n*   **Ansiedade e Depressão:** Sentimentos persistentes de preocupação, tristeza, desesperança, falta de prazer.\n*   **Dificuldade de Concentração:** Problemas para focar, lapsos de memória, dificuldade em tomar decisões.\n*   **Sentimento de Fracasso e Ineficácia:** Baixa autoestima, crença de que não é capaz de realizar as tarefas.\n*   **Isolamento Social:** Retraimento de amigos, familiares e atividades sociais.\n\n### Sinais Comportamentais\n\n*   **Procrastinação e Queda de Produtividade:** Dificuldade em iniciar ou concluir tarefas, erros frequentes.\n*   **Absentismo e Presentismo:** Faltas frequentes ao trabalho ou estar presente fisicamente, mas sem engajamento mental (presentismo).\n*   **Aumento do Consumo de Substâncias:** Recurso a álcool, tabaco ou outras drogas para lidar com o estresse.\n*   **Dificuldade em Estabelecer Limites:** Incapacidade de dizer \"não\" a novas demandas, trabalhando excessivamente.\n\n## Prevenção: Construindo Resiliência e Limites Saudáveis\n\nA prevenção do burnout envolve tanto ações individuais quanto responsabilidades organizacionais. Focar em estratégias proativas é a melhor defesa.\n\n### Estratégias Individuais\n\n1.  **Autoconhecimento e Monitoramento:** Aprenda a identificar seus próprios gatilhos de estresse e os primeiros sinais de esgotamento. Práticas como o *mindfulness* podem aumentar a consciência sobre seu estado interno.\n2.  **Estabelecimento de Limites:** Defina horários claros para o trabalho e o descanso. Evite levar trabalho para casa e responda a e-mails ou mensagens fora do expediente apenas em casos de real urgência. O conceito de *\"desconexão digital\"* é vital.\n3.  **Priorização e Delegação:** Aprenda a organizar suas tarefas, priorizando o que é mais importante e delegando quando possível. Ferramentas de gestão de tempo podem ser úteis.\n4.  **Autocuidado:** Invista em atividades que promovam seu bem-estar físico e mental:\n    *   **Exercício Físico Regular:** Ajuda a liberar endorfinas, reduzir o estresse e melhorar o sono.\n    *   **Alimentação Saudável:** Uma dieta equilibrada fornece a energia necessária para o corpo e a mente.\n    *   **Sono de Qualidade:** Priorize 7-9 horas de sono ininterrupto por noite.\n    *   **Hobbies e Lazer:** Dedique tempo a atividades que lhe dão prazer e o ajudam a relaxar, desconectando-se do trabalho.\n5.  **Rede de Apoio Social:** Mantenha contato com amigos e familiares. Compartilhar suas preocupações e receber apoio social é um poderoso amortecedor contra o estresse.\n6.  **Busca por Propósito:** Reconecte-se com o significado do seu trabalho. Quando o propósito é claro, a motivação tende a ser maior, mesmo diante de desafios.\n\n### Estratégias Organizacionais (Responsabilidade das Empresas)\n\n*   **Cultura de Apoio:** Promover um ambiente de trabalho que valorize o bem-estar dos funcionários, com comunicação aberta e respeito.\n*   **Cargas de Trabalho Realistas:** Garantir que as demandas sejam razoáveis e que os funcionários tenham os recursos necessários para cumpri-las.\n*   **Flexibilidade:** Oferecer opções como horários flexíveis, trabalho remoto ou modelos híbridos, quando possível.\n*   **Programas de Bem-Estar:** Implementar iniciativas que promovam a saúde mental, como acesso a terapia, workshops sobre gestão de estresse e *mindfulness*.\n*   **Reconhecimento e Feedback:** Oferecer reconhecimento justo pelo trabalho e feedback construtivo para o desenvolvimento profissional.\n\n## Caminhos para a Recuperação: Reconstruindo o Bem-Estar\n\nA recuperação do burnout é um processo que exige tempo, paciência e, frequentemente, apoio profissional. Não é um sinal de fraqueza, mas sim de que seus limites foram ultrapassados.\n\n1.  **Reconhecimento e Aceitação:** O primeiro passo é admitir que você está em burnout e que precisa de ajuda. Negar a situação apenas prolonga o sofrimento.\n2.  **Afastamento e Descanso:** Em muitos casos, um período de afastamento do trabalho é essencial para permitir que o corpo e a mente se recuperem. Isso pode ser uma licença médica ou férias prolongadas.\n3.  **Terapia Psicológica:** A psicoterapia, especialmente abordagens como a Terapia Cognitivo-Comportamental (TCC) ou a Terapia de Aceitação e Compromisso (ACT), pode ser extremamente eficaz. Um terapeuta pode ajudar a:\n    *   Identificar padrões de pensamento e comportamento disfuncionais.\n    *   Desenvolver estratégias de enfrentamento mais saudáveis.\n    *   Reconstruir a autoestima e o senso de realização.\n    *   Aprender a estabelecer limites eficazes.\n    *   Explorar as causas subjacentes do burnout.\n4.  **Apoio Médico:** Consultar um médico é importante para tratar quaisquer sintomas físicos e descartar outras condições de saúde. Em alguns casos, pode ser necessário o uso de medicação para gerenciar sintomas de ansiedade ou depressão, sempre sob orientação médica.\n5.  **Reavaliação de Carreira e Propósito:** O burnout pode ser um catalisador para reavaliar suas escolhas de carreira, seus valores e o que realmente importa para você. Pode ser o momento de considerar uma mudança de função, de empresa ou até mesmo de área profissional.\n6.  **Reintegração Gradual:** Ao retornar ao trabalho, é crucial fazer uma reintegração gradual. Começar com uma carga de trabalho reduzida e aumentar progressivamente pode evitar uma recaída. A comunicação com a gestão e a equipe é fundamental.\n\n## Conclusão\n\nO burnout profissional é uma condição séria que exige atenção e cuidado. Não se trata de uma falha individual, mas sim de um alerta de que o equilíbrio entre as demandas profissionais e os recursos pessoais foi rompido. Ao reconhecer os sinais, implementar estratégias de prevenção robustas e buscar os caminhos adequados para a recuperação, é possível não apenas superar o burnout, mas também construir uma vida profissional mais saudável, significativa e sustentável. Lembre-se: sua saúde mental é um ativo inestimável, e protegê-la é um investimento no seu futuro e bem-estar geral.\n\n## Referências e Leitura Adicional\n\n*   Maslach, C., Jackson, S. E., & Leiter, M. P. (1996). *Maslach Burnout Inventory Manual* (3rd ed.). Consulting Psychologists Press.\n*   Organização Mundial da Saúde. (2019). *Burn-out an 'occupational phenomenon': International Classification of Diseases*. Disponível em: [https://www.who.int/news/item/28-05-2019-burn-out-an-occupational-phenomenon-international-classification-of-diseases](https://www.who.int/news/item/28-05-2019-burn-out-an-occupational-phenomenon-international-classification-of-diseases)\n*   Schaufeli, W. B., & Enzmann, D. (1998). *The Burnout Companion to Study and Practice: A Critical Analysis*. Taylor & Francis.\n*   Demerouti, E., Bakker, A. B., Nachreiner, F., & Schaufeli, W. B. (2001). The job demands-resources model of burnout. *Journal of Applied Psychology*, 86(3), 499–512.", "category": "Saúde Mental", "readTime": "12 min", "imageUrl": "https://psicodelix.com.br/assets-media/1778584348384_b0e81379.png", "createdAt": "2026-05-12T00:59:28.000Z"}];

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname.replace("/api/trpc/", "");
  
  // blog.list - retorna dados estáticos
  if (path === "blog.list" && context.request.method === "GET") {
    return new Response(JSON.stringify({
      result: {
        data: {
          json: BLOG_POSTS,
          meta: { values: {} }
        }
      }
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
  
  // blog.getBySlug - retorna post individual
  if (path.startsWith("blog.getBySlug") && context.request.method === "GET") {
    const input = url.searchParams.get("input");
    if (input) {
      try {
        const parsed = JSON.parse(input);
        const slug = parsed.json?.slug || parsed.slug;
        const post = BLOG_POSTS.find(p => p.slug === slug);
        if (post) {
          return new Response(JSON.stringify({
            result: { data: { json: post, meta: { values: {} } } }
          }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
      } catch (e) {}
    }
    return new Response(JSON.stringify({ result: { data: { json: null } } }), {
      headers: { "Content-Type": "application/json" }
    });
  }
  
  // leads.capture - envia para Google Sheets + WhatsApp + Meta CAPI
  if (path === "leads.capture" && context.request.method === "POST") {
    try {
      const body = await context.request.json();
      const leadData = body.json || body;
      
      // Validar campos obrigatórios
      if (!leadData.name || !leadData.email || !leadData.whatsapp) {
        return new Response(JSON.stringify({
          result: { data: { json: { success: false, error: 'Campos obrigatórios ausentes' } } }
        }), {
          headers: { "Content-Type": "application/json" },
          status: 400
        });
      }

      // Extrair informações do contexto
      const clientIp = context.request.headers.get('cf-connecting-ip') || '0.0.0.0';
      const userAgent = context.request.headers.get('user-agent') || '';
      const sourceUrl = context.request.headers.get('referer') || `https://psicodelix.com.br/${leadData.persona || 'home'}`;

      // Calcular protocolo
      const protocol = getProtocol(leadData.persona || 'home', leadData.usesMedication || false);
      
      // Executar todas as ações em paralelo (sem aguardar)
      // Log local para consulta posterior (perfil falecom@psicodelix.com.br)
      console.log(`[LEAD_CAPTURE] ${new Date().toISOString()} | Nome: ${leadData.name} | Email: ${leadData.email} | WhatsApp: ${leadData.whatsapp} | Protocolo: ${protocol}`);

      Promise.allSettled([
        saveToGoogleSheets({ ...leadData, protocol }, clientIp, userAgent),
        sendMetaCAPI({ ...leadData, protocol }, clientIp, userAgent, sourceUrl),
        sendWhatsAppEbook(leadData),
      ]).catch(err => console.error('[Promise.allSettled] Erro:', err));

      // Retornar sucesso imediatamente
      return new Response(JSON.stringify({
        result: { data: { json: { success: true, id: Date.now(), protocol } } }
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } catch (e) {
      console.error('[leads.capture] Erro:', e);
      return new Response(JSON.stringify({
        result: { data: { json: { success: true, id: Date.now() } } }
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }
  
  // auth.me - retorna null (sem autenticação no estático)
  
  // blog.get - busca um post pelo slug
  if (path === "blog.get") {
    try {
      const input = JSON.parse(url.searchParams.get("batch") || "{}")["0"]?.json || {};
      const slug = input.slug;
      const post = BLOG_POSTS.find(p => p.slug === slug);
      return new Response(JSON.stringify({
        result: { data: { json: post || null } }
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ result: { data: { json: null } } }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }

  if (path === "auth.me") {
    return new Response(JSON.stringify({
      result: { data: { json: null } }
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
  
  // Qualquer outra rota tRPC - retorna vazio
  return new Response(JSON.stringify({
    result: { data: { json: null } }
  }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
