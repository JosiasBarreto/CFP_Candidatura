import React, { useState } from 'react';
import {
  Download,
  Printer,
  CheckCircle2,
  PlusCircle,
  FileSpreadsheet,
  Edit3,
  FileText,
} from 'lucide-react';
import { DadosInscricaoFormando, calcularIdade } from '../../utils/securityAndValidation';
import {
  gerarPdfFormularioInscricao,
  obterNomeFicheiroPdf,
  extrairPartesData,
  obterNumeroSequencia,
  obterNumeroProcesso,
  verificarProgramaSelecionado,
} from '../../utils/gerarPdfInscricao';
import { exportarInscricaoParaExcel } from '../../utils/pdfFichaGenerator';

interface FichaComprovativoViewProps {
  dados: DadosInscricaoFormando;
  aoNovaInscricao: () => void;
  aoEditarInscricao?: () => void;
}

const CabecalhoOficialCfp: React.FC = () => (
  <div className="flex flex-col items-center text-center mb-3 space-y-1.5">
    <img
      src="/assets/logos/CFPSTP.svg"
      alt="CFP-STP Logo"
      className="h-10 sm:h-12 object-contain"
    />
    <h3 className="font-serif text-base sm:text-lg font-bold tracking-wide text-[#1a8026] uppercase">
      CENTRO DE FORMAÇÃO PROFISSIONAL DE SÃO TOMÉ E PRÍNCIPE
    </h3>
  </div>
);

const RodapeOficialCfp: React.FC<{ pagina: '1/2' | '2/2' }> = ({ pagina }) => (
  <div className="mt-6 pt-3">
    <p className="font-serif text-xs font-bold text-slate-900 mb-2">Página {pagina}</p>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-2 text-[10px] text-slate-600">
      {/* 1. Esquerda: República Portuguesa */}
      <div className="flex items-center gap-2">
        <img
          src="/assets/logos/Republica%20protuguesa.svg"
          alt="República Portuguesa Logo"
          className="h-7 sm:h-8 object-contain"
        />
        <div className="leading-tight hidden xs:block">
          <p className="font-bold text-slate-800 uppercase text-[9px]">República Portuguesa</p>
          <p className="text-[8px] text-slate-500">Trabalho, Solidariedade e Segurança Social</p>
        </div>
      </div>

      {/* 2. Centro: IEFP */}
      <div className="flex flex-col items-center leading-tight">
        <img
          src="/assets/logos/IEFP__Logo_.svg"
          alt="IEFP Logo"
          className="h-7 sm:h-8 object-contain"
        />
        <p className="text-[8px] font-medium text-slate-600 uppercase mt-0.5">
          Instituto do Emprego e Formação Profissional
        </p>
      </div>

      {/* 3. Direita: Cooperação Portuguesa */}
      <div className="flex items-center gap-1.5">
        <img
          src="/assets/logos/cooperacao-prtuguesa.svg"
          alt="Cooperação Portuguesa Logo"
          className="h-7 sm:h-8 object-contain"
        />
      </div>
    </div>
  </div>
);

