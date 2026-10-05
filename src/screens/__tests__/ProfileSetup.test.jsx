import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProfileSetup from '../ProfileSetup';

// Mock Firebase
vi.mock('../../firebase', () => ({
  auth: {
    currentUser: { uid: '123', email: 'testuser@chatapp.local' }
  },
  db: {}
}));

// Mock Firestore setDoc
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue()
}));

// Mock image processing
vi.mock('../../utils/image', () => ({
  processImage: vi.fn().mockResolvedValue('data:image/jpeg;base64,mockbase64data')
}));

describe('ProfileSetup Component', () => {
  let onSetupComplete;

  beforeEach(() => {
    onSetupComplete = vi.fn();
    vi.clearAllMocks();
  });

  it('renders profile setup form', () => {
    render(<ProfileSetup onSetupComplete={onSetupComplete} />);
    expect(screen.getByRole('heading', { name: /complete your profile/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/display name/i)).toBeInTheDocument();
    expect(screen.getByText(/upload dp/i)).toBeInTheDocument();
  });

  it('handles image upload and enables submit when both fields are filled', async () => {
    render(<ProfileSetup onSetupComplete={onSetupComplete} />);

    // Initially submit is disabled because display name and photo are missing
    const submitBtn = screen.getByRole('button', { name: /finish setup/i });
    expect(submitBtn).toBeDisabled();

    // Fill display name
    fireEvent.change(screen.getByPlaceholderText(/display name/i), { target: { value: 'Test User' } });

    // Mock file upload
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      // Photo should appear
      expect(screen.getByAltText('Profile preview')).toBeInTheDocument();
      // Button should be enabled
      expect(submitBtn).not.toBeDisabled();
    });
  });
});
