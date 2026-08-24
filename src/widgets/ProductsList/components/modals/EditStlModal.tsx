import React, { useState, useEffect } from 'react';
import { SavedCalculation } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { Input } from '../../../../shared/ui/Input';
import { Button } from '../../../../shared/ui/Button';
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
      title={`3D-модель изделия: «${item.name}»`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
            <ExternalLink size={14} className="text-amber-400" />
            Веб-ссылка на 3D-модель (Printables, Thingiverse, MakerWorld...)
          </label>
          <Input
            placeholder="https://www.printables.com/model/..."
            value={url}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2 pt-2 border-t border-[#242930]">
          <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
            <FileCode size={14} className="text-emerald-400" />
            Локальный STL файл
          </label>

          {fileData ? (
            <div className="flex items-center justify-between p-2.5 bg-[#141720] border border-emerald-500/40 rounded-xl text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode size={16} className="text-emerald-400 shrink-0" />
                <span className="text-white font-medium truncate">{fileName || 'model.stl'}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded hover:bg-emerald-500/10 transition-colors"
                  title="Скачать STL"
                >
                  <Download size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFileData('');
                    setFileName('');
                  }}
                  className="p-1.5 text-red-400 hover:text-red-300 rounded hover:bg-red-500/10 transition-colors"
                  title="Удалить файл"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-4 bg-[#141720] border border-dashed border-gray-700 hover:border-amber-500/60 rounded-xl cursor-pointer transition-colors group">
              <Upload size={20} className="text-gray-400 group-hover:text-amber-400 mb-1 transition-colors" />
              <span className="text-xs text-gray-300 font-medium group-hover:text-white">
                Загрузить STL файл
              </span>
              <span className="text-[10px] text-gray-500 mt-0.5">до 50 МБ</span>
              <input
                type="file"
                accept=".stl,.obj,.step,.3mf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#242930]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Отмена
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSaving}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold border-none"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
