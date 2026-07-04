import './globals.css';

export const metadata = {
  title: 'Monitoring Pekerjaan',
  description: 'Monitoring pekerjaan harian tim',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
