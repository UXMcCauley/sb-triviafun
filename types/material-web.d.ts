declare namespace JSX {
  interface IntrinsicElements {
    'md-switch': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      selected?: boolean;
      disabled?: boolean;
    };
  }
}

