import React, { useState } from 'react';
import { SavedCalculation } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { Input } from '../../../../shared/ui/Input';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import { Download, Trash2, Upload } from 'lucide-react';

interface EditStlModalProps {
  item: SavedCalculation | null;
  onClose: () => void;
  onSave: (item: SavedCalculation, stlUrl?: string, stlFileName?: string, stlFileData?: string) => Promise<void>;
}

export function EditStlModal({ item, ...props }: EditStlModalProps) {
  if (!item) return null;

  return <EditStlModalForm key={item.id} item={item} {...props} />;
}

function EditStlModalForm({
  item,
  onClose,
  onSave,
}: EditStlModalProps & { item: SavedCalculation }) {
  const [url, setUrl] = useState(() => item.stl_url || '');
  const [fileName, setFileName] = useState(() => item.stl_file_name || '');
  const [fileData, setFileData] = useState(() => item.stl_file_data || '');
  const [isSaving, setIsSaving] = useState(false);

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
      title="Файлы 3D-модели"
      subtitle={item.name}
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-2 w-full font-mono text-xs">
          <CockpitButton
            type="submit"
            disabled={isSaving}
            form="model-files-form"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </CockpitButton>
        </div>
      }
    >
      <form id="model-files-form" onSubmit={handleSubmit} className="space-y-5">
        <Input label="Ссылка на модель" aria-label="Ссылка на модель" placeholder="https://www.printables.com/model/..." value={url} onChange={(e) => setUrl(e.target.value)} hint="Необязательно, если модель хранится в файле." />
        <div className="space-y-2">
          <span className="text-xs text-neutral-400">Файл модели</span>
          {fileData ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[#26262b] bg-[#121214]/90 p-3">
              <span className="min-w-0 truncate text-xs text-neutral-200">{fileName || 'model.stl'}</span>
              <div className="flex shrink-0 gap-1">
                <CockpitButton type="button" onClick={handleDownload} icon={Download} aria-label="Скачать файл модели" />
                <CockpitButton type="button" onClick={() => { setFileData(''); setFileName(''); }} icon={Trash2} aria-label="Убрать файл модели" />
              </div>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-[#36363c] p-4 text-xs text-neutral-300 focus-within:outline focus-within:outline-white/40">
              <Upload className="h-4 w-4 shrink-0 text-neutral-500" />
              <span className="space-y-1"><span className="block">Выбрать файл</span><span className="block text-[11px] text-neutral-500">STL, OBJ, STEP или 3MF</span></span>
              <input aria-label="Загрузить файл модели" type="file" accept=".stl,.obj,.step,.3mf" onChange={handleFileUpload} className="sr-only" />
            </label>
          )}
        </div>
      </form>
    </Modal>
  );
}
