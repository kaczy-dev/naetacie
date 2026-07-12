import { describe, it, expect } from 'vitest';
import { EmptyState, EmptyStateProps } from './EmptyState';

describe('EmptyState', () => {
  it('exports EmptyState as a function component', () => {
    expect(typeof EmptyState).toBe('function');
  });

  it('accepts required props: title and message', () => {
    const props: EmptyStateProps = {
      title: 'No announcements found',
      message: 'Adjust your filters or check back later',
    };
    expect(props.title).toBe('No announcements found');
    expect(props.message).toBe('Adjust your filters or check back later');
  });

  it('accepts optional action prop with label and onClick', () => {
    const props: EmptyStateProps = {
      title: 'No results',
      message: 'Try different search terms',
      action: {
        label: 'Clear filters',
        onClick: () => {},
      },
    };
    expect(props.action).toBeDefined();
    expect(props.action!.label).toBe('Clear filters');
    expect(typeof props.action!.onClick).toBe('function');
  });

  it('accepts optional icon prop', () => {
    const props: EmptyStateProps = {
      title: 'Empty',
      message: 'Nothing here',
      icon: null, // ReactNode can be null
    };
    expect(props).toHaveProperty('icon');
  });

  it('default export matches named export', async () => {
    const mod = await import('./EmptyState');
    expect(mod.default).toBe(mod.EmptyState);
  });
});
