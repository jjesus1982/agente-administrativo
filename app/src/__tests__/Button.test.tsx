import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, IconButton, LoadingSpinner } from '@/components/ui/Button';
import { Plus } from 'lucide-react';

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('renders with default variant (primary)', () => {
    render(<Button>Primary</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ backgroundColor: '#3b82f6' });
  });

  it('renders secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ backgroundColor: '#1e293b' });
  });

  it('renders danger variant', () => {
    render(<Button variant="danger">Danger</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ backgroundColor: '#dc2626' });
  });

  it('renders success variant', () => {
    render(<Button variant="success">Success</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ backgroundColor: '#16a34a' });
  });

  it('renders outline variant', () => {
    render(<Button variant="outline">Outline</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ backgroundColor: 'white' });
  });

  it('renders with small size', () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ fontSize: '0.75rem' });
  });

  it('renders with large size', () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ fontSize: '1rem' });
  });

  it('renders full width button', () => {
    render(<Button fullWidth>Full Width</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ width: '100%' });
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables button when disabled prop is true', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading spinner when loading prop is true', () => {
    render(<Button loading>Loading</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    // Loading spinner should be rendered (SVG element)
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders icon on the left by default', () => {
    render(
      <Button icon={<Plus data-testid="plus-icon" />}>
        With Icon
      </Button>
    );

    expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
    expect(screen.getByText('With Icon')).toBeInTheDocument();
  });

  it('renders icon on the right when iconPosition is right', () => {
    render(
      <Button icon={<Plus data-testid="plus-icon" />} iconPosition="right">
        With Icon
      </Button>
    );

    expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
    expect(screen.getByText('With Icon')).toBeInTheDocument();
  });
});

describe('IconButton Component', () => {
  it('renders icon button', () => {
    render(<IconButton icon={<Plus data-testid="icon" />} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders with tooltip', () => {
    render(<IconButton icon={<Plus />} tooltip="Add item" />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Add item');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<IconButton icon={<Plus />} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables button when disabled prop is true', () => {
    render(<IconButton icon={<Plus />} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies correct size styles', () => {
    render(<IconButton icon={<Plus />} size="sm" />);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ width: '28px', height: '28px' });
  });
});

describe('LoadingSpinner Component', () => {
  it('renders with default size', () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('renders with custom size', () => {
    const { container } = render(<LoadingSpinner size={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('has spinning animation', () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveStyle({ animation: 'spin 1s linear infinite' });
  });
});
