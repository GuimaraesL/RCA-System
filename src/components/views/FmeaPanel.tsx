/**
 * Proposta: Painel de Gestão de FMEA para Ativos.
 * Fluxo: Exibe a tabela de modos de falha, permite edição manual, cálculo de RPN e importação via IA.
 */

import React, { useState, useEffect } from 'react';
import { FmeaMode, AssetNode } from '../../types';
import { fmeaService } from '../../services/fmeaService';
import {
  ShieldAlert, Plus, Brain, Trash2, Edit2,
  ChevronDown, ChevronUp, AlertCircle, Save, X, Sparkles
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageDefinition';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';
import { ConfirmModal } from '../modals/ConfirmModal';

interface FmeaPanelProps {
  asset: AssetNode;
}

export const FmeaPanel: React.FC<FmeaPanelProps> = ({ asset }) => {
  const { t } = useLanguage();
  const [modes, setModes] = useState<FmeaMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para Modal de Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMode, setEditingMode] = useState<Partial<FmeaMode> | null>(null);

  // Estados para Importação IA
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportPlaceholder] = useState('');
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Estados para Deleção
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        setImportPlaceholder(evt.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const fetchModes = async () => {
    try {
      setLoading(true);
      const data = await fmeaService.getByAssetId(asset.id);
      setModes(data);
      setError(null);
    } catch (err) {
      setError(t('fmea.notifications.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModes();
  }, [asset.id]);

  const handleSave = async () => {
    if (!editingMode?.failure_mode) return;

    try {
      if (editingMode.id) {
        await fmeaService.update(editingMode.id, editingMode);
      } else {
        await fmeaService.create({ ...editingMode, asset_id: asset.id });
      }
      setIsModalOpen(false);
      fetchModes();
    } catch (err) {
      alert(t('fmea.notifications.error'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await fmeaService.delete(deleteId);
      setDeleteId(null);
      fetchModes();
    } catch (err) {
      alert(t('fmea.notifications.error'));
    }
  };

  const handleImportAi = async () => {
    if (!importText.trim()) return;

    try {
      setIsProcessingAi(true);
      const response = await fetch('/ai/extract-fmea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': 'rca-system-secret-key' // TODO: Pegar do config ou env
        },
        body: JSON.stringify({ text: importText, ui_language: t('common.portuguese') })
      });

      if (!response.ok) throw new Error(t('fmea.notifications.extractionError'));

      const data = await response.json();
      const extractedModes: FmeaItem[] = data.modes;

      // Salva todos os modos extraídos um por um para o ativo atual
      for (const item of extractedModes) {
        await fmeaService.create({
          ...item,
          asset_id: asset.id
        });
      }

      setIsImportModalOpen(false);
      setImportPlaceholder('');
      fetchModes();
      alert(t('fmea.notifications.importSuccess'));
    } catch (err) {
      alert(t('fmea.notifications.error'));
    } finally {
      setIsProcessingAi(false);
    }
  };

  interface FmeaItem {
    failure_mode: string;
    potential_effects?: string;
    severity: number;
    potential_causes?: string;
    occurrence: number;
    current_controls?: string;
    detection: number;
    recommended_actions?: string;
  }

  const getRpnColor = (rpn: number) => {
    if (rpn >= 100) return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-100';
    if (rpn >= 40) return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-100';
    return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-100';
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
          <Button
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            leftIcon={<Brain size={18} className="text-purple-500" />}
            className="rounded-xl border-slate-200 dark:border-slate-700 shadow-sm"
          >
            {t('fmea.importAi')}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setEditingMode({ severity: 1, occurrence: 1, detection: 1 });
              setIsModalOpen(true);
            }}
            leftIcon={<Plus size={18} />}
            className="rounded-xl shadow-lg shadow-primary-500/20"
          >
            {t('fmea.addMode')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-50 dark:bg-slate-800/50 rounded-2xl animate-pulse border border-slate-100 dark:border-slate-800" />
          ))}
        </div>
      ) : modes.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed bg-slate-50/30">
          <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <ShieldAlert size={40} className="text-slate-200 dark:text-slate-700" />
          </div>
          <h3 className="text-lg font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">{t('dashboard.charts.noData')}</h3>
          <p className="text-slate-400 text-sm mt-2">{t('fmea.modal.importHint')}</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-5">{t('fmea.table.mode')}</th>
                <th className="px-6 py-5">{t('fmea.table.effects')}</th>
                <th className="px-4 py-5 text-center">S</th>
                <th className="px-6 py-5">{t('fmea.table.causes')}</th>
                <th className="px-4 py-5 text-center">O</th>
                <th className="px-4 py-5 text-center">D</th>
                <th className="px-4 py-5 text-center">{t('fmea.table.rpn')}</th>
                <th className="px-6 py-5 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {modes.map(mode => (
                <tr key={mode.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-5">
                    <span className="font-bold text-slate-900 dark:text-white text-sm leading-tight block">{mode.failure_mode}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed line-clamp-2">{mode.potential_effects || '-'}</span>
                  </td>
                  <td className="px-4 py-5 text-center">
                    <span className="font-black text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{mode.severity}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed line-clamp-2">{mode.potential_causes || '-'}</span>
                  </td>
                  <td className="px-4 py-5 text-center text-xs font-bold text-slate-600">{mode.occurrence}</td>
                  <td className="px-4 py-5 text-center text-xs font-bold text-slate-600">{mode.detection}</td>
                  <td className="px-4 py-5 text-center">
                    <Badge className={`font-black text-xs border ${getRpnColor(mode.rpn || 0)}`}>
                      {mode.rpn}
                    </Badge>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingMode(mode); setIsModalOpen(true); }}
                        className="h-8 w-8 p-0 rounded-lg"
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(mode.id)}
                        className="h-8 w-8 p-0 rounded-lg text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Edição Manual */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMode?.id ? t('fmea.modal.editTitle') : t('fmea.modal.addTitle')}
        icon={<ShieldAlert size={24} />}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleSave} leftIcon={<Save size={18} />}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-6">
          <Input
            label={t('fmea.table.mode')}
            value={editingMode?.failure_mode || ''}
            onChange={e => setEditingMode({ ...editingMode, failure_mode: e.target.value })}
            placeholder={t('fmea.table.mode')}
            required
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              type="number"
              label={t('fmea.table.severity')}
              min={1} max={10}
              value={editingMode?.severity || 1}
              onChange={e => setEditingMode({ ...editingMode, severity: parseInt(e.target.value) })}
            />
            <Input
              type="number"
              label={t('fmea.table.occurrence')}
              min={1} max={10}
              value={editingMode?.occurrence || 1}
              onChange={e => setEditingMode({ ...editingMode, occurrence: parseInt(e.target.value) })}
            />
            <Input
              type="number"
              label={t('fmea.table.detection')}
              min={1} max={10}
              value={editingMode?.detection || 1}
              onChange={e => setEditingMode({ ...editingMode, detection: parseInt(e.target.value) })}
            />
          </div>
          <Textarea
            label={t('fmea.table.effects')}
            value={editingMode?.potential_effects || ''}
            onChange={e => setEditingMode({ ...editingMode, potential_effects: e.target.value })}
            rows={2}
          />
          <Textarea
            label={t('fmea.table.causes')}
            value={editingMode?.potential_causes || ''}
            onChange={e => setEditingMode({ ...editingMode, potential_causes: e.target.value })}
            rows={2}
          />
          <Textarea
            label={t('fmea.table.controls')}
            value={editingMode?.current_controls || ''}
            onChange={e => setEditingMode({ ...editingMode, current_controls: e.target.value })}
            rows={2}
          />
          <Textarea
            label={t('fmea.table.actions')}
            value={editingMode?.recommended_actions || ''}
            onChange={e => setEditingMode({ ...editingMode, recommended_actions: e.target.value })}
            rows={2}
          />
        </div>
      </Modal>

      {/* Modal de Importação IA */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => { setIsImportModalOpen(false); setDragActive(false); }}
        title={t('fmea.modal.importTitle')}
        icon={<Brain size={24} className="text-purple-500" />}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsImportModalOpen(false)} disabled={isProcessingAi}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleImportAi}
              isLoading={isProcessingAi}
              className="bg-purple-600 hover:bg-purple-700 shadow-purple-500/20"
              leftIcon={<Sparkles size={18} />}
            >
              {t('fmea.importAi')}
            </Button>
          </>
        }
      >
        <div
          className="space-y-4"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <div className={`p-4 transition-all duration-300 border-2 border-dashed rounded-2xl flex gap-4 ${dragActive
              ? "bg-purple-50 dark:bg-purple-900/20 border-purple-500 ring-4 ring-purple-500/10 scale-[1.01]"
              : "bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/30"
            }`}>
            <Sparkles size={24} className={`${dragActive ? "text-purple-600 animate-bounce" : "text-purple-500"} flex-shrink-0`} />
            <p className={`text-sm font-medium leading-relaxed ${dragActive ? "text-purple-700" : "text-purple-700 dark:text-purple-300"}`}>
              {dragActive ? t('fmea.modal.dropHint') : t('fmea.modal.importHint')}
            </p>
          </div>
          <Textarea
            placeholder={t('fmea.modal.importPlaceholder')}
            className={`min-h-[300px] font-mono text-sm transition-all duration-300 ${dragActive ? "border-purple-400 bg-purple-50/30" : ""
              }`}
            value={importText}
            onChange={e => setImportPlaceholder(e.target.value)}
          />
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteId}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        message={t('modals.deleteMessage')}
        title={t('modals.deleteTitle')}
      />
    </div>
  );
};
