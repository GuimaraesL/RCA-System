import React from 'react';
import { FmeaPanel } from './FmeaPanel';

export const FmeaView: React.FC = () => {
    return (
        <div className="h-full p-8 lg:p-12 max-w-[1200px] mx-auto overflow-y-auto">
            <FmeaPanel />
        </div>
    );
};
