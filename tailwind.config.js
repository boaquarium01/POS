/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // 這裡最重要，確保 React 檔案被掃描
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}