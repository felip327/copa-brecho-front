// ========================================================
// CONFIGURAÇÕES DE CONEXÃO
// ========================================================
const API_URL = 'https://copa-brecho-back-felip327s-projects.vercel.app'; // URL do Backend Node.js na Vercel

// Credenciais do Supabase (para Realtime)
const SUPABASE_URL = 'https://gdmkeiqtdvlytmwvrzdh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkbWtlaXF0ZHZseXRtd3ZyemRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU3NzA1NCwiZXhwIjoyMDk3MTUzMDU0fQ.1u_NOkVEYOdzWom3OUaDW8BYoNSmfX3ypMbJFJKS4pc';

// Inicializa o cliente Supabase no Frontend
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ========================================================
// ESTADO GLOBAL
// ========================================================
let todosProdutos = [];          // Todos os produtos vindos da API
let categoriaAtiva = 'todos';    // Filtro ativo
let carrinho = [];               // Itens no carrinho

// ========================================================
// INICIALIZAÇÃO
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
    carregarCarrinhoDoStorage();
    carregarProdutosDoBrecho();
    inicializarRealtime();
});

// ========================================================
// TOAST NOTIFICATIONS (substitui alert/confirm nativos)
// ========================================================
function showToast(mensagem, tipo = 'info', duracao = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.style.setProperty('--toast-duration', `${duracao}ms`);

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };

    toast.innerHTML = `<span>${icons[tipo] || ''}</span><span>${mensagem}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, duracao + 400);
}

// ========================================================
// CARREGAR PRODUTOS DA API (GET) — BUG FIX: adicionado /api
// ========================================================
async function carregarProdutosDoBrecho() {
    try {
        const response = await fetch(`${API_URL}/api/produtos`);
        const produtos = await response.json();

        todosProdutos = produtos || [];
        renderizarProdutos();

    } catch (error) {
        console.error('Erro ao conectar com a API Node:', error);
        const container = document.getElementById('grid-produtos');
        container.innerHTML = `
            <div class="error-state">
                ❌ Erro ao conectar com o Backend Node.js. O servidor está ligado?
            </div>`;
    }
}

// ========================================================
// RENDERIZAR PRODUTOS (com filtro aplicado)
// ========================================================
function renderizarProdutos() {
    const container = document.getElementById('grid-produtos');
    container.innerHTML = '';

    // Aplicar filtro de categoria
    let produtosFiltrados = todosProdutos;
    if (categoriaAtiva !== 'todos') {
        produtosFiltrados = todosProdutos.filter(p => {
            const cat = (p.categoria || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return cat.includes(categoriaAtiva);
        });
    }

    if (!produtosFiltrados || produtosFiltrados.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                Nenhum item disponível nesta categoria por enquanto. 🥲
            </div>`;
        return;
    }

    produtosFiltrados.forEach((produto, index) => {
        const precoFormatado = produto.preco.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });

        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.animationDelay = `${index * 60}ms`;
        card.style.animation = `card-appear 0.5s cubic-bezier(0.16, 1, 0.3, 1) both`;
        card.style.animationDelay = `${index * 60}ms`;

        card.innerHTML = `
            <div class="card-image-wrapper">
                <img src="${produto.imagem_url}" alt="${produto.titulo}" class="card-image" loading="lazy">
                <span class="card-category-badge">${produto.categoria}</span>
            </div>
            <div class="card-body">
                <div class="card-info">
                    <h4 class="card-title">${produto.titulo}</h4>
                    <p class="card-desc">${produto.descricao}</p>
                </div>
                <div class="card-footer">
                    <span class="card-price">${precoFormatado}</span>
                    <button class="add-cart-btn" onclick="adicionarAoCarrinho('${produto.id}', '${produto.titulo.replace(/'/g, "\\'")}', ${produto.preco}, '${produto.imagem_url}', '${produto.categoria}')">
                        + Carrinho
                    </button>
                </div>
            </div>
        `;

        container.appendChild(card);
    });

    // Injetar animação de card-appear se ainda não existir
    if (!document.getElementById('card-appear-style')) {
        const style = document.createElement('style');
        style.id = 'card-appear-style';
        style.textContent = `
            @keyframes card-appear {
                from { opacity: 0; transform: translateY(20px) scale(0.97); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
}

// ========================================================
// FILTROS DE CATEGORIA
// ========================================================
function filtrarPorCategoria(categoria, btnElement) {
    categoriaAtiva = categoria;

    // Atualizar botão ativo
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    btnElement.classList.add('active');

    // Renderizar novamente com filtro
    renderizarProdutos();
}

// ========================================================
// SISTEMA DE CARRINHO
// ========================================================
function carregarCarrinhoDoStorage() {
    try {
        const salvo = localStorage.getItem('copa_carrinho');
        carrinho = salvo ? JSON.parse(salvo) : [];
    } catch {
        carrinho = [];
    }
    atualizarBadge();
}

function salvarCarrinhoNoStorage() {
    localStorage.setItem('copa_carrinho', JSON.stringify(carrinho));
}

function adicionarAoCarrinho(id, titulo, preco, imagem, categoria) {
    // Verificar se já está no carrinho
    const jaExiste = carrinho.find(item => item.id === id);
    if (jaExiste) {
        showToast('Este item já está no carrinho!', 'info');
        return;
    }

    carrinho.push({ id, titulo, preco, imagem, categoria });
    salvarCarrinhoNoStorage();
    atualizarBadge();
    atualizarDrawerCarrinho();

    showToast(`"${titulo}" adicionado ao carrinho!`, 'success');

    // Animar badge
    const badge = document.getElementById('carrinho-badge');
    badge.classList.remove('pulse');
    void badge.offsetWidth; // force reflow
    badge.classList.add('pulse');
}

function removerDoCarrinho(index) {
    const item = carrinho[index];
    carrinho.splice(index, 1);
    salvarCarrinhoNoStorage();
    atualizarBadge();
    atualizarDrawerCarrinho();

    if (item) {
        showToast(`"${item.titulo}" removido do carrinho.`, 'info');
    }
}

function atualizarBadge() {
    const badge = document.getElementById('carrinho-badge');
    badge.textContent = carrinho.length;
}

function toggleCarrinho() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');

    const isOpen = drawer.classList.contains('open');

    if (isOpen) {
        drawer.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    } else {
        atualizarDrawerCarrinho();
        drawer.classList.add('open');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function atualizarDrawerCarrinho() {
    const itemsContainer = document.getElementById('cart-items');
    const footer = document.getElementById('cart-footer');
    const drawerCount = document.getElementById('drawer-count');
    const totalEl = document.getElementById('cart-total');

    drawerCount.textContent = `${carrinho.length} ${carrinho.length === 1 ? 'item' : 'itens'}`;

    if (carrinho.length === 0) {
        itemsContainer.innerHTML = `
            <div class="cart-empty">
                <span class="cart-empty-icon">🛒</span>
                <span class="cart-empty-text">Seu carrinho está vazio</span>
            </div>
        `;
        footer.style.display = 'none';
        return;
    }

    footer.style.display = 'block';

    itemsContainer.innerHTML = carrinho.map((item, index) => {
        const preco = item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        return `
            <div class="cart-item">
                <img src="${item.imagem}" alt="${item.titulo}" class="cart-item-img">
                <div class="cart-item-info">
                    <span class="cart-item-title">${item.titulo}</span>
                    <span class="cart-item-price">${preco}</span>
                </div>
                <button class="cart-item-remove" onclick="removerDoCarrinho(${index})" aria-label="Remover item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        `;
    }).join('');

    // Total
    const total = carrinho.reduce((acc, item) => acc + item.preco, 0);
    totalEl.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ========================================================
