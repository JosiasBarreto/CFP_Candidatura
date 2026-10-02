import React from 'react';
import { DadosInscricaoFormando } from '../../utils/securityAndValidation';
import { FichaComprovativoView } from './FichaComprovativoView';

interface FichaPreenchidaViewProps {
  dados: DadosInscricaoFormando;
  onEditarInscricao: () => void;
  onNovaInscricao: () => void;
}

export const FichaPreenchidaView: React.FC<FichaPreenchidaViewProps> = ({
  dados,
  onEditarInscricao,
  onNovaInscricao,
}) => {
  return (
    <FichaComprovativoView
      dados={dados}
      aoEditarInscricao={onEditarInscricao}
      aoNovaInscricao={onNovaInscricao}
    />
  );
};
