import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Login from '../Login';
import * as authUtils from '../../utils/auth';

vi.mock('../../utils/auth', () => ({
  signUp: vi.fn(),
  logIn: vi.fn()
}));

describe('Login Component', () => {
  it('renders login form by default', () => {
    render(<Login />);
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('switches to signup form', () => {
    render(<Login />);
    fireEvent.click(screen.getByText(/sign up/i));
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('calls login function on submit', async () => {
    authUtils.logIn.mockResolvedValueOnce({ uid: '123' });
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(authUtils.logIn).toHaveBeenCalledWith('testuser', 'password123');
    });
  });

  it('shows error on login failure', async () => {
    authUtils.logIn.mockRejectedValueOnce(new Error('Invalid credentials'));
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});
