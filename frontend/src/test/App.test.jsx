import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

vi.mock('heic2any', () => ({ default: vi.fn() }));

function makeFile(name, type, sizeBytes) {
  const file = new File(['x'.repeat(Math.min(sizeBytes, 1024))], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

describe('App – initial render', () => {
  it('renders the Calorie Estimator heading and disabled analyze button', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /calorie estimator/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyze calories/i })).toBeDisabled();
  });
});

describe('App – file size validation', () => {
  it('rejects files over 5MB before any network call', async () => {
    render(<App />);
    const oversized = makeFile('big.jpg', 'image/jpeg', 6 * 1024 * 1024);

    const input = document.querySelector('input[type="file"]');
    await fireEvent.change(input, { target: { files: [oversized] } });

    expect(await screen.findByRole('alert')).toHaveTextContent(/too large/i);
    expect(screen.getByRole('button', { name: /analyze calories/i })).toBeDisabled();
  });
});

describe('App – analysis result rendering', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isFood: true,
        items: [
          { name: 'Pizza slice', calories: 285 },
          { name: 'Side salad', calories: 65 },
        ],
        totalCalories: 350,
        notes: 'Assumes one medium slice.',
      }),
    });
  });

  it('renders structured calorie card with total, items, and notes', async () => {
    const user = userEvent.setup();
    render(<App />);

    const file = makeFile('food.jpg', 'image/jpeg', 100 * 1024);
    const input = document.querySelector('input[type="file"]');
    await fireEvent.change(input, { target: { files: [file] } });

    await user.click(screen.getByRole('button', { name: /analyze calories/i }));

    await waitFor(() =>
      expect(screen.getByRole('region', { name: /calorie analysis/i })).toBeInTheDocument()
    );

    expect(screen.getByText(/~350 cal/i)).toBeInTheDocument();
    expect(screen.getByText('Pizza slice')).toBeInTheDocument();
    expect(screen.getByText('Side salad')).toBeInTheDocument();
    expect(screen.getByText(/medium slice/i)).toBeInTheDocument();
  });

  it('shows "not food" empty state when isFood is false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isFood: false,
        items: [],
        totalCalories: 0,
        notes: "This doesn't look like food.",
      }),
    });

    const user = userEvent.setup();
    render(<App />);

    const file = makeFile('cat.jpg', 'image/jpeg', 100 * 1024);
    const input = document.querySelector('input[type="file"]');
    await fireEvent.change(input, { target: { files: [file] } });

    await user.click(screen.getByRole('button', { name: /analyze calories/i }));

    expect(await screen.findByText(/That doesn't look like food/i)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /calorie analysis/i })).not.toBeInTheDocument();
  });
});

describe('App – error handling', () => {
  it('surfaces backend error message when analyze fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Anthropic API credits exhausted.' }),
    });

    const user = userEvent.setup();
    render(<App />);

    const file = makeFile('food.jpg', 'image/jpeg', 100 * 1024);
    const input = document.querySelector('input[type="file"]');
    await fireEvent.change(input, { target: { files: [file] } });

    await user.click(screen.getByRole('button', { name: /analyze calories/i }));

    expect(await screen.findByText(/credits exhausted/i)).toBeInTheDocument();
  });
});
