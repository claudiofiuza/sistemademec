
# 🛠️ LSC Pro - Workshop Manager (GTA RP)

O **LSC Pro** é um sistema avançado de gerenciamento para oficinas mecânicas em servidores de GTA RP. Desenvolvido com foco em UX/UI de alto nível, o sistema oferece desde uma calculadora inteligente até painéis administrativos complexos.

## ✨ Funcionalidades

- 🔐 **Login Multifator**: Acesso restrito com suporte a múltiplos workshops e um modo "Super Admin" (Panda).
- 🧮 **Calculadora de Serviços**: 
  - Cálculo automático de mão de obra (Freelance) + Peças.
  - Suporte a anexo de prints via **Ctrl+V** ou upload.
  - **IA Gemini Integration**: Analisa o print para identificar o veículo e upgrades sugeridos.
- 👥 **Gestão de Equipe (RH)**:
  - Sistema de Ponto Eletrônico (Bater ponto, pausar, encerrar).
  - Auditoria de registros com deleção individual ou em massa.
  - Estatísticas de horas trabalhadas por período (Diário/Semanal/Mensal).
- 📢 **Comunicados Internos**: Sistema de avisos com níveis de urgência (Info, Alerta, Urgente).
- ⚙️ **Painel Administrativo Modular**:
  - Personalização de cores da oficina, logo e taxas.
  - Gerenciamento de Cargos e Permissões granulares.
  - Configuração de Webhooks do Discord (Canais separados para Estética e Performance).
- 🌐 **Controle Central**: Visão global de todas as oficinas cadastradas (Exclusivo Super Admin).

## 🚀 Tecnologias Utilizadas

- **React 19** + **TypeScript**
- **Tailwind CSS** (Design Moderno & Responsivo)
- **Google Gemini API** (Análise Inteligente de Imagens)
- **React Router Dom 7** (Navegação SPA)
- **Font Awesome 6** (Iconografia)

## 🛠️ Configuração Inicial

Para rodar o projeto localmente ou em produção, você precisará de uma chave de API do Google Gemini.

1. Clone o repositório.
2. Configure sua chave de API nas variáveis de ambiente como `API_KEY`.
3. Os dados são persistidos via `localStorage`, garantindo funcionamento offline e persistência básica.

---
*Desenvolvido para a comunidade de GTA RP.*
