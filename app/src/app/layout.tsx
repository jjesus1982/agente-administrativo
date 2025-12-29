import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Agente Administrativo Global',
    description: 'Portal de Gestão Administrativa Premium',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt-BR">
            <body suppressHydrationWarning={true}>{children}</body>
        </html>
    );
}
