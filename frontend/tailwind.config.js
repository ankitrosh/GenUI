/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(99, 102, 241, 0.12), 0 4px 16px -4px rgba(99, 102, 241, 0.2)',
      },
      backgroundImage: {
        aurora:
          'radial-gradient(circle at 20% 20%, rgba(99,102,241,0.08), transparent 32%), radial-gradient(circle at 80% 0%, rgba(45,212,191,0.08), transparent 22%)',
      },
    },
  },
  plugins: [],
};
