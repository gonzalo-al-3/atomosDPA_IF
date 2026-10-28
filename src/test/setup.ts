import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock básico de HTMLCanvasElement para entornos JSDOM (headless)
HTMLCanvasElement.prototype.getContext = vi.fn();
