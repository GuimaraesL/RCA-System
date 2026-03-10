/**
 * Proposta: Componente de Gestão de Mídias (Imagens/Vídeos) para RCAs.
 * Fluxo: Permite visualizar arquivos existentes, realizar novos uploads e excluir anexos com preview instantâneo.
 */

import React, { useState, useRef } from 'react';
import { Attachment } from '../../types';
import { mediaService } from '../../services/mediaService';
import {
  Image as ImageIcon, Video, FileText, Upload, Trash2,
  ExternalLink, Loader2, AlertCircle, Plus
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageDefinition';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface MediaManagerProps {
  rcaId: string;
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
}

export const MediaManager: React.FC<MediaManagerProps> = ({ rcaId, attachments, onChange }) => {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newAttachments = [...attachments];
      for (const file of Array.from(files)) {
        // Limites de tamanho (RF-002 do docs)
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const maxSize = isImage ? 5 * 1024 * 1024 : isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

        if (file.size > maxSize) {
          alert(`Arquivo ${file.name} excede o limite de ${maxSize / (1024 * 1024)}MB`);
          continue;
        }

        const attachment = await mediaService.upload(rcaId, file);
        newAttachments.push(attachment);
      }
      onChange(newAttachments);
    } catch (err) {
      console.error(err);
      alert(t('media.uploadError'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    uploadFiles(e.target.files);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      await mediaService.delete(rcaId, filename);
      onChange(attachments.filter(a => a.filename !== filename));
    } catch (err) {
      alert(t('media.deleteError'));
    }
  };

  const renderPreview = (att: Attachment) => {
    if (att.type === 'image') {
      return <img src={att.url} alt={att.filename} className="w-full h-full object-cover" />;
    }
    if (att.type === 'video') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-900">
          <Video className="text-white opacity-40" size={32} />
        </div>
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
        <FileText className="text-slate-400" size={32} />
      </div>
    );
  };

  return (
    <div
      className="space-y-6"
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <ImageIcon className="text-primary-600" size={20} />
          {t('common.attachments') || 'Anexos e Evidências'}
        </h3>

        <input
          type="file"
          multiple
          accept="image/*,video/*,.pdf"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          leftIcon={uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          className="rounded-xl"
        >
          {uploading ? t('common.loading') : t('common.add')}
        </Button>
      </div>

      {attachments.length === 0 && !uploading ? (
        <Card className={`flex flex-col items-center justify-center p-12 text-center border-dashed transition-all ${dragActive
            ? "border-primary-500 bg-primary-50/50 dark:bg-primary-900/20 ring-4 ring-primary-500/10 scale-[1.01]"
            : "bg-slate-50/30 border-slate-200 dark:border-slate-800"
          }`}>
          <Upload size={40} className={`${dragActive ? "text-primary-500 animate-bounce" : "text-slate-200 dark:text-slate-700"} mb-4`} />
          <p className={`${dragActive ? "text-primary-600" : "text-slate-400"} text-sm font-medium`}>
            {dragActive ? t('media.dropToUpload') : t('media.noAttachments')}
          </p>
          <p className="text-slate-300 text-xs mt-1 italic">{t('media.dragHint')}</p>
        </Card>
      ) : (
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2 rounded-2xl transition-all ${dragActive ? "bg-primary-50/30 ring-2 ring-primary-500/20 ring-dashed" : ""
          }`}>
          {attachments.map((att) => (
            <div key={att.id} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md">
              {renderPreview(att)}

              {/* Overlay de Ações */}
              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                <a
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors"
                  title={t('common.view')}
                >
                  <ExternalLink size={18} />
                </a>
                <button
                  onClick={() => handleDelete(att.filename)}
                  className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors"
                  title={t('common.delete')}
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Label de Tipo */}
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/90 dark:bg-slate-800/90 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                <p className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider truncate max-w-[80px]">
                  {att.filename}
                </p>
              </div>
            </div>
          ))}

          {uploading && (
            <div className="aspect-square rounded-2xl border-2 border-dashed border-primary-200 dark:border-primary-900/30 flex flex-col items-center justify-center gap-3 bg-primary-50/20">
              <Loader2 size={32} className="text-primary-500 animate-spin" />
              <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest animate-pulse">{t('media.uploading')}</p>
            </div>
          )}
        </div>
      )}

      {/* Info de Limites */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex gap-3">
        <AlertCircle size={18} className="text-slate-400 flex-shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
          <p>{t('media.uploadLimits')}</p>
          <p>{t('media.suggestedFormats')}</p>
        </div>
      </div>
    </div>
  );
};
