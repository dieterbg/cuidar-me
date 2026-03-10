export interface StoreItem {
    id: string;
    name: string;
    description: string;
    cost: number; // Pontos necessários
    icon: string; // Emoji
    category: 'streak' | 'content' | 'consultation' | 'discount' | 'physical' | 'upgrade';
    tier: 'Bronze' | 'Prata' | 'Ouro' | 'Diamante' | 'Comum';
    type: 'instant' | 'redeemable'; // Instant = aplicado automaticamente, Redeemable = gera voucher
}

export const STORE_CATALOG: StoreItem[] = [
    {
        id: 'streak_freeze',
        name: '🛡️ Proteção de Streak',
        description: 'Não perca sua ofensiva se esquecer de registrar hoje.',
        cost: 300,
        icon: '🛡️',
        category: 'streak',
        tier: 'Comum',
        type: 'instant'
    },
    // BRONZE - 1.500 pts
    {
        id: 'ebook_receitas',
        name: '📚 E-book: 30 Receitas Rápidas',
        description: 'Guia prático para refeições nutritivas e saborosas.',
        cost: 1500,
        icon: '📚',
        category: 'content',
        tier: 'Bronze',
        type: 'redeemable'
    },
    {
        id: 'badge_bronze',
        name: '🥉 Badge Desbravador',
        description: 'Ícone exclusivo de Bronze para seu perfil e Dashboard.',
        cost: 1500,
        icon: '🥉',
        category: 'content',
        tier: 'Bronze',
        type: 'instant'
    },
    // PRATA - 4.000 pts
    {
        id: 'masterclass_fds',
        name: '🎬 Masterclass: Fim de Semana',
        description: 'Como manter o foco social sem furar a dieta.',
        cost: 4000,
        icon: '🎬',
        category: 'content',
        tier: 'Prata',
        type: 'redeemable'
    },
    {
        id: 'discount_cupom_15',
        name: '🎟️ Cupom de Parceiros (15%)',
        description: 'Desconto em lojas de suplementos e farmácias.',
        cost: 4000,
        icon: '🎟️',
        category: 'discount',
        tier: 'Prata',
        type: 'redeemable'
    },
    // OURO - 8.000 pts
    {
        id: 'physical_shirt',
        name: '👕 Camiseta Exclusiva Atleta',
        description: 'Receba em casa nossa camiseta oficial Cuidar.me.',
        cost: 8000,
        icon: '👕',
        category: 'physical',
        tier: 'Ouro',
        type: 'redeemable'
    },
    {
        id: 'consultation_15min_vip',
        name: '👩‍⚕️ Consultoria VIP (15min)',
        description: 'Alinhamento direto com nossa endocrinologista.',
        cost: 8000,
        icon: '👩‍⚕️',
        category: 'consultation',
        tier: 'Ouro',
        type: 'redeemable'
    },
    // DIAMANTE - 15.000 pts
    {
        id: 'physical_book_habits',
        name: '📖 Livro: Hábitos Atômicos',
        description: 'O guia definitivo para transformar sua rotina.',
        cost: 15000,
        icon: '📖',
        category: 'physical',
        tier: 'Diamante',
        type: 'redeemable'
    },
    {
        id: 'annual_discount_50',
        name: '💎 50% de Desconto (Anual)',
        description: 'Metade do preço na sua renovação anual Premium/VIP.',
        cost: 15000,
        icon: '💎',
        category: 'upgrade',
        tier: 'Diamante',
        type: 'redeemable'
    }
];

export function getStoreItem(itemId: string): StoreItem | undefined {
    return STORE_CATALOG.find(item => item.id === itemId);
}