// FINALIZAR COMPRA — processa todos os itens via API
// ========================================================
async function finalizarCompra() {
    if (carrinho.length === 0) return;

    const btn = document.getElementById('checkout-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Processando...';

    let sucesso = 0;
    let erros = 0;

    for (const item of carrinho) {
        try {
            const response = await fetch(`${API_URL}/api/comprar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    produto_id: item.id,
                    comprador_id: 1
                })
            });

            const resultado = await response.json();
console.log('Resposta da API:', resultado);
            console.log(resultado);

            if (resultado.success) {
                sucesso++;
            } else {
                erros++;
            }

        } catch (error) {
                console.error(error);
                erros++;
            }

            // Limpar carrinho
            carrinho = [];
            salvarCarrinhoNoStorage();
            atualizarBadge();
            atualizarDrawerCarrinho();

            btn.disabled = false;
            btn.textContent = '🏆 Finalizar Compra';

            // Fechar drawer
            toggleCarrinho();

            // Feedback
            if (erros === 0) {
                showToast(`🏆 ${sucesso} ${sucesso === 1 ? 'compra processada' : 'compras processadas'} com sucesso!`, 'success', 4000);
            } else {
                showToast(`${sucesso} processadas, ${erros} com erro. Tente novamente.`, 'error', 5000);
            }
        }

// ========================================================
// SUPABASE REALTIME
// ========================================================
function inicializarRealtime() {
            supabaseClient
                .channel('mudancas-produtos1')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos1' }, (payload) => {
                    console.log('Supabase Realtime: banco de dados atualizado!', payload);

                    // Recarregar produtos automaticamente
                    carregarProdutosDoBrecho();

                    // Remover do carrinho se um produto foi vendido
                    if (payload.eventType === 'UPDATE' && payload.new && payload.new.status === 'vendido') {
                        const vendidoId = payload.new.id;
                        const index = carrinho.findIndex(item => item.id === vendidoId);
                        if (index !== -1) {
                            carrinho.splice(index, 1);
                            salvarCarrinhoNoStorage();
                            atualizarBadge();
                            atualizarDrawerCarrinho();
                            showToast('Um item do seu carrinho foi vendido e foi removido.', 'info', 4000);
                        }
                    }
                })
                .subscribe();
            }
        }
