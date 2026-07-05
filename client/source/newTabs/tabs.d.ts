import React from 'react';
import { ReactNode } from 'react';
import './tabs.css';
export type TabsProps = {
    tabs: {
        id: string;
        title: ReactNode;
        content: ReactNode;
    }[];
    selectedTab: string;
    onSelectTab?: (tabId: string) => void;
};
export declare const Tabs: ({ tabs, selectedTab, onSelectTab }: TabsProps) => React.JSX.Element;
