import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LevelProgress } from '@/components/level-progress';
import React from 'react';

// Simplificando mocks para isolamento total
vi.mock('lucide-react', () => ({
    Trophy: () => <div data-testid="trophy-icon">Trophy</div>,
}));

vi.mock('@/components/ui/progress', () => ({
    Progress: () => <div data-testid="progress-bar">Progress</div>,
}));

describe('LevelProgress Component', () => {
    it('deve renderizar o nível e tier corretos para 0 pontos', () => {
        render(<LevelProgress points={0} />);

        expect(screen.getByText(/Nível 1/i)).toBeDefined();
        expect(screen.getByText(/\(Bronze\)/i)).toBeDefined();
    });

    it('deve exibir os pontos restantes para o próximo nível', () => {
        // Nível 1 termina em 300. 100 pontos faltam 200.
        render(<LevelProgress points={100} />);

        expect(screen.getByText(/200 pts para próximo nível/i)).toBeDefined();
    });

    it('deve renderizar estado de nível máximo para pontuação alta', () => {
        // Nível 20 é 25000+
        render(<LevelProgress points={30000} />);

        expect(screen.getByText(/Nível 20/i)).toBeDefined();
        expect(screen.getByText(/Nível máximo atingido!/i)).toBeDefined();
    });

    it('não deve mostrar detalhes se showDetails for false', () => {
        render(<LevelProgress points={100} showDetails={false} />);

        expect(screen.queryByText(/pts para próximo nível/i)).toBeNull();
    });
});
