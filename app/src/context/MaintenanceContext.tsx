"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

// --- TYPES ---
export interface Ticket {
    id: string;
    protocol: string;
    title: string;
    description?: string;
    type: string;
    status: 'pendente' | 'em_andamento' | 'concluido' | 'cancelado';
    unit: string;
    createdBy: string;
    createdAt: string;
    history?: Array<{
        status: string;
        comment: string;
        updatedAt: string;
        updatedBy: string;
        attachment?: string;
    }>;
}

interface MaintenanceContextType {
    tickets: Ticket[];
    addTicket: (ticket: Ticket) => void;
    updateTicket: (ticket: Ticket) => void;
}

// --- MOCK DATA ---
const INITIAL_TICKETS: Ticket[] = [
    {
        id: '1', protocol: '70', title: 'Registro do Chuveiro emperrado', type: 'Hidráulica', status: 'pendente', unit: '3-102', createdBy: 'Helen', createdAt: '07/12/25 17:34',
        description: 'Registro principal do banheiro social não fecha completamente.',
        history: []
    },
    {
        id: '2', protocol: '69', title: 'Cadastro Facial de entrada', type: 'Outros', status: 'pendente', unit: '3-102', createdBy: 'Helen', createdAt: '07/12/25 17:26',
        description: 'Solicito cadastro facial para visitante recorrente.',
        history: []
    },
    {
        id: '3', protocol: '68', title: 'Lampada queimada', type: 'Elétrica', status: 'pendente', unit: '3-102', createdBy: 'Helen', createdAt: '06/12/25 17:34',
        description: 'Lâmpada do corredor do 3º andar queimada.',
        history: []
    },
    {
        id: '4', protocol: '57', title: 'Vazamento na pia da cozinha', type: 'Hidráulica', status: 'em_andamento', unit: '101', createdBy: 'João', createdAt: '05/12/25 10:00',
        description: 'Pia da cozinha vazando água por baixo do armário.',
        history: []
    },
    {
        id: '5', protocol: '56', title: 'Interfone mudo', type: 'Elétrica', status: 'concluido', unit: '205', createdBy: 'Maria', createdAt: '04/12/25 14:20',
        description: 'Interfone não está funcionando corretamente.',
        history: []
    }
];

// --- CONTEXT ---
const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export function MaintenanceProvider({ children }: { children: ReactNode }) {
    const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);

    const addTicket = (ticket: Ticket) => {
        setTickets(prev => [ticket, ...prev]);
    };

    const updateTicket = (updatedTicket: Ticket) => {
        setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
    };

    return (
        <MaintenanceContext.Provider value={{ tickets, addTicket, updateTicket }}>
            {children}
        </MaintenanceContext.Provider>
    );
}

// --- HOOK ---
export function useMaintenance() {
    const context = useContext(MaintenanceContext);
    if (context === undefined) {
        throw new Error('useMaintenance must be used within a MaintenanceProvider');
    }
    return context;
}
