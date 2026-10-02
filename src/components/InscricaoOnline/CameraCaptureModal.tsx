import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, X, Check, Upload } from 'lucide-react';

interface CameraCaptureModalProps {
  aberto: boolean;
  aoFechar: () => void;
  aoCapturar: (file: File, dataUrl: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  aberto,
  aoFechar,
  aoCapturar,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [fotoCapturadaUrl, setFotoCapturadaUrl] = useState<string | null>(null);
  const [fotoCapturadaBlob, setFotoCapturadaBlob] = useState<Blob | null>(null);

  const pararStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const iniciarCamera = useCallback(async (modo: 'user' | 'environment') => {
    setErroCamera(null);
    setFotoCapturadaUrl(null);
    setFotoCapturadaBlob(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErroCamera(
          'O seu navegador não disponibiliza acesso direto à câmara nesta janela. Utilize o botão abaixo para abrir a câmara ou galeria do seu dispositivo.'
        );
        return;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: modo,
          width: { ideal: 720 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setErroCamera(
        'Não foi possível aceder à câmara diretamente (permissão negada ou dispositivo sem câmara ativa). Pode selecionar ou tirar uma foto usando o botão abaixo.'
      );
    }
  }, []);

  useEffect(() => {
    if (aberto) {
      iniciarCamera(facingMode);
    } else {
      pararStream();
      setFotoCapturadaUrl(null);
      setFotoCapturadaBlob(null);
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [aberto, facingMode]);

  const alternarCamera = () => {
    pararStream();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const capturarFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const targetW = 600;
    const targetH = 800; // Proporção 3x4 Tipo Passe
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
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setFotoCapturadaUrl(dataUrl);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setFotoCapturadaBlob(blob);
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const confirmarFoto = () => {
    if (fotoCapturadaBlob && fotoCapturadaUrl) {
      const file = new File([fotoCapturadaBlob], `foto_passe_${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });
      pararStream();
      aoCapturar(file, fotoCapturadaUrl);
      aoFechar();
    }
  };

  const handleFallbackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        pararStream();
        aoCapturar(file, reader.result);
        aoFechar();
      }
    };
    reader.readAsDataURL(file);
  };

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 id="camera-modal-title" className="text-base font-semibold text-slate-900">
              Fotografia Tipo Passe (3x4)
            </h3>
            <p className="text-xs text-slate-500">
              Posicione o rosto no centro da moldura com boa iluminação
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              pararStream();
              aoFechar();
            }}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            aria-label="Fechar janela de câmara"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {erroCamera ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
              <p className="text-sm text-amber-900 mb-4">{erroCamera}</p>
              <input
                ref={fallbackInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="user"
                onChange={handleFallbackFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fallbackInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Abrir Câmara / Galeria do Dispositivo
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative aspect-3/4 w-60 overflow-hidden rounded-lg border-2 border-emerald-700 bg-slate-900 shadow-inner">
                {!fotoCapturadaUrl ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />
                    {/* Guia visual de enquadramento 3x4 */}
                    <div className="pointer-events-none absolute inset-4 rounded-full border border-dashed border-white/60" />
                  </>
                ) : (
                  <img
                    src={fotoCapturadaUrl}
                    alt="Pré-visualização da fotografia capturada"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              <div className="mt-5 flex w-full flex-wrap items-center justify-center gap-3">
                {!fotoCapturadaUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={alternarCamera}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Alternar Câmara
                    </button>
                    <button
                      type="button"
                      onClick={capturarFrame}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
                    >
                      <Camera className="h-4 w-4" />
                      Capturar Foto
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setFotoCapturadaUrl(null);
                        setFotoCapturadaBlob(null);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Repetir Foto
                    </button>
                    <button
                      type="button"
                      onClick={confirmarFoto}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      Utilizar esta Foto
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
