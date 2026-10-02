import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, RefreshCw, Trash2, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface CameraPhotoUploaderProps {
  fotoPreview: string;
  erro?: string;
  onChangePhoto: (file: File | null, dataUrl: string) => void;
}

export const CameraPhotoUploader: React.FC<CameraPhotoUploaderProps> = ({
  fotoPreview,
  erro,
  onChangePhoto,
}) => {
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraErro, setCameraErro] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pararCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraAtiva(false);
  }, []);

  const iniciarCamera = useCallback(async (modo: 'user' | 'environment' = facingMode) => {
    setCameraErro(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: modo,
          width: { ideal: 720 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraAtiva(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setCameraErro(
        'Não foi possível aceder à câmara diretamente. Utilize o botão "Carregar Foto" (em telemóveis pode escolher a câmara diretamente).'
      );
      setCameraAtiva(false);
    }
  }, [facingMode]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const alternarCamara = () => {
    const novoModo = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(novoModo);
    iniciarCamera(novoModo);
  };

  const capturarFoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    // Proporção tipo passe 3:4 (ex: 450x600)
    const targetW = 450;
    const targetH = 600;
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const targetRatio = targetW / targetH;
    const videoRatio = vw / vh;

    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;

    if (videoRatio > targetRatio) {
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetRatio;
      sy = (vh - sh) / 2;
    }

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `foto_passe_${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          onChangePhoto(file, dataUrl);
        } else {
          onChangePhoto(null, dataUrl);
        }
        pararCamera();
      },
      'image/jpeg',
      0.9
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraErro(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setCameraErro('Formato inválido. Selecione uma imagem JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setCameraErro('A fotografia não deve ultrapassar 6 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      onChangePhoto(file, result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="border border-slate-200 bg-white rounded-xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Moldura Tipo Passe 3x4 */}
        <div className="relative w-32 h-42 shrink-0 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center overflow-hidden mx-auto sm:mx-0">
          {fotoPreview ? (
            <>
              <img
                src={fotoPreview}
                alt="Fotografia Tipo Passe do Candidato"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  onChangePhoto(null, '');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                title="Remover fotografia"
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-md bg-slate-900/80 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div className="text-center p-2">
              <Camera className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
              <span className="block text-[11px] font-medium text-slate-500 leading-tight">
                Foto Tipo Passe
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5 font-mono-tabular">
                Proporção 3x4
              </span>
            </div>
          )}
        </div>

        {/* Controlos e Instruções */}
        <div className="flex-1 w-full">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="text-sm font-semibold text-slate-900">
              Fotografia do Utilizador (Tipo Passe) <span className="text-red-600">*</span>
            </h4>
            {fotoPreview && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Fotografia validada
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 mb-3.5 leading-relaxed">
            Carregue uma fotografia tipo passe do seu dispositivo ou utilize a câmara do seu telemóvel, tablet ou computador para tirar uma fotografia de rosto com fundo claro.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[42px] px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Carregar Foto
            </button>

            {!cameraAtiva ? (
              <button
                type="button"
                onClick={() => iniciarCamera('user')}
                className="min-h-[42px] px-4 py-2 rounded-lg border border-emerald-700 text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/80 text-xs font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Tirar Foto com Câmara
              </button>
            ) : (
              <button
                type="button"
                onClick={pararCamera}
                className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 text-xs font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <X className="w-4 h-4" />
                Fechar Câmara
              </button>
            )}
          </div>

          {(erro || cameraErro) && (
            <div className="mt-2.5 flex items-start gap-1.5 text-xs text-red-600 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{cameraErro || erro}</span>
            </div>
          )}
        </div>
      </div>

      {/* Área de Captura da Câmara em Direto */}
      {cameraAtiva && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="max-w-sm mx-auto">
            <div className="relative aspect-[3/4] w-full max-h-80 bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Guia de enquadramento 3x4 */}
              <div className="absolute inset-4 border border-dashed border-white/60 rounded-lg pointer-events-none flex flex-col justify-between p-2">
                <span className="text-[11px] text-white/90 bg-black/50 px-2 py-0.5 rounded self-center">
                  Enquadre o rosto no centro
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={alternarCamara}
                className="min-h-[42px] px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Inverter Câmara
              </button>
              <button
                type="button"
                onClick={capturarFoto}
                className="min-h-[42px] px-5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Capturar Foto Passe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
