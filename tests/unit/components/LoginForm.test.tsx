import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginForm } from '@/components/auth/LoginForm';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader" />,
  Mail: () => <div />,
  Lock: () => <div />,
}));

// Mock SocialAuthButton
vi.mock('@/components/auth/SocialAuthButton', () => ({
  SocialAuthButton: ({ onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="social-auth-button">
      Social Auth
    </button>
  ),
}));

// Setup mocks for custom hooks
const mockSignIn = vi.fn();
const mockSignInWithGoogle = vi.fn();
const mockToast = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signInWithGoogle: mockSignInWithGoogle,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form correctly', () => {
    render(<LoginForm />);
    
    expect(screen.getByLabelText(/Email/i)).toBeDefined();
    expect(screen.getByLabelText(/Senha/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Entrar na Plataforma/i })).toBeDefined();
  });

  it('updates input values on change', () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/Senha/i) as HTMLInputElement;
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('calls signIn when form is submitted', async () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Senha/i);
    const submitButton = screen.getByRole('button', { name: /Entrar na Plataforma/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('calls signInWithGoogle when social button is clicked', () => {
    render(<LoginForm />);
    
    const socialButton = screen.getByTestId('social-auth-button');
    fireEvent.click(socialButton);
    
    expect(mockSignInWithGoogle).toHaveBeenCalled();
  });
});
