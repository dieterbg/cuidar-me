import { vi } from 'vitest';

/**
 * Helper para criar mocks chainable do Supabase.
 *
 * Uso:
 *   const { mock, mockFrom } = createMockSupabase();
 *   mockFrom('patients', { data: [...], error: null });
 *   // vi.mock('@/lib/supabase-server', () => ({ createClient: () => mock }));
 */

export interface MockResult {
    data: any;
    error: any;
    count?: number;
}

export function createChainMock(defaultResult: MockResult = { data: null, error: null }) {
    let currentResult = { ...defaultResult };

    const chain: any = {
        _result: currentResult,
        _setResult(r: MockResult) { currentResult = r; chain._result = r; },
    };

    // All chainable methods return the chain itself
    const chainMethods = [
        'select', 'insert', 'update', 'delete', 'upsert',
        'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in',
        'order', 'limit', 'range', 'single', 'maybeSingle',
        'textSearch', 'filter', 'match', 'not', 'or', 'contains',
    ];

    for (const method of chainMethods) {
        chain[method] = vi.fn(() => chain);
    }

    // Make thenable — resolves to the current result
    chain.then = (resolve: any, reject?: any) => {
        try {
            resolve(currentResult);
        } catch (e) {
            if (reject) reject(e);
        }
    };

    return chain;
}

/**
 * Cria um mock completo do Supabase client com controle por tabela.
 */
export function createMockSupabase() {
    const tableResults = new Map<string, MockResult>();
    const tableChains = new Map<string, any>();

    const mock: any = {
        from: vi.fn((table: string) => {
            if (!tableChains.has(table)) {
                const chain = createChainMock(
                    tableResults.get(table) || { data: null, error: null }
                );
                tableChains.set(table, chain);
            }
            const chain = tableChains.get(table)!;
            // Always refresh result in case it was set after chain creation
            const result = tableResults.get(table) || { data: null, error: null };
            chain._setResult(result);
            return chain;
        }),
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id' } } }),
            admin: {
                getUserById: vi.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id' } }, error: null }),
            },
        },
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    /**
     * Define o resultado para uma tabela.
     */
    function mockFrom(table: string, result: MockResult) {
        tableResults.set(table, result);
        // Se o chain já foi criado, atualizar
        if (tableChains.has(table)) {
            tableChains.get(table)!._setResult(result);
        }
    }

    /**
     * Reseta todos os resultados e chains.
     */
    function resetAll() {
        tableResults.clear();
        tableChains.clear();
        mock.from.mockClear();
    }

    return { mock, mockFrom, resetAll };
}

/**
 * Cria mocks padrão para os módulos Next.js/Supabase.
 * Chamar dentro de vi.mock() factories ou em beforeEach.
 */
export function mockNextCache() {
    return {
        revalidatePath: vi.fn(),
        revalidateTag: vi.fn(),
    };
}
