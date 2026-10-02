/**
 * Utilitário de Carregamento de Logos Oficiais em SVG para PDF e Interface Web
 */

export const LOGO_PATHS = {
  cfpStp: '/assets/logos/CFPSTP.svg',
  iefp: '/assets/logos/IEFP__Logo_.svg',
  republicaPortuguesa: '/assets/logos/Republica%20protuguesa.svg',
  cooperacaoPortuguesa: '/assets/logos/cooperacao-prtuguesa.svg',
};

/**
 * Converte um ficheiro SVG da pasta public/assets/logos para Data URL de alta resolução (PNG)
 * garantindo compatibilidade total com o jsPDF
 */
const carregarLogoParaDataUrl = (
  path: string,
  targetWidth = 400,
  targetHeight = 400
): Promise<string> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve('');
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const aspect = img.naturalWidth / (img.naturalHeight || 1);
        canvas.width = targetWidth;
        canvas.height = targetWidth / (aspect || 1);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch (e) {
        console.warn(`[pdfLogos] Falha ao renderizar logo ${path}:`, e);
      }
      resolve('');
    };
    img.onerror = () => {
      console.warn(`[pdfLogos] Não foi possível carregar o logo de ${path}`);
      resolve('');
    };
    img.src = path;
  });
};

export interface LogosDataUrls {
  cfpStp?: string;
  iefp?: string;
  republicaPortuguesa?: string;
  cooperacaoPortuguesa?: string;
}

let logosCache: LogosDataUrls | null = null;

export const obterLogosEmDataUrl = async (): Promise<LogosDataUrls> => {
  if (logosCache) return logosCache;

  try {
    const [cfpStp, iefp, republicaPortuguesa, cooperacaoPortuguesa] = await Promise.all([
      carregarLogoParaDataUrl(LOGO_PATHS.cfpStp, 500, 500),
      carregarLogoParaDataUrl(LOGO_PATHS.iefp, 600, 300),
      carregarLogoParaDataUrl(LOGO_PATHS.republicaPortuguesa, 800, 500),
      carregarLogoParaDataUrl(LOGO_PATHS.cooperacaoPortuguesa, 800, 300),
    ]);

    logosCache = {
      cfpStp,
      iefp,
      republicaPortuguesa,
      cooperacaoPortuguesa,
    };
    return logosCache;
  } catch (e) {
    console.warn('[pdfLogos] Erro ao carregar logos em lote:', e);
    return {};
  }
};
