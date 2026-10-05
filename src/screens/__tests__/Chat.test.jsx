import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Chat from '../Chat';

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
    useParams: () => ({ chatId: 'u1_u2' })
  };
});

// Mock Scroll
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock Firestore
const mockOnSnapshot = vi.fn().mockImplementation((query, callback) => {
  // We need to defer the callback to allow initial render to complete
  setTimeout(() => {
    act(() => {
      callback({
        docs: [
          { id: 'm1', data: () => ({ senderId: 'u2', text: 'Hello', createdAt: '2023-01-01T10:00:00Z' }) },
          { id: 'm2', data: () => ({ senderId: 'u1', text: 'Hi there', createdAt: '2023-01-01T10:01:00Z' }) }
        ],
        forEach(cb) { this.docs.forEach(cb) }
      });
    });
  }, 0);
  return vi.fn(); // unsubscribe
});

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  onSnapshot: (...args) => mockOnSnapshot(...args),
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({ members: ['u1', 'u2'], displayName: 'Friend', photoB64: 'data:image/jpeg;base64,123' })
  }),
  setDoc: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({}),
  getDocs: vi.fn()
}));

const mockUser = { uid: 'u1' };

describe('Chat Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders chat messages and handles sending', async () => {
    render(
      <BrowserRouter>
        <Chat user={mockUser} />
      </BrowserRouter>
    );

    // Wait for the loading to finish and messages to appear
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Hi there')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/message.../i);
    const sendBtn = screen.getByRole('button', { name: /send/i });

    expect(sendBtn).toBeDisabled();

    act(() => {
      fireEvent.change(input, { target: { value: 'New message' } });
    });
    expect(sendBtn).not.toBeDisabled();

    act(() => {
      fireEvent.click(sendBtn);
    });

    // The addDoc function should have been called
    const { addDoc } = await import('firebase/firestore');
    await waitFor(() => {
      expect(addDoc).toHaveBeenCalled();
      // Input should be cleared
      expect(input.value).toBe('');
    });
  });
});
