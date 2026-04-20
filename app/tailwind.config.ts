import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#1C1B1A',
          800: '#242322',
          700: '#2E2D2C',
          600: '#3A3937',
          500: '#4A4946',
          400: '#5D5C58',
          300: '#7A7874',
          200: '#A19E99',
          100: '#C8C5BF',
        },
        cream: {
          50: '#FCFAF5',
          100: '#F8F3EA',
          200: '#F1EBDC',
          300: '#E7DFCB',
          400: '#D8CDB2',
        },
        brand: {
          100: '#E8EFD0',
          300: '#A1B650',
          500: '#5B7A1E',
          700: '#384C12',
        },
        ember: '#EF4632',
        gold: '#C89A24',
      },
      fontFamily: {
        sans: ['"Thmanyah Sans"', '"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
        display: ['"Thmanyah Serif Display"', '"Thmanyah Serif Text"', 'Amiri', 'serif'],
        text: ['"Thmanyah Serif Text"', '"Thmanyah Serif Display"', 'Amiri', 'serif'],
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
    },
  },
  plugins: [],
};

export default config;
