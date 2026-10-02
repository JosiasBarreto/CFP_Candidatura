import React from 'react';
import {
  BookOpen,
  FileCheck2,
  Calendar,
  CheckCircle,
  HelpCircle,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  Shield,
  Clock,
  Award,
} from 'lucide-react';

interface GuiaCandidatoViewProps {
  aoIniciarCandidatura: () => void;
  aoVerCatalogo: () => void;
}

export const GuiaCandidatoView: React.FC<GuiaCandidatoViewProps> = ({
  aoIniciarCandidatura,
  aoVerCatalogo,
}) => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hero Banner do Guia */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 rounded-3xl text-white p-8 md:p-10 shadow-lg border border-emerald-800/60 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5 text-emerald-300" />
            Centro de Formação Profissional de São Tomé e Príncipe (CFP-STP)
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
            Guia Oficial do Candidato 2026/2027
          </h2>
          <p className="text-emerald-100/90 text-sm md:text-base leading-relaxed">
            Conheça os requisitos, os documentos necessários, as etapas do processo seletivo e o funcionamento das inscrições para os cursos de qualificação e aperfeiçoamento profissional.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={aoIniciarCandidatura}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold px-6 py-3 rounded-xl text-xs md:text-sm shadow-md transition-all cursor-pointer"
            >
              Fazer Candidatura Online
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={aoVerCatalogo}
              className="inline-flex items-center gap-2 bg-emerald-900/60 hover:bg-emerald-800/80 text-white font-semibold px-5 py-3 rounded-xl text-xs md:text-sm border border-emerald-700/60 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-emerald-300" />
              Ver Cursos Disponíveis
            </button>
          </div>
        </div>
      </div>

      {/* Grid de 4 Pilares Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-4">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-2">1. Documentos Exigidos</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Bilhete de Identidade (BI) ou passaporte válido, NIF (Contribuinte), Certificado de Habilitações Literárias e 1 fotografia tipo passe (tirada na câmara ou em ficheiro).
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold mb-4">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-2">2. Duas Opções de Curso</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pode selecionar uma 1.ª Opção e uma 2.ª Opção de curso. Caso a 1.ª opção atinja o limite de vagas, a comissão considerará a sua 2.ª opção prioritariamente.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-4">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-2">3. Ficha em PDF Imediata</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Ao submeter os seus dados, o sistema gera automaticamente a <strong>Ficha Oficial de Inscrição em PDF (2 páginas)</strong> com o seu código oficial de candidatura.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold mb-4">
            <CheckCircle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-2">4. Acompanhamento</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Consulte a qualquer momento o estado da sua candidatura com o seu número de BI ou Código de Protocolo (ex: <code>CAND-2026-0001</code>).
          </p>
        </div>
      </div>

      {/* Programas Disponíveis */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-700" />
            Programas Formativos Oferecidos pelo CFP-STP
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Escolha o programa que melhor se adequa ao seu perfil e objetivos profissionais.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-200/60 px-2.5 py-1 rounded-md">
              Programa 1
            </span>
            <h4 className="font-bold text-slate-900 text-base">Qualificação Inicial</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Destinado a jovens e adultos à procura da 1.ª qualificação técnica nas áreas de Eletricidade, Mecânica Auto, Construção Civil, Frio e Climatização, Canalização e Informática.
            </p>
            <div className="text-[11px] text-emerald-900 font-semibold pt-1">
              Duração: 6 a 9 meses · Regime Diurno
            </div>
          </div>

          <div className="p-5 rounded-xl border border-teal-200 bg-teal-50/40 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 bg-teal-200/60 px-2.5 py-1 rounded-md">
              Programa 2
            </span>
            <h4 className="font-bold text-slate-900 text-base">Aperfeiçoamento Profissional</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cursos intensivos de especialização e atualização técnica para quem já atua ou possui formação básica e pretende dominar tecnologias recentes.
            </p>
            <div className="text-[11px] text-teal-900 font-semibold pt-1">
              Duração: 1 a 3 meses · Regime Pós-Laboral e Noturno
            </div>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-200 px-2.5 py-1 rounded-md">
              Programa 3
            </span>
            <h4 className="font-bold text-slate-900 text-base">Estágios e Inserção</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Programas de integração prática em empresas parceiras e oficinas industriais com acompanhamento pedagógico de instrutores credenciados.
            </p>
            <div className="text-[11px] text-slate-800 font-semibold pt-1">
              Duração: 3 a 6 meses · Empresas de São Tomé e Príncipe
            </div>
          </div>
        </div>
      </div>

      {/* Perguntas Frequentes (FAQ) */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-700" />
            Perguntas Frequentes do Candidato (FAQ)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
          <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h5 className="font-bold text-slate-900 text-sm">
              Como funciona o processo de inscrição online?
            </h5>
            <p className="text-slate-600">
              Preencha o formulário eletrónico com os seus dados pessoais, selecione as opções de curso e anexe os documentos requeridos. Receberá imediatamente a sua Ficha Oficial preenchida em PDF (2 páginas).
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h5 className="font-bold text-slate-900 text-sm">
              Como sei se a minha candidatura foi recebida?
            </h5>
            <p className="text-slate-600">
              Assim que clica em "Submeter", o sistema emite imediatamente o código oficial (ex: CAND-2026-0001) e inicia o download da Ficha Oficial em PDF.
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h5 className="font-bold text-slate-900 text-sm">
              Posso tirar a fotografia na hora pelo telemóvel ou computador?
            </h5>
            <p className="text-slate-600">
              Sim! O sistema possui integração direta com a câmara do seu dispositivo, permitindo enquadrar e capturar a foto tipo passe no momento da inscrição.
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h5 className="font-bold text-slate-900 text-sm">
              O que fazer se a minha candidatura ficar com estado "DEVOLVIDA"?
            </h5>
            <p className="text-slate-600">
              Caso algum dado esteja incompleto ou um anexo esteja ilegível, o motivo constará na página de consulta. Basta contactar a secretaria com o seu código para retificar.
            </p>
          </div>
        </div>
      </div>

      {/* Contactos e Localização da Secretaria */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <h4 className="text-lg font-bold text-white">Secretaria de Inscrições e Apoio ao Candidato CFP-STP</h4>
          <p className="text-xs text-slate-300 max-w-xl">
            Atendimento presencial e apoio ao formando de Segunda a Sexta-feira, das 08h00 às 15h30.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-emerald-300 pt-2">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Água Grande / Budo Budo, São Tomé
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-emerald-400" />
              +239 980 3602 / +239 906 9235
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-emerald-400" />
              suporte.cfpstp@gmail.com
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={aoIniciarCandidatura}
          className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all whitespace-nowrap cursor-pointer"
        >
          Iniciar Inscrição Agora &rarr;
        </button>
      </div>
    </div>
  );
};
