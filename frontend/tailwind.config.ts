import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Full Flexoki palette with both hex (for reference) and OKLCH values
        flexoki: {
          // Base/neutral colors
          base: {
            black: 'oklch(0.170 0.002 17.3)', // #100F0F
            950: 'oklch(0.223 0.002 67.7)', // #1C1B1A
            900: 'oklch(0.273 0.002 67.7)', // #282726
            850: 'oklch(0.321 0.004 84.6)', // #343331
            800: 'oklch(0.365 0.004 67.7)', // #403E3C
            700: 'oklch(0.453 0.005 91.5)', // #575653
            600: 'oklch(0.538 0.008 97.4)', // #6F6E69
            500: 'oklch(0.617 0.008 88.7)', // #878580
            300: 'oklch(0.772 0.013 96.5)', // #B7B5AC
            200: 'oklch(0.846 0.014 102.1)', // #CECDC3
            150: 'oklch(0.881 0.014 97.5)', // #DAD8CE
            100: 'oklch(0.917 0.015 98.3)', // #E6E4D9
            50: 'oklch(0.954 0.015 98.3)', // #F2F0E5
            paper: 'oklch(0.990 0.016 95.2)', // #FFFCF0
          },
          // Accent colors
          red: {
            DEFAULT: 'oklch(0.504 0.165 27.8)', // #AF3029
            light: 'oklch(0.597 0.169 28.4)', // #D14D41
          },
          orange: {
            DEFAULT: 'oklch(0.567 0.152 45.0)', // #BC5215
            light: 'oklch(0.658 0.154 49.3)', // #DA702C
          },
          yellow: {
            DEFAULT: 'oklch(0.633 0.129 85.8)', // #AD8301
            light: 'oklch(0.735 0.146 87.5)', // #D0A215
          },
          green: {
            DEFAULT: 'oklch(0.559 0.134 122.9)', // #66800B
            light: 'oklch(0.651 0.124 119.4)', // #879A39
          },
          cyan: {
            DEFAULT: 'oklch(0.554 0.086 186.7)', // #24837B
            light: 'oklch(0.670 0.100 186.6)', // #3AA99F
          },
          blue: {
            DEFAULT: 'oklch(0.482 0.131 254.8)', // #205EA6
            light: 'oklch(0.599 0.110 247.0)', // #4385BE
          },
          purple: {
            DEFAULT: 'oklch(0.454 0.145 294.8)', // #5E409D
            light: 'oklch(0.635 0.110 291.0)', // #8B7EC8
          },
          magenta: {
            DEFAULT: 'oklch(0.495 0.161 349.8)', // #A02F6F
            light: 'oklch(0.635 0.156 350.5)', // #CE5D97
          },
        },
      },
    },
  },
  plugins: [],
}

export default config