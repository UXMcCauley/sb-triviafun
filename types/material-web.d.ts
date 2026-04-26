import type * as React from 'react';

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'md-switch': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
          selected?: boolean;
          disabled?: boolean;
        };
      }
    }
  }
}

export {};

