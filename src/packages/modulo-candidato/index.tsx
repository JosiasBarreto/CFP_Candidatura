import React, { useState, useEffect } from 'react';
import { ProgramaPublico, CursoPublico } from './types';
import { candidatoApi } from './services/candidatoApi';
import { FormularioCandidaturaPublica } from './components/FormularioCandidaturaPublica';
import { ConsultaEstadoCandidatura } from './components/ConsultaEstadoCandidatura';
import { CatalogoCursosCandidato } from './components/CatalogoCursosCandidato';
import { GuiaCandidatoView } from './components/GuiaCandidatoView';

export type ModuloCandidatoAba =
  | 'candidatura_publica'
  | 'catalogo_cursos'
  | 'consulta_publica'
  | 'guia_candidato';

export interface ModuloCandidatoAppProps {
  abaAtiva: ModuloCandidatoAba;
  aoMudarAba: (aba: ModuloCandidatoAba) => void;
  aoNotificar: (msg: { tipo: 'sucesso' | 'erro'; texto: string } | null) => void;
}

export const ModuloCandidatoApp: React.FC<ModuloCandidatoAppProps> = ({
  abaAtiva,
  aoMudarAba,
  aoNotificar,
}) => {
  const [programas, setProgramas] = useState<ProgramaPublico[]>([]);
  const [cursos, setCursos] = useState<CursoPublico[]>([]);
  const [termoConsultaInicial, setTermoConsultaInicial] = useState<string>('');
  const [cursoPreSelecionado, setCursoPreSelecionado] = useState<CursoPublico | null>(null);

  useEffect(() => {
    candidatoApi
      .listarCursos()
      .then((res) => {
        const listaCursos = Array.isArray(res) ? res : [];
        setCursos(listaCursos);
        candidatoApi
          .listarProgramas()
          .then((pRes) => setProgramas(Array.isArray(pRes) ? pRes : []))
          .catch(() => setProgramas([]));
      })
      .catch(() => {
        setCursos([]);
        setProgramas([]);
      });
  }, []);

  const handleEscolherCursoDoCatalogo = (curso: CursoPublico) => {
    setCursoPreSelecionado(curso);
    aoMudarAba('candidatura_publica');
    aoNotificar({
      tipo: 'sucesso',
      texto: `Curso "${curso.nome}" selecionado com sucesso para a 1.ª Opção de formação!`,
    });
  };

  if (abaAtiva === 'catalogo_cursos') {
    return (
      <CatalogoCursosCandidato
        cursos={cursos}
        programas={programas}
        aoEscolherCurso={handleEscolherCursoDoCatalogo}
      />
    );
  }

  if (abaAtiva === 'consulta_publica') {
    return (
      <ConsultaEstadoCandidatura
        termoInicial={termoConsultaInicial}
        aoNotificar={aoNotificar}
      />
    );
  }

  if (abaAtiva === 'guia_candidato') {
    return (
      <GuiaCandidatoView
        aoIniciarCandidatura={() => aoMudarAba('candidatura_publica')}
        aoVerCatalogo={() => aoMudarAba('catalogo_cursos')}
      />
    );
  }

  return (
    <FormularioCandidaturaPublica
      programas={programas}
      cursos={cursos}
      cursoPreSelecionado={cursoPreSelecionado}
      aoNotificar={aoNotificar}
      aoIrParaConsulta={(codigoOuBi) => {
        setTermoConsultaInicial(codigoOuBi);
        aoMudarAba('consulta_publica');
      }}
    />
  );
};

export * from './types';
export * from './services/candidatoApi';