export const FichaComprovativoView: React.FC<FichaComprovativoViewProps> = ({
  dados,
  aoNovaInscricao,
  aoEditarInscricao,
}) => {
  const [baixouRecentemente, setBaixouRecentemente] = useState<boolean>(false);

  const nomeFicheiroPdf = obterNomeFicheiroPdf(dados);
  const seqNum = obterNumeroSequencia(dados);
  const dataInsc = extrairPartesData(dados.data_inscricao);
  const dataNasc = extrairPartesData(dados.datanascimento);
  const numProc = obterNumeroProcesso(dados);

  const sitEmp = (dados.situacao_emprego || '').toLowerCase();
  const isPrimeiroEmprego = sitEmp.includes('1º emprego') || sitEmp.includes('1.º emprego');
  const isNovoEmprego = sitEmp.includes('novo emprego');
  const isEmpregadoActivo =
    (sitEmp.includes('empregado') || sitEmp.includes('trabalhador') || sitEmp.includes('activo')) &&
    !sitEmp.includes('desempregado') &&
    !sitEmp.includes('reduzido');
  const isHorarioReduzido = sitEmp.includes('reduzido');
  const isEstudante = sitEmp.includes('estudante');

  const autorizaSim = (dados.autoriza_divulgacao_dados || 'Sim') === 'Sim';

  const handleDownloadPdf = () => {
    gerarPdfFormularioInscricao(dados);
    setBaixouRecentemente(true);
    setTimeout(() => setBaixouRecentemente(false), 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-6">
      {/* Banner Principal de Conclusão e Download Imediato do PDF */}
      <div className="no-print rounded-xl border border-emerald-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-700">
                Inscrição Concluída · Modelo Oficial CFP-STP (Páginas 1/2 e 2/2)
              </p>
              <h2 className="mt-0.5 text-xl sm:text-2xl font-bold text-slate-900">
                Ficha de Inscrição do Formando Preenchida
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                N.º de Inscrição:{' '}
                <span className="font-mono-tabular font-bold text-slate-900">{seqNum}</span> · N.º de Processo:{' '}
                <span className="font-mono-tabular font-bold text-slate-900">{numProc}</span> · Protocolo:{' '}
                <span className="font-mono-tabular font-semibold text-emerald-800">
                  {dados.protocolo}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex min-h-[46px] items-center justify-center gap-2.5 rounded-lg bg-emerald-700 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-800 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            >
              <Download className="h-4 w-4" />
              <span>Baixar Ficha Oficial em PDF (2 Páginas)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir Ficha</span>
            </button>

            <button
              type="button"
              onClick={() => exportarInscricaoParaExcel(dados)}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {baixouRecentemente && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-2.5 text-xs font-medium text-emerald-900">
            O download do ficheiro <strong>{nomeFicheiroPdf}</strong> (modelo oficial 1/2 e 2/2) foi iniciado.
          </div>
        )}
      </div>

      {/* Grelha a toda a largura: Pré-visualização Fiel das 2 Páginas (Esquerda) + Painel de Ações PDF (Direita) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
        <div className="xl:col-span-8 2xl:col-span-9 space-y-8">
          {/* ==================================================================
              PÁGINA 1/2 — MODELO OFICIAL PREENCHIDO
             ================================================================== */}
          <div className="rounded-xl border border-slate-300 bg-white p-6 sm:p-10 shadow-xs text-slate-900">
            <CabecalhoOficialCfp />

            {/* Faixa Verde: FICHA DE INSCRIÇÃO DO FORMANDO */}
            <div className="my-4 flex justify-center">
              <span className="bg-[#1a8026] px-4 py-1 text-xs sm:text-sm font-bold tracking-wide text-white uppercase">
                FICHA DE INSCRIÇÃO DO FORMANDO
              </span>
            </div>

            {/* Topo: N.º de Inscrição / Data / Processo + Moldura FOTO */}
            <div className="mt-5 flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
              <div className="space-y-3 text-xs sm:text-sm text-[#1a8026]">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-bold">N.º de Inscrição:</span>
                  <span className="inline-block min-w-[140px] border-b border-[#1a8026] px-2 text-center font-mono-tabular font-bold text-slate-900">
                    {seqNum}
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span>Data de Inscrição</span>
                  <span className="inline-block min-w-[44px] border-b border-[#1a8026] px-1 text-center font-mono-tabular text-slate-900">
                    {dataInsc.dia}
                  </span>
                  <span className="font-bold">/</span>
                  <span className="inline-block min-w-[44px] border-b border-[#1a8026] px-1 text-center font-mono-tabular text-slate-900">
                    {dataInsc.mes}
                  </span>
                  <span className="font-bold">/</span>
                  <span className="inline-block min-w-[56px] border-b border-[#1a8026] px-1 text-center font-mono-tabular text-slate-900">
                    {dataInsc.ano}
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline gap-2">
                  <span>N.º DE PROCESSO:</span>
                  <span className="inline-block min-w-[140px] border-b border-[#1a8026] px-2 text-center font-mono-tabular font-semibold text-slate-900">
                    {numProc}
                  </span>
                  <span className="font-bold text-xs">(sequência de inscrição/mês/ano)</span>
                </div>
              </div>

              {/* Caixa FOTO */}
              <div className="h-36 w-28 shrink-0 border border-slate-900 bg-white flex items-center justify-center overflow-hidden self-start">
                {dados.fotoPreview ? (
                  <img
                    src={dados.fotoPreview}
                    alt={`Foto de ${dados.nome}`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-serif text-sm text-slate-900">FOTO</span>
                )}
              </div>
            </div>

            {/* 1 - Identificação do Candidato: */}
            <div className="mt-6 font-serif text-xs sm:text-sm space-y-3">
              <h4 className="font-sans text-sm font-bold text-[#1a8026] mb-3">
                1 - Identificação do Candidato:
              </h4>

              <div className="flex items-baseline gap-2">
                <span className="shrink-0">Nome:</span>
                <span className="flex-1 border-b border-slate-700 px-2 font-semibold text-slate-900">
                  {dados.nome}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="shrink-0">Filiação: Pai</span>
                <span className="flex-1 border-b border-slate-700 px-2 text-slate-900">
                  {dados.nome_pai}
                </span>
              </div>

              <div className="flex items-baseline gap-2 pl-12">
                <span className="shrink-0">Mãe</span>
                <span className="flex-1 border-b border-slate-700 px-2 text-slate-900">
                  {dados.nome_mae}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="sm:col-span-6 flex items-baseline gap-2">
                  <span className="shrink-0">N.º de B.I.:</span>
                  <span className="flex-1 border-b border-slate-700 px-2 font-mono-tabular font-semibold text-slate-900">
                    {dados.bi}
                  </span>
                </div>
                <div className="sm:col-span-6 flex items-baseline gap-2">
                  <span className="shrink-0">Arq. Ident.</span>
                  <span className="flex-1 border-b border-slate-700 px-2 text-slate-900">
                    {dados.arquivo_identificacao}
                  </span>
                </div>
              </div>

              <div className="flex items-baseline gap-2 max-w-md">
                <span className="shrink-0">Nº de Identificação Fiscal</span>
                <span className="flex-1 border-b border-slate-700 px-2 font-mono-tabular font-semibold text-slate-900">
                  {dados.nif}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                <div className="flex items-baseline gap-1">
                  <span>Data de Nascimento</span>
                  <span className="inline-block min-w-[36px] border-b border-slate-700 px-1 text-center font-mono-tabular">
                    {dataNasc.dia}
                  </span>
                  <span>/</span>
                  <span className="inline-block min-w-[36px] border-b border-slate-700 px-1 text-center font-mono-tabular">
                    {dataNasc.mes}
                  </span>
                  <span>/</span>
                  <span className="inline-block min-w-[48px] border-b border-slate-700 px-1 text-center font-mono-tabular">
                    {dataNasc.ano}
                  </span>
                  <span>.</span>
                </div>

                <div className="flex items-baseline gap-2 flex-1 min-w-[140px]">
                  <span>Sexo</span>
                  <span className="flex-1 border-b border-slate-700 px-2 text-center">
                    {dados.sexo}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 flex-1 min-w-[120px]">
                  <span>Idade</span>
                  <span className="flex-1 border-b border-slate-700 px-2 text-center font-mono-tabular">
                    {dados.datanascimento && calcularIdade(dados.datanascimento) !== null
                      ? `${calcularIdade(dados.datanascimento)} anos`
                      : dados.idade && !isNaN(Number(dados.idade)) && Number(dados.idade) > 0
                      ? `${dados.idade} anos`
                      : ''}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="sm:col-span-6 flex items-baseline gap-2">
                  <span className="shrink-0">Nacionalidade:</span>
                  <span className="flex-1 border-b border-slate-700 px-2">
                    {dados.nacionalidade}
                  </span>
                </div>
                <div className="sm:col-span-6 flex items-baseline gap-2">
                  <span className="shrink-0">Local de Nascimento</span>
                  <span className="flex-1 border-b border-slate-700 px-2">
                    {dados.naturalidade}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="sm:col-span-6 flex items-baseline gap-2">
                  <span className="shrink-0">Estado Civil:</span>
                  <span className="flex-1 border-b border-slate-700 px-2">
                    {dados.estado_civil}
                  </span>
                </div>
                <div className="sm:col-span-6 flex items-baseline gap-2">
                  <span className="shrink-0">N.º pessoas do agregado familiar :</span>
                  <span className="flex-1 border-b border-slate-700 px-2 text-center font-mono-tabular">
                    {dados.agregado_familiar}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="sm:col-span-7 flex items-baseline gap-2">
                  <span className="shrink-0">Morada:</span>
                  <span className="flex-1 border-b border-slate-700 px-2">
                    {dados.morada}
                  </span>
                </div>
                <div className="sm:col-span-5 flex items-baseline gap-2">
                  <span className="shrink-0">Distrito:</span>
                  <span className="flex-1 border-b border-slate-700 px-2">
                    {dados.distrito}
                  </span>
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="shrink-0">Contacto telefónico:</span>
                <span className="flex-1 border-b border-slate-700 px-2 font-mono-tabular">
                  {dados.telefone}
                  {dados.telefone2 ? ` / ${dados.telefone2}` : ''}
                  {dados.email ? ` · ${dados.email}` : ''}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="shrink-0">Ocupação:</span>
                <span className="flex-1 border-b border-slate-700 px-2">
                  {dados.ocupacao}
                </span>
              </div>
            </div>

            {/* 2 – Habilitações Literárias */}
            <div className="mt-6 font-serif text-xs sm:text-sm flex flex-wrap items-baseline gap-2">
              <span className="font-bold">2 –Habilitações Literárias</span>
              <span>(concluídas) :</span>
              <span className="flex-1 border-b border-slate-700 px-2 font-semibold">
                {dados.habilitacao}
              </span>
            </div>

            {/* 3 – Formação Profissional */}
            <div className="mt-6 font-serif text-xs sm:text-sm space-y-2">
              <p>
                <strong className="font-bold">3 –Formação Profissional</strong>{' '}
                <span className="text-xs">
                  (Se já frequentou algum Curso de formação diga o curso, local , duração e data conclusão)
                </span>
              </p>
              <div className="min-h-[26px] border-b border-slate-700 px-2 py-0.5">
                {dados.formacao_profissional || ''}
              </div>
              <div className="h-5 border-b border-slate-700" />
            </div>

            {/* 4- Experiência Profissional */}
            <div className="mt-6 font-serif text-xs sm:text-sm space-y-2">
              <p>
                <strong className="font-bold">4- Experiência Profissional</strong>{' '}
                <span className="text-xs">
                  (Se já trabalhou refira local de trabalho, funções exercidas e tempo de serviço).
                </span>
              </p>
              <div className="min-h-[26px] border-b border-slate-700 px-2 py-0.5">
                {dados.experiencia_profissional || ''}
              </div>
              <div className="h-5 border-b border-slate-700" />
            </div>

            {/* 5- Motivo da Inscrição no Centro de Formação */}
            <div className="mt-6 font-serif text-xs sm:text-sm space-y-2">
              <p>
                <strong className="font-bold">
                  5- Motivo da Inscrição no Centro de Formação:
                </strong>{' '}
                <span className="text-xs">(preenchimento obrigatório)</span>
              </p>
              <div className="min-h-[26px] border-b border-slate-700 px-2 py-0.5">
                {dados.motivo_inscricao}
              </div>
              <div className="h-5 border-b border-slate-700" />
            </div>

            {/* 5.1 Curso ou área de formação pretendida pelo Candidato */}
            <div className="mt-6 font-serif text-xs sm:text-sm space-y-3">
              <p>
                <strong className="font-bold">
                  5.1 Curso ou área de formação pretendida pelo Candidato
                </strong>{' '}
                <span className="text-xs">(preenchimento obrigatório)</span>
              </p>
              <div className="flex items-baseline gap-2">
                <span className="shrink-0">1ª Opção</span>
                <span className="flex-1 border-b border-slate-700 px-2 font-semibold">
                  {dados.curso_nome}
                  {dados.programa_nome ? ` (${dados.programa_nome})` : ''}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="shrink-0">2ª Opção</span>
                <span className="flex-1 border-b border-slate-700 px-2">
                  {dados.curso_opcao_2_nome
                    ? `${dados.curso_opcao_2_nome} (${dados.curso_opcao_2_programa})`
                    : ''}
                </span>
              </div>
            </div>

            <RodapeOficialCfp pagina="1/2" />
          </div>

          {/* ==================================================================
              PÁGINA 2/2 — A PREENCHER PELOS SERVIÇOS E SITUAÇÃO DA CANDIDATURA
             ================================================================== */}
          <div className="rounded-xl border border-slate-300 bg-white p-6 sm:p-10 shadow-xs text-slate-900 font-serif">
            <CabecalhoOficialCfp />

            <div className="my-5 text-center">
              <h4 className="inline-block border-b border-slate-900 font-bold text-sm uppercase">
                A PREENCHER PELOS SERVIÇOS
              </h4>
            </div>

            {/* 6 – Situação do Candidato perante o Emprego */}
            <div className="mt-6 text-xs sm:text-sm space-y-2.5">
              <h5 className="font-bold text-sm sm:text-base">
                6 – Situação do Candidato perante o Emprego
              </h5>

              <div className="flex items-center justify-between gap-2">
                <span>1. Candidato à Procura do 1º Emprego</span>
                <span className="flex-1 border-b border-dotted border-slate-400 mx-2" />
                <span className="inline-flex h-4 w-7 items-center justify-center border border-slate-900 font-sans text-xs font-bold text-[#1a8026]">
                  {isPrimeiroEmprego ? 'X' : ''}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span>2. Desempregado à procura de Novo Emprego</span>
                <span className="flex-1 border-b border-dotted border-slate-400 mx-2" />
                <span className="inline-flex h-4 w-7 items-center justify-center border border-slate-900 font-sans text-xs font-bold text-[#1a8026]">
                  {isNovoEmprego ? 'X' : ''}
                </span>
              </div>

              <div className="pl-5 flex items-baseline gap-2 text-xs">
                <span>Actividade profissional anterior :</span>
                <span className="flex-1 max-w-md border-b border-slate-700 px-2">
                  {dados.atividade_profissional_anterior ||
                    (isNovoEmprego ? dados.experiencia_profissional || dados.ocupacao : '')}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span>3. Empregado/Activo</span>
                <span className="flex-1 border-b border-dotted border-slate-400 mx-2" />
                <span className="inline-flex h-4 w-7 items-center justify-center border border-slate-900 font-sans text-xs font-bold text-[#1a8026]">
                  {isEmpregadoActivo ? 'X' : ''}
                </span>
              </div>

              <div className="pl-5 flex items-center justify-between gap-2">
                <span>Empregado com horário reduzido</span>
                <span className="flex-1 border-b border-dotted border-slate-400 mx-2" />
                <span className="inline-flex h-4 w-7 items-center justify-center border border-slate-900 font-sans text-xs font-bold text-[#1a8026]">
                  {isHorarioReduzido ? 'X' : ''}
                </span>
              </div>

              <div className="pl-5 flex flex-wrap items-baseline gap-2 text-xs">
                <span>Função que exerce :</span>
                <span className="min-w-[180px] flex-1 border-b border-slate-700 px-2">
                  {dados.funcao_exerce ||
                    (isEmpregadoActivo || isHorarioReduzido ? dados.ocupacao : '')}
                </span>
                <span>desde</span>
                <span className="min-w-[100px] border-b border-slate-700 px-2 text-center">
                  {dados.funcao_desde || ''}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span>4. Profissão</span>
                <span className="flex-1 max-w-lg border-b border-slate-700 px-2">
                  {dados.profissao || (!isEstudante ? dados.ocupacao : '')}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span>5. Estudante</span>
                <span className="flex-1 border-b border-dotted border-slate-400 mx-2" />
                <span className="inline-flex h-4 w-7 items-center justify-center border border-slate-900 font-sans text-xs font-bold text-[#1a8026]">
                  {isEstudante ? 'X' : ''}
                </span>
              </div>

              <div className="pl-5 flex items-baseline gap-2 text-xs">
                <span>Nível de Escolaridade</span>
                <span className="flex-1 max-w-md border-b border-dotted border-slate-600 px-2">
                  {dados.habilitacao}
                </span>
              </div>
            </div>

            {/* 7- Casos Especiais */}
            <div className="mt-7 text-xs sm:text-sm space-y-2.5">
              <p>
                <strong className="font-bold">7- Casos Especiais:</strong>{' '}
                <span className="text-xs">(preenchimento obrigatório)</span>
              </p>

              <div className="flex flex-wrap items-baseline gap-2 font-bold">
                <span>Deficiente</span>
                <span className="inline-block min-w-[48px] border-b border-slate-700 px-1 text-center font-normal">
                  {dados.possui_caso_especial === 'Sim' ? 'Sim' : 'Não'}
                </span>
                <span>, Encaminhado por Instituição de Apoio Social :</span>
                <span className="inline-block min-w-[48px] border-b border-slate-700 px-1 text-center font-normal">
                  {dados.encaminhado_apoio_social || 'Não'}
                </span>
                <span>Qual:</span>
                <span className="flex-1 min-w-[140px] border-b border-slate-700 px-2 font-normal">
                  {dados.instituicao_apoio_social ||
                    (dados.possui_caso_especial === 'Sim' ? dados.casos_especiais : '')}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-2 font-bold">
                <span>Encaminhado por outra instituição: Qual</span>
                <span className="flex-1 border-b border-slate-700 px-2 font-normal">
                  {dados.encaminhado_outra_instituicao || ''}
                </span>
              </div>
            </div>

            {/* SITUAÇÃO DA CANDIDATURA */}
            <div className="my-7 text-center">
              <h4 className="inline-block border-b border-slate-900 font-bold text-base uppercase">
                SITUAÇÃO DA CANDIDATURA
              </h4>
            </div>

            {/* 8 – O candidato ficou inscrito no CURSO: */}
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex flex-wrap items-baseline gap-2">
                <strong className="font-bold">
                  8 – O candidato ficou inscrito no CURSO:
                </strong>
                <span className="flex-1 border-b border-slate-700 px-2 font-bold">
                  {dados.curso_nome}
                </span>
              </div>
              <div className="pl-44">
                <div className="border-b border-slate-700 px-2 text-xs text-slate-700 min-h-[20px]">
                  {[
                    dados.curso_local ? `Local: ${dados.curso_local}` : '',
                    dados.curso_horario ? `Horário: ${dados.curso_horario}` : '',
                    dados.curso_acao ? `Ação: ${dados.curso_acao}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
            </div>

            {/* PROGRAMA */}
            <div className="mt-6 text-xs sm:text-sm space-y-2">
              <h5 className="font-bold uppercase">PROGRAMA</h5>
              {(
                [
                  { label: 'QUALIFICAÇÃO INICIAL', chave: 'QUALIFICACAO_INICIAL' },
                  { label: 'APRENDIZAGEM PROFISSIONAL', chave: 'APRENDIZAGEM' },
                  { label: 'APERFEIÇOAMENTO PROFISSIONAL', chave: 'APERFEICOAMENTO' },
                  { label: 'ESTÁGIO PROFISSIONAL', chave: 'ESTAGIO' },
                  { label: 'QUALIFICAÇÃO E EMPREGO', chave: 'QUALIFICACAO_EMPREGO' },
                  { label: 'CURSO DE GESTÃO / ACPE', chave: 'ACPE' },
                  { label: 'OUTROS', chave: 'OUTROS' },
                ] as const
              ).map((prog) => {
                const selecionado = verificarProgramaSelecionado(dados, prog.chave);
                return (
                  <div key={prog.chave} className="flex items-center justify-between gap-2">
                    <span>{prog.label}</span>
                    <span className="flex-1 border-b border-dotted border-slate-400 mx-2" />
                    <span className="inline-flex h-4 w-7 items-center justify-center border border-slate-900 font-sans text-xs font-bold text-[#1a8026]">
                      {selecionado ? 'X' : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 9. Divulgação de dados */}
            <div className="mt-6 text-xs sm:text-sm font-bold flex flex-wrap items-baseline gap-2">
              <span>
                9. – Caso seja selecionado, permitirá que seus dados sejam divulgados? Sim
              </span>
              <span className="inline-block min-w-[44px] border-b border-slate-700 text-center text-[#1a8026]">
                {autorizaSim ? 'X' : ''}
              </span>
              <span>Não</span>
              <span className="inline-block min-w-[44px] border-b border-slate-700 text-center text-[#1a8026]">
                {!autorizaSim ? 'X' : ''}
              </span>
            </div>

            {/* Recebido por & Assinatura */}
            <div className="mt-8 flex flex-col justify-between gap-8 sm:flex-row sm:items-end text-xs sm:text-sm font-bold">
              <div>
                <span>Recebido por: :.........................................................</span>
              </div>
              <div className="text-center">
                <p className="mb-6">Assinatura do Candidato(a)</p>
                <div className="w-56 border-b border-slate-900 mx-auto" />
              </div>
            </div>


            <RodapeOficialCfp pagina="2/2" />
          </div>
        </div>

        {/* Coluna Lateral: Cartão de Download do Ficheiro PDF Oficial (Páginas 1/2 e 2/2) */}
        <aside className="no-print xl:col-span-4 2xl:col-span-3 space-y-5 xl:sticky xl:top-20">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">
                  Ficheiro PDF Oficial (1/2 e 2/2)
                </h3>
                <p
                  className="mt-0.5 truncate font-mono-tabular text-xs text-slate-500"
                  title={nomeFicheiroPdf}
                >
                  {nomeFicheiroPdf}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              O ficheiro PDF segue exatamente o modelo oficial de 2 páginas da <strong>Ficha de Inscrição do Formando do CFP-STP</strong>, preenchido com os seus dados e opções de curso.
            </p>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Baixar Ficheiro PDF Agora</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir Ficha (2 Páginas A4)</span>
              </button>

              {aoEditarInscricao && (
                <button
                  type="button"
                  onClick={aoEditarInscricao}
                  className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Corrigir Dados da Ficha</span>
                </button>
              )}

              <button
                type="button"
                onClick={aoNovaInscricao}
                className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50/50 transition-colors cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Iniciar Nova Inscrição</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
