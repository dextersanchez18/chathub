import React from 'react';
import { render, screen, fireEvent, } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Home from '../Home';

// Mock Firebase init so we don't hit the valid-api-key error
vi.mock('../../firebase', () => ({
  auth: {},
  db: {}
}));

// Mock Router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Firestore
const mockOnSnapshot = vi.fn().mockReturnValue(vi.fn()); // returns a mock unsubscribe function
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: (...args) => mockOnSnapshot(...args),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  addDoc: vi.fn()
}));

const mockUser = { uid: 'u1' };

describe('Home Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders friends and invites tabs', () => {
    render(
      <BrowserRouter>
        <Home user={mockUser} />
      </BrowserRouter>
    );
    expect(screen.getByRole('button', { name: /friends/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /invites/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/add friend by username/i)).toBeInTheDocument();
  });

  it('switches to invites tab', () => {
    render(
      <BrowserRouter>
        <Home user={mockUser} />
      </BrowserRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /invites/i }));
    expect(screen.getByText(/no pending invites/i)).toBeInTheDocument();
  });

  it('unsubscribes on unmount', () => {
    const unsubMock1 = vi.fn();
    const unsubMock2 = vi.fn();
    const unsubMock3 = vi.fn();

    mockOnSnapshot
      .mockReturnValueOnce(unsubMock1)
      .mockReturnValueOnce(unsubMock2)
      .mockReturnValueOnce(unsubMock3);

    const { unmount } = render(
      <BrowserRouter>
        <Home user={mockUser} />
      </BrowserRouter>
    );

    unmount();

    expect(unsubMock1).toHaveBeenCalled();
    expect(unsubMock2).toHaveBeenCalled();
    expect(unsubMock3).toHaveBeenCalled();
  });
});
