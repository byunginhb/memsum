/** @type {import('tailwindcss').Config} */
// 의미 색 토큰을 CSS 변수로 매핑 — 디자인시스템.md §2.1
// className="bg-primary text-text-primary dark:bg-bg-base" 형태로 사용.
const semanticColor = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

module.exports = {
  presets: [require('nativewind/preset')],
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: semanticColor('primary'),
        'primary-muted': semanticColor('primary-muted'),
        'primary-hover': semanticColor('primary-hover'),
        'on-primary': semanticColor('on-primary'),

        'bg-base': semanticColor('bg-base'),
        'bg-surface': semanticColor('bg-surface'),
        'bg-elevated': semanticColor('bg-elevated'),
        'bg-muted': semanticColor('bg-muted'),

        'text-primary': semanticColor('text-primary'),
        'text-secondary': semanticColor('text-secondary'),
        'text-on-accent': semanticColor('text-on-accent'),
        'text-disabled': semanticColor('text-disabled'),

        border: semanticColor('border'),
        'border-strong': semanticColor('border-strong'),

        accent: semanticColor('accent'),
        success: semanticColor('success'),
        danger: semanticColor('danger'),
        warning: semanticColor('warning'),
        info: semanticColor('info'),
      },
    },
  },
  plugins: [],
};
