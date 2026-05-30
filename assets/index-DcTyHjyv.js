(function() {
    // Injeção de CSS Premium para garantir o design dos novos cards
    const style = document.createElement('style');
    style.innerHTML = `
        .protocol-card-new { display: flex; flex-direction: column; background: #0A1628; border-radius: 1.5rem; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); height: 100%; transition: transform 0.3s ease; }
        .protocol-card-new:hover { transform: translateY(-5px); }
        .protocol-card-new img { height: 220px; width: 100%; object-fit: cover; }
        .protocol-card-new .p-6 { padding: 1.5rem; flex-grow: 1; display: flex; flex-direction: column; }
        .protocol-card-new h3 { color: white; font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; font-family: 'Playfair Display', serif; }
        .protocol-card-new .subtitle { color: #8B5CF6; font-size: 0.875rem; font-weight: 600; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .protocol-card-new p { color: rgba(255,255,255,0.7); font-size: 1rem; line-height: 1.6; margin-bottom: 1.5rem; flex-grow: 1; }
        .protocol-card-new .price-box { margin-top: auto; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1.5rem; }
        .protocol-card-new .price-old { color: rgba(255,255,255,0.4); text-decoration: line-through; font-size: 0.875rem; }
        .protocol-card-new .price-new { color: white; font-size: 1.75rem; font-weight: 800; margin-bottom: 1.5rem; }
        .protocol-card-new .btn-p { width: 100%; background: #8B5CF6; color: white; font-weight: 700; padding: 1rem; border-radius: 0.75rem; text-align: center; text-decoration: none; display: block; }
    `;
    document.head.appendChild(style);

    const PROTOCOLS_DATA = [
        {
            id: 'med',
            name: 'Protocolo MED',
            subtitle: 'Psicoterapia Digital por IA',
            desc: 'Acompanhamento terapêutico personalizado por inteligência artificial, com protocolos baseados em neurociência. Ideal para quem busca flexibilidade e resultados mensuráveis.',
            price: 'R$ 217,00',
            oldPrice: 'R$ 397,00',
            img: '/assets-media/psicod-med_2be21eef.jpg',
            url: 'https://loja.psicodelix.com/products/protocolo-med-psicoterapia-digital-por-ia',
            color: '#8B5CF6'
        },
        {
            id: 'eleve',
            name: 'Protocolo ELEVE',
            subtitle: 'Psicoterapia Assistida — 30 dias',
            desc: 'Acompanhamento humano especializado com psicoterapeutas certificados. Ideal para quem prefere consultas online devido à distância e não estar em Belo Horizonte.',
            price: 'R$ 720,00',
            oldPrice: 'R$ 837,00',
            img: '/assets-media/eleve_2026.jpg',
            url: 'https://loja.psicodelix.com/products/pesquisa-etnobotanica-psicoterapia-assistida-por-psicodelicos-protocolo-30-dias',
            color: '#8B5CF6'
        },
        {
            id: 'nexus',
            name: 'Protocolo NEXUS',
            subtitle: 'Imersão Terapêutica em Brumadinho',
            desc: 'Expansão do Protocolo MED: preparação digital + imersão presencial em sítio terapêutico em Brumadinho. Conexão profunda com a natureza e protocolos avançados.',
            price: 'Sob Consulta',
            oldPrice: '',
            img: '/assets-media/nexus-square_80e29cc6.png',
            url: 'https://loja.psicodelix.com/products/protocolo-nexus-imersao-terapeutica-brumadinho',
            color: '#8B5CF6'
        },
        {
            id: 'dess',
            name: 'Protocolo DESS',
            subtitle: 'Psicoterapia Intensiva — 60 dias',
            desc: 'Foco em segurança clínica e desmame assistido de medicações. Protocolo mais indicado para usuários de drogas ou remédios.',
            price: 'R$ 1.350,00',
            oldPrice: 'R$ 1.527,00',
            img: '/assets-media/dess_2026.jpg',
            url: 'https://loja.psicodelix.com/products/pesquisa-etnobotanica-psicoterapia-assistida-por-psicodelicos-60-dias',
            color: '#14B8A6'
        }
    ];

    function createCard(p) {
        return `
            <div id="card-${p.id}" class="protocol-card-new">
                <img src="${p.img}" alt="${p.name}">
                <div class="p-6">
                    <div class="subtitle" style="color: ${p.color}">${p.subtitle}</div>
                    <h3>${p.name}</h3>
                    <p>${p.desc}</p>
                    <div class="price-box">
                        ${p.oldPrice ? `<div class="price-old">De ${p.oldPrice}</div>` : ''}
                        <div class="price-new">${p.price === 'Sob Consulta' ? p.price : `Por ${p.price}`}</div>
                        <a href="${p.url}" class="btn-p" style="background: ${p.color}">Conhecer o Protocolo</a>
                    </div>
                </div>
            </div>
        `;
    }

    function apply() {
        const container = document.querySelector('.grid.md\\\\:grid-cols-2') || 
                          document.querySelector('section#protocolos .grid') ||
                          document.querySelector('main .grid');
        
        if (!container) return;

        // Se estiver na página de ofertas, aplicar lógica de 3 cards
        const isOfertas = window.location.pathname.includes('ofertas') || document.body.innerText.includes('Protocolo Recomendado');
        const usesMed = localStorage.getItem('psicodelix_uses_medication') === 'true';

        let filtered = PROTOCOLS_DATA;
        if (isOfertas) {
            filtered = PROTOCOLS_DATA.filter(p => {
                if (usesMed) return p.id !== 'eleve';
                return p.id !== 'dess';
            });
            container.style.gridTemplateColumns = window.innerWidth > 1024 ? 'repeat(3, 1fr)' : '1fr';
        }

        const html = filtered.map(p => createCard(p)).join('');
        if (container.innerHTML !== html) {
            container.innerHTML = html;
        }
    }

    // Rodar imediatamente e manter sincronizado
    setInterval(apply, 300);
})();
// O código original do asset continua abaixo para não quebrar o resto do site
