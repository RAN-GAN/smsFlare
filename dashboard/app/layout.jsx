import './globals.css';

export const metadata = {
  title: 'SMS Flare - Distributed SMS Gateway',
  description: 'Send SMS through distributed Android devices',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
