/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  BookOpen,
  HelpCircle,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  GraduationCap,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { ModuloCandidatoApp, ModuloCandidatoAba } from './packages/modulo-candidato';
import { verificarConexaoBackend } from './services/api';

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState<ModuloCandidatoAba>('candidatura_publica');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    tipo: 'sucesso' | 'erro';
    texto: string;
  } | null>(null);

  const [statusBackend, setStatusBackend] = useState<{
    verificado: boolean;
    conectado: boolean;
    mensagem: string;
    testando: boolean;
  }>({ verificado: false, conectado: true, mensagem: '', testando: false });

  const testarConexaoBackend = async () => {
    setStatusBackend((prev) => ({ ...prev, testando: true }));
    const resultado = await verificarConexaoBackend();
    setStatusBackend({
      verificado: true,
      conectado: resultado.statusOk,
      mensagem: resultado.mensagem,
      testando: false,
    });
  };

  useEffect(() => {
    testarConexaoBackend();
  }, []);

  const navegarPara = (novaAba: ModuloCandidatoAba) => {
    setAbaAtiva(novaAba);
    setMobileMenuOpen(false);
    setFeedbackMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-700 selection:text-white">
      {/* Barra de Topo Institucional CFP-STP */}
      <div className="no-print bg-emerald-950 text-emerald-200/90 text-xs border-b border-emerald-900">
        <div className="max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 py-1.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-white">Inscrições Online Abertas</span>
            <span className="hidden sm:inline text-emerald-300/70">·</span>
            <span className="hidden sm:inline">Ano Formativo 2026/2027</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-emerald-200/80">
            <span className="hidden md:flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              Água Grande / Budo Budo, São Tomé
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-emerald-400" />
              +239 980 3602 / +239 906 9235
            </span>
            <span className="hidden lg:flex items-center gap-1">
              <Mail className="w-3 h-3 text-emerald-400" />
              suporte.cfpstp@gmail.com
            </span>
          </div>
        </div>
      </div>

      {/* Cabeçalho Principal com Navegação */}
      <header className="no-print bg-emerald-900 text-white sticky top-0 z-50 shadow-md border-b border-emerald-800">
        <div className="max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-16">
            {/* Logotipo e Identidade Institucional */}
            <a
              href="#inicio"
              onClick={(e) => {
                e.preventDefault();
                navegarPara('candidatura_publica');
              }}
              className="flex items-center gap-3 no-underline text-white group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600 border border-emerald-400/40 flex items-center justify-center font-bold text-white shadow-inner text-sm group-hover:scale-105 transition-transform">
                CFP
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold leading-tight tracking-tight text-white group-hover:text-emerald-200 transition-colors">
                  Centro de Formação Profissional de São Tomé e Príncipe
                </h1>
                <p className="text-[11px] text-emerald-200/80 hidden sm:block">
                  Portal Oficial do Candidato · Emissão Instantânea da Ficha em PDF (2 Páginas)
                </p>
              </div>
            </a>

            {/* Navegação Desktop */}
            <nav className="hidden md:flex items-center gap-1.5" aria-label="Navegação do Candidato">
              <button
                type="button"
                onClick={() => navegarPara('candidatura_publica')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  abaAtiva === 'candidatura_publica'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-100 hover:text-white hover:bg-emerald-800/70'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Nova Candidatura
              </button>

              <button
                type="button"
                onClick={() => navegarPara('catalogo_cursos')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  abaAtiva === 'catalogo_cursos'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-100 hover:text-white hover:bg-emerald-800/70'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Catálogo de Cursos
              </button>

              <button
                type="button"
                onClick={() => navegarPara('consulta_publica')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  abaAtiva === 'consulta_publica'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-100 hover:text-white hover:bg-emerald-800/70'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Consultar Estado &amp; Ficha PDF
              </button>

              <button
                type="button"
                onClick={() => navegarPara('guia_candidato')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  abaAtiva === 'guia_candidato'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-100 hover:text-white hover:bg-emerald-800/70'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Guia &amp; Requisitos
              </button>
            </nav>

            {/* Botão de Menu Mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg text-emerald-100 hover:bg-emerald-800"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Menu Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-emerald-800 bg-emerald-950 px-4 py-3 space-y-1.5">
            <button
              type="button"
              onClick={() => navegarPara('candidatura_publica')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                abaAtiva === 'candidatura_publica'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-100 hover:bg-emerald-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              Nova Candidatura Online
            </button>

            <button
              type="button"
              onClick={() => navegarPara('catalogo_cursos')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                abaAtiva === 'catalogo_cursos'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-100 hover:bg-emerald-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Catálogo de Cursos 2026/2027
            </button>

            <button
              type="button"
              onClick={() => navegarPara('consulta_publica')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                abaAtiva === 'consulta_publica'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-100 hover:bg-emerald-900'
              }`}
            >
              <Search className="w-4 h-4" />
              Consultar Estado e Baixar Ficha PDF
            </button>

            <button
              type="button"
              onClick={() => navegarPara('guia_candidato')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                abaAtiva === 'guia_candidato'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-100 hover:bg-emerald-900'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              Guia do Candidato &amp; Requisitos
            </button>
          </div>
        )}
      </header>

      {/* Alerta Global de Notificação */}
      {feedbackMsg && (
        <div className="no-print max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 mt-4 w-full">
          <div
            className={`p-4 rounded-xl flex items-center justify-between shadow-xs border ${
              feedbackMsg.tipo === 'sucesso'
                ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                : 'bg-rose-50 text-rose-950 border-rose-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {feedbackMsg.tipo === 'sucesso' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="text-xs sm:text-sm font-semibold">
                {feedbackMsg.texto}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline ml-4 cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo Principal do Módulo do Candidato */}
      <main className="max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 py-6 w-full flex-1">
        <ModuloCandidatoApp
          abaAtiva={abaAtiva}
          aoMudarAba={(aba) => navegarPara(aba)}
          aoNotificar={setFeedbackMsg}
        />
      </main>

      {/* Rodapé Institucional CFP-STP */}
      <footer className="no-print bg-white border-t border-slate-200 mt-auto py-8 text-xs text-slate-600">
        <div className="max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-6 border-b border-slate-200">
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white font-bold flex items-center justify-center text-xs">
                  CFP
                </div>
                <span className="font-bold text-slate-900 text-sm">
                  Centro de Formação Profissional de São Tomé e Príncipe
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
                Instituição pública de referência na formação técnico-profissional e valorização do capital humano na República Democrática de São Tomé e Príncipe.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-2">Acesso Rápido</h4>
              <ul className="space-y-1.5">
                <li>
                  <button
                    type="button"
                    onClick={() => navegarPara('candidatura_publica')}
                    className="hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    Fazer Inscrição Online
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navegarPara('catalogo_cursos')}
                    className="hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    Ver Cursos Disponíveis
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navegarPara('consulta_publica')}
                    className="hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    Consultar Estado &amp; 2.ª Via PDF
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navegarPara('guia_candidato')}
                    className="hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    Requisitos &amp; Documentação
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-2">Secretaria &amp; Apoio ao Candidato</h4>
              <p className="text-slate-500 leading-relaxed">
                Água Grande / Budo Budo<br />
                São Tomé · República Democrática de São Tomé e Príncipe<br />
                Email: <strong>suporte.cfpstp@gmail.com</strong><br />
                Tel: <strong>+239 980 3602 / +239 906 9235</strong>
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <p>
              © {new Date().getFullYear()} Centro de Formação Profissional (CFP-STP). Todos os direitos reservados.
            </p>
            <p className="flex items-center gap-1 text-emerald-800 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Portal Oficial do Candidato · Emissão Certificada em PDF
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
