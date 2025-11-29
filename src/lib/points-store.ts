export interface StoreItem {
    id: string;
    name: string;
    description: string;
    cost: number; // Pontos necessários
    icon: string; // Emoji
    category: 'streak' | 'content' | 'consultation' | 'discount' | 'exclusive';
    type: 'instant' | 'redeemable'; // Instant = aplicado automaticamente, Redeemable = gera voucher
}

export const STORE_CATALOG: StoreItem[] = [
    {
        id: 'streak_freeze',
        name: '🛡️ Proteção de Streak',
        description: 'Adiciona +1 proteção de streak (máx 2 por mês)',
        cost: 200,
        icon: '🛡️',
        category: 'streak',
        type: 'instant'
    },
    {
        id: 'video_premium_single',
        name: '📹 Vídeo Premium',
        description: 'Acesso a 1 vídeo VIP exclusivo',
        cost: 500,
        icon: '📹',
        category: 'content',
        type: 'instant'
    },
    {
        id: 'consultation_15min',
        name: '📞 Consultoria Express',
        description: '15 minutos com nutricionista',
        cost: 1000,
        icon: '📞',
        category: 'consultation',
        type: 'redeemable'
    },
    {
        id: 'discount_10',
        name: '🎁 Desconto 10%',
        description: 'Na próxima mensalidade',
        cost: 1500,
        icon: '🎁',
        category: 'discount',
        type: 'redeemable'
    },
    {
        id: 'custom_badge',
        name: '🏅 Badge Personalizado',
        description: 'Crie seu próprio badge único',
        cost: 2000,
        icon: '🏅',
        category: 'exclusive',
        type: 'redeemable'
    }
];

export function getStoreItem(itemId: string): StoreItem | undefined {
    return STORE_CATALOG.find(item => item.id === itemId);
}
