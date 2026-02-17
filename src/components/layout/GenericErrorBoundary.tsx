/**
 * Proposta: Limite de erro (Error Boundary) genérico para captura de falhas de renderização.
 * Fluxo: Intercepta erros no ciclo de vida dos componentes filhos, exibe uma interface de erro amigável com stack trace e evita o travamento total da aplicação.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { LanguageContext } from '../../context/LanguageDefinition';

interface Props {
    children: ReactNode;
    componentName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class GenericErrorBoundary extends Component<Props, State> {
    static contextType = LanguageContext;
    declare context: React.ContextType<typeof LanguageContext>;

    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Uncaught error in ${this.props.componentName || 'Component'}:`, error, errorInfo);
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            const { t } = this.context;
            return (
                <div className="p-6 bg-red-50 text-red-900 rounded-xl border border-red-200 shadow-sm m-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <AlertTriangle className="text-red-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">{t('errors.somethingWentWrong').replace('{0}', this.props.componentName || 'Component')}</h2>
                            <p className="text-sm text-red-700">{t('errors.verifyData')}</p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded border border-red-100 overflow-auto max-h-64 font-mono text-xs text-slate-600">
                        <p className="font-bold text-red-600 mb-2">{this.state.error && this.state.error.toString()}</p>
                        <details>
                            <summary className="cursor-pointer hover:text-red-800 mb-2">{t('errors.stackTrace')}</summary>
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </details>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
