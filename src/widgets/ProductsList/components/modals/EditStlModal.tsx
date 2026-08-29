import React, { useState, useEffect } from 'react';
import { SavedCalculation } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { Input } from '../../../../shared/ui/Input';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import { Tooltip } from '../../../../shared/ui/Tooltip';
import { FileCode, Download, ExternalLink, Trash2, Upload } from 'lucide-react';

interface EditStlModalProps {
  item: SavedCalculation | null;
  onClose: () => void;
  onSave: (item: SavedCalculation, stlUrl?: string, stlFileName?: string, stlFileData?: string) => Promise<void>;
}

export function EditStlModal({ item, onClose, onSave }: EditStlModalProps) {
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setUrl(item.stl_url || '');
      setFileName(item.stl_file_name || '');
      setFileData(item.stl_file_data || '');
    }
  }, [item]);

  if (!item) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setFileData(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (!fileData) return;
    const a = document.createElement('a');
    a.href = fileData;
    a.download = fileName || `${item.name}.stl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(
        item,
        url.trim() || undefined,
        fileName.trim() || undefined,
        fileData || undefined
      );
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(item)}
      onClose={onClose}
      title={`§ 3D-LABS // 3D_MODEL_FILES [ ${item.name} ]`}
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-2 w-full font-mono text-xs">
          <CockpitButton type="button" onClick={onClose} disabled={isSaving}>
            Отмена
          </CockpitButton>
          <CockpitButton
            type="submit"
            disabled={isSaving}
            isActive={true}
            onClick={handleSubmit}
            className="border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </CockpitButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3 pt-1 font-mono text-xs">
        <div className="bg-neutral-900 p-3 rounded-xl border border-white/10 space-y-1.5">
          <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <ExternalLink size={13} className="text-cyan-400" />
            Веб-ссылка на 3D-модель
          </label>
          <Input
            placeholder="https://www.printables.com/model/..."
            value={url}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2 pt-2 border-t border-white/10">
          <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileCode size={13} className="text-emerald-400" />
            Локальный STL файл
          </label>

          {fileData ? (
            <div className="flex items-center justify-between p-2.5 bg-neutral-900 border border-white/10 rounded-xl text-xs">
              <div className="flex items-center gap-2 min-w-0 font-mono">
                <FileCode size={15} className="text-cyan-400 shrink-0" />
                <span className="text-white font-medium truncate">{fileName || 'model.stl'}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Tooltip content="Скачать STL">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                  </button>
                </Tooltip>
                <Tooltip content="Удалить файл">
                  <button
                    type="button"
                    onClick={() => {
                      setFileData('');
                      setFileName('');
                    }}
                    className="p-1.5 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </Tooltip>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-4 bg-neutral-900 border border-dashed border-white/15 hover:border-cyan-400/60 rounded-xl cursor-pointer transition-colors group">
              <Upload size={18} className="text-neutral-400 group-hover:text-cyan-400 mb-1 transition-colors" />
              <span className="text-xs text-neutral-300 font-mono group-hover:text-white">
                [ Загрузить STL файл ]
              </span>
              <span className="text-[10px] text-neutral-500 mt-0.5 font-mono">до 50 МБ</span>
              <input
                type="file"
                accept=".stl,.obj,.step,.3mf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          )}
        </div>
      </form>
    </Modal>
  );
}
