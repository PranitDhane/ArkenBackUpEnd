/**
 * Tests for ImageLightbox component and resolveImageSrc helper.
 *
 * Covers: lightbox rendering, close interactions (backdrop, Escape, X button),
 * resolveImageSrc data URI resolution, ARIA accessibility, and MessageBubble integration.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageLightbox from '../components/modals/ImageLightbox';
import { resolveImageSrc } from '../utils/imageSource';

// ── resolveImageSrc ──────────────────────────────────────────────────────────

describe('resolveImageSrc', () => {
  it('returns att.preview when it starts with data:', () => {
    const att = { preview: 'data:image/png;base64,abc', data: 'abc', media_type: 'image/png' };
    expect(resolveImageSrc(att)).toBe('data:image/png;base64,abc');
  });

  it('constructs data URI when preview is a blob URL', () => {
    const att = { preview: 'blob:http://localhost:5173/some-id', data: 'abc', media_type: 'image/png' };
    expect(resolveImageSrc(att)).toBe('data:image/png;base64,abc');
  });

  it('constructs data URI when preview is absent', () => {
    const att = { data: 'base64data', media_type: 'image/jpeg' };
    expect(resolveImageSrc(att)).toBe('data:image/jpeg;base64,base64data');
  });

  it('returns null when both preview and data are missing', () => {
    const att = { media_type: 'image/png' };
    expect(resolveImageSrc(att)).toBeNull();
  });

  it('returns null when data exists but media_type is missing', () => {
    const att = { data: 'abc' };
    expect(resolveImageSrc(att)).toBeNull();
  });
});

// ── ImageLightbox component ──────────────────────────────────────────────────

describe('ImageLightbox', () => {
  const defaultProps = {
    src: 'data:image/png;base64,abc123',
    alt: 'test image',
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the image with the provided src and alt', () => {
    render(<ImageLightbox {...defaultProps} />);
    const img = screen.getByAltText('test image');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'data:image/png;base64,abc123');
  });

  it('calls onClose when clicking the backdrop', () => {
    const onClose = vi.fn();
    render(<ImageLightbox {...defaultProps} onClose={onClose} />);
    // Click the fixed backdrop div (the dialog element itself)
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking the image', () => {
    const onClose = vi.fn();
    render(<ImageLightbox {...defaultProps} onClose={onClose} />);
    const img = screen.getByAltText('test image');
    fireEvent.click(img);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<ImageLightbox {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<ImageLightbox {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTitle('Close (Esc)'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has role="dialog" and aria-modal="true"', () => {
    render(<ImageLightbox {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('has descriptive aria-label', () => {
    render(<ImageLightbox {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Image preview: test image');
  });

  it('image is not draggable', () => {
    render(<ImageLightbox {...defaultProps} />);
    const img = screen.getByAltText('test image');
    expect(img).toHaveAttribute('draggable', 'false');
  });
});

// ── MessageBubble integration ────────────────────────────────────────────────

// Mock MarkdownRenderer to avoid pulling in the full markdown pipeline
vi.mock('../components/markdown/MarkdownRenderer', () => ({
  default: ({ content }) => <div data-testid="markdown">{content}</div>,
}));

import MessageBubble from '../components/chat/MessageBubble';

describe('MessageBubble image lightbox integration', () => {
  const imageAttachment = {
    media_type: 'image/png',
    data: 'abc123base64',
    filename: 'diagram.png',
  };

  const userMessageWithImage = {
    role: 'user',
    content: 'Here is the diagram',
    attachments: [imageAttachment],
  };

  const userMessageWithPdf = {
    role: 'user',
    content: 'See attached PDF',
    attachments: [{
      media_type: 'application/pdf',
      data: 'pdfdata',
      filename: 'report.pdf',
    }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not call window.open when image thumbnail is clicked', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<MessageBubble message={userMessageWithImage} />);
    const img = screen.getByAltText('diagram.png');
    fireEvent.click(img);
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it('opens lightbox when image thumbnail is clicked', () => {
    render(<MessageBubble message={userMessageWithImage} />);
    const thumbnail = screen.getByAltText('diagram.png');
    fireEvent.click(thumbnail);
    // Lightbox dialog should now be in the DOM
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Lightbox image should have the data URI src
    const lightboxImg = dialog.querySelector('img');
    expect(lightboxImg).toHaveAttribute('src', 'data:image/png;base64,abc123base64');
  });

  it('closes lightbox when backdrop is clicked', () => {
    render(<MessageBubble message={userMessageWithImage} />);
    fireEvent.click(screen.getByAltText('diagram.png'));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not render lightbox for PDF attachment', () => {
    render(<MessageBubble message={userMessageWithPdf} />);
    // PDF renders as a chip with filename text, not an image
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders thumbnail using resolveImageSrc (data URI, not blob)', () => {
    render(<MessageBubble message={userMessageWithImage} />);
    const thumbnail = screen.getByAltText('diagram.png');
    expect(thumbnail.getAttribute('src')).toBe('data:image/png;base64,abc123base64');
  });

  it('renders lightbox for attachment loaded from history (no preview field)', () => {
    const historyAttachment = { media_type: 'image/jpeg', data: 'historydata', filename: 'old.jpg' };
    const msg = { role: 'user', content: 'Old message', attachments: [historyAttachment] };
    render(<MessageBubble message={msg} />);
    const thumbnail = screen.getByAltText('old.jpg');
    expect(thumbnail.getAttribute('src')).toBe('data:image/jpeg;base64,historydata');
    fireEvent.click(thumbnail);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
