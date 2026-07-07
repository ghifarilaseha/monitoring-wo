import './globals.css';

export const metadata = {
  title: 'Monitoring Pekerjaan — OTTO',
  description: 'Utility Monitoring System',
  icons: {
    icon: '/otto-logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
