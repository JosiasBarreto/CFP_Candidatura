import React, { useRef, useState } from 'react';
import { FileText, Upload, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { AnexoDocumento } from '../../utils/securityAndValidation';

interface DocumentUploadCardProps {
  titulo: string;
  subtitulo: string;
  obrigatorio: boolean;
  destaqueEspecial?: string;
  documento?: AnexoDocumento | null;
  erro?: string;
  onChange: (doc: AnexoDocumento | null) => void;
}

export const DocumentUploadCard: React.FC<DocumentUploadCardProps> = ({
  titulo,
  subtitulo,
  obrigatorio,
  destaqueEspecial,
  documento,
  erro,
  onChange,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [erroFicheiro, setErroFicheiro] = useState<string | null>(null);

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErroFicheiro(null);
    const tiposAceites = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!tiposAceites.includes(file.type)) {
      setErroFicheiro('Formato não suportado. Carregue ficheiro PDF, JPG ou PNG.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErroFicheiro('O ficheiro excede o tamanho máximo permitido de 8 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange({
        nomeFicheiro: file.name,
        tipoMime: file.type,
        tamanhoBytes: file.size,
        dataUrl: typeof reader.result === 'string' ? reader.result : '',
        file,
      });
    };
    reader.readAsDataURL(file);
  };

  const formatarTamanho = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        erro || erroFicheiro
          ? 'border-red-300 bg-red-50/20'
          : documento
          ? 'border-emerald-300 bg-emerald-50/20'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center ${
              documento ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-900">
              {titulo}{' '}
              {obrigatorio ? (
                <span className="text-red-600">*</span>
              ) : (
                <span className="text-xs font-normal text-slate-500">(Opcional)</span>
              )}
            </h4>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{subtitulo}</p>
            {destaqueEspecial && (
              <p className="text-xs font-medium text-amber-800 mt-1">
                {destaqueEspecial}
              </p>
            )}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/jpeg,image/png,image/webp"
          onChange={handleSelectFile}
          className="hidden"
        />

        <div className="shrink-0">
          {!documento ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="min-h-[40px] px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Carregar Cópia
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
              className="min-h-[40px] px-3 py-2 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-xs font-medium text-red-600 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remover
            </button>
          )}
        </div>
      </div>

      {documento && (
        <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0 text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
            <span className="truncate">{documento.nomeFicheiro}</span>
          </div>
          <span className="text-slate-500 font-mono-tabular shrink-0">
            {formatarTamanho(documento.tamanhoBytes)}
          </span>
        </div>
      )}

      {(erro || erroFicheiro) && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-red-600 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{erroFicheiro || erro}</span>
        </div>
      )}
    </div>
  );
};
