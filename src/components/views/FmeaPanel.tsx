/**
 * Proposta: Painel de Gestão de Conhecimento FMEA (Nova Versão).
 * Fluxo: Gerencia documentos .md que alimentam a IA, permitindo upload via drag-and-drop.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AssetNode } from '../../types';
import {
  ShieldAlert, Trash2, FileText, Upload, Sparkles, AlertCircle
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageDefinition';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ConfirmModal } from '../modals/ConfirmModal';

interface FmeaFile {
  name: string;
  size: number;
  modified: number;
}

interface FmeaPanelProps {
  asset?: AssetNode;
}

export const FmeaPanel: React.FC<FmeaPanelProps> = ({ asset }) => {
  const { t } = useLanguage();
  const [files, setFiles] = useState<FmeaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteFilename, setDeleteFilename] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/ai/fmea/files', {
        headers: {
          'x-internal-key': 'dev-key-change-it' // TODO: Pegar do config
        }
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setFiles(data.files || []);
      setError(null);
    } catch (err) {
      setError(t('fmea.notifications.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!file.name.endsWith('.md')) {
      alert(t('fmea.notifications.invalidType'));
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/ai/fmea/upload', {
        method: 'POST',
        headers: {
          'x-internal-key': 'dev-key-change-it'
        },
        body: formData
      });

      if (!response.ok) throw new Error();
      
      await fetchFiles();
      alert(t('fmea.notifications.uploadSuccess'));
    } catch (err) {
      alert(t('fmea.notifications.error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await uploadFile(file);
    }
  };

  const handleDeleteFile = async () => {
    if (!deleteFilename) return;
    try {
      const response = await fetch(`/ai/fmea/files/${deleteFilename}`, {
        method: 'DELETE',
        headers: {
          'x-internal-key': 'dev-key-change-it'
        }
      });
      if (!response.ok) throw new Error();
      setDeleteFilename(null);
      fetchFiles();
    } catch (err) {
      alert(t('fmea.notifications.error'));
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            <ShieldAlert className="text-primary-600" size={28} />
            {t('fmea.title')}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">{t('fmea.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <input
            type="file"
            id="fmea-upload"
            className="hidden"
            accept=".md"
            onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
          />
          <Button
            variant="primary"
            onClick={() => document.getElementById('fmea-upload')?.click()}
            isLoading={isUploading}
            leftIcon={<Upload size={18} />}
            className="rounded-xl shadow-lg shadow-primary-500/20"
          >
            {t('fmea.uploadMd')}
          </Button>
        </div>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative transition-all duration-300 rounded-[2.5rem] p-1 ${
          dragActive 
            ? "bg-primary-500/20 ring-4 ring-primary-500/30 scale-[1.005]" 
            : "bg-transparent"
        }`}
      >
        <div className={`rounded-[2.4rem] border-2 border-dashed transition-colors duration-300 ${
          dragActive 
            ? "border-primary-500 bg-white/50 dark:bg-slate-900/50" 
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
        }`}>
          {loading ? (
            <div className="p-12 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-center">
              <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-800">
                <FileText size={48} className="text-slate-200 dark:text-slate-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">{t('fmea.noFiles')}</h3>
              <p className="text-slate-400 text-sm mt-3 max-w-md mx-auto">{t('fmea.modal.importHint')}</p>
              
              {dragActive && (
                <div className="mt-8 flex items-center gap-3 text-primary-600 animate-bounce font-bold">
                  <Sparkles size={24} />
                  {t('fmea.modal.dropHint')}
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                   <FileText size={16} />
                   {t('fmea.filesTitle')}
                </h3>
                <Badge variant="neutral" className="rounded-full bg-white dark:bg-slate-900 px-3 py-1">
                  {files.length} {files.length === 1 ? 'arquivo' : 'arquivos'}
                </Badge>
              </div>
              
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] bg-white dark:bg-slate-900/50">
                    <th className="px-8 py-4">{t('fmea.table.filename')}</th>
                    <th className="px-8 py-4">{t('fmea.table.size')}</th>
                    <th className="px-8 py-4">{t('fmea.table.modified')}</th>
                    <th className="px-8 py-4 text-right">{t('fmea.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {files.map(file => (
                    <tr key={file.name} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-primary-600 group-hover:scale-110 transition-transform">
                            <FileText size={18} />
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-400 font-medium">
                        {formatSize(file.size)}
                      </td>
                      <td className="px-8 py-5 text-sm text-slate-400 dark:text-slate-500">
                        {formatDate(file.modified)}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteFilename(file.name)}
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {dragActive && (
                <div className="absolute inset-0 bg-primary-600/10 backdrop-blur-[2px] rounded-[2.4rem] flex items-center justify-center z-10 border-4 border-primary-500 border-dashed">
                  <div className="bg-white dark:bg-slate-900 px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-primary-200 dark:border-primary-800">
                    <Sparkles className="text-primary-600 animate-spin-slow" size={32} />
                    <span className="text-xl font-black text-primary-600 uppercase tracking-tighter">
                      {t('fmea.modal.dropHint')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start gap-4 p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/30">
        <AlertCircle className="text-blue-500 flex-shrink-0 mt-1" size={20} />
        <div>
          <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">Como funciona?</h4>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
            Os arquivos .md carregados aqui são usados pelo **Copiloto RCA** para buscar modos de falha reais durante suas análises. 
            O robô procura por termos técnicos, famílias de equipamentos ou identificadores no conteúdo do arquivo para fornecer sugestões precisas{asset ? ` (ex: busca por ${asset.name})` : ''}.
          </p>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteFilename}
        onConfirm={handleDeleteFile}
        onCancel={() => setDeleteFilename(null)}
        message={t('modals.deleteMessage')}
        title={t('modals.deleteTitle')}
      />
    </div>
  );
};
