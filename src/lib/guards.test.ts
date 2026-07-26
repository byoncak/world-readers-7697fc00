import { describe, it, expect } from 'vitest';
import {
  clampPage,
  isStaleGen,
  cycleFilterFor,
  validateAuthForm,
} from './guards';

describe('clampPage', () => {
  it('clamps below zero to zero', () => {
    expect(clampPage(-5, 300)).toBe(0);
  });
  it('clamps above total to total', () => {
    expect(clampPage(9999, 300)).toBe(300);
  });
  it('rounds fractional input', () => {
    expect(clampPage(12.7, 300)).toBe(13);
  });
  it('treats a non-finite total as zero max', () => {
    expect(clampPage(50, Number.NaN)).toBe(0);
  });
});

describe('isStaleGen', () => {
  it('is stale when generation moved forward mid-flight', () => {
    expect(isStaleGen(3, 4)).toBe(true);
  });
  it('is not stale when generations match', () => {
    expect(isStaleGen(4, 4)).toBe(false);
  });
});

describe('cycleFilterFor', () => {
  it('filters by book id when a current book exists', () => {
    expect(cycleFilterFor('book-1')).toEqual({ kind: 'eq', bookId: 'book-1' });
  });
  it('filters by IS NULL when no current book exists', () => {
    // Regression: previously an empty bookId caused an unfiltered history
    // query that leaked resolved-cycle suggestions.
    expect(cycleFilterFor(null)).toEqual({ kind: 'is-null' });
    expect(cycleFilterFor(undefined)).toEqual({ kind: 'is-null' });
    expect(cycleFilterFor('')).toEqual({ kind: 'is-null' });
  });
});

describe('validateAuthForm', () => {
  it('rejects an empty name', () => {
    expect(
      validateAuthForm({ name: '   ', password: 'abcdef', confirmPassword: 'abcdef', mode: 'signin' }),
    ).toMatch(/name/i);
  });
  it('rejects a short password on sign in', () => {
    expect(
      validateAuthForm({ name: 'Ada', password: 'abc', confirmPassword: '', mode: 'signin' }),
    ).toMatch(/6 characters/);
  });
  it('rejects a password mismatch on sign up', () => {
    expect(
      validateAuthForm({ name: 'Ada', password: 'abcdef', confirmPassword: 'zzzzzz', mode: 'signup' }),
    ).toMatch(/match/i);
  });
  it('accepts a valid sign in', () => {
    expect(
      validateAuthForm({ name: 'Ada', password: 'abcdef', confirmPassword: '', mode: 'signin' }),
    ).toBeNull();
  });
  it('accepts forgot flow without a password', () => {
    expect(
      validateAuthForm({ name: 'Ada', password: '', confirmPassword: '', mode: 'forgot' }),
    ).toBeNull();
  });
});
