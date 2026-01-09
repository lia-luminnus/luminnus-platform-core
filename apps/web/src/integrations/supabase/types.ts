export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "admin_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_conversations: {
        Row: {
          created_at: string
          id: string
          message_count: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_count?: number
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      agenda: {
        Row: {
          cliente_id: string
          created_at: string | null
          data: string
          descricao: string | null
          hora: string
          id: string
          imovel_id: string | null
          status: string | null
          tipo: string
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          data: string
          descricao?: string | null
          hora: string
          id?: string
          imovel_id?: string | null
          status?: string | null
          tipo: string
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          data?: string
          descricao?: string | null
          hora?: string
          id?: string
          imovel_id?: string | null
          status?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamentos: {
        Row: {
          created_at: string
          data: string
          descricao: string | null
          hora: string
          id: string
          status: string | null
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: string
          descricao?: string | null
          hora: string
          id?: string
          status?: string | null
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string | null
          hora?: string
          id?: string
          status?: string | null
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      buscas_clientes: {
        Row: {
          casas_banho: string | null
          created_at: string | null
          email: string | null
          id: string
          localizacao: string | null
          nome: string | null
          preco_max: number | null
          preco_min: number | null
          telefone: string | null
          tipo_imovel: string | null
          tipologia: string | null
          valor_aprovado: number | null
        }
        Insert: {
          casas_banho?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          localizacao?: string | null
          nome?: string | null
          preco_max?: number | null
          preco_min?: number | null
          telefone?: string | null
          tipo_imovel?: string | null
          tipologia?: string | null
          valor_aprovado?: number | null
        }
        Update: {
          casas_banho?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          localizacao?: string | null
          nome?: string | null
          preco_max?: number | null
          preco_min?: number | null
          telefone?: string | null
          tipo_imovel?: string | null
          tipologia?: string | null
          valor_aprovado?: number | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string | null
          email: string
          endereco: string | null
          id: string
          nome: string
          status_processo: string | null
          telefone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          endereco?: string | null
          id?: string
          nome: string
          status_processo?: string | null
          telefone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          endereco?: string | null
          id?: string
          nome?: string
          status_processo?: string | null
          telefone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          cnpj: string
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          plan: string | null
          status: string | null
          users_count: number | null
        }
        Insert: {
          cnpj: string
          created_at?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          plan?: string | null
          status?: string | null
          users_count?: number | null
        }
        Update: {
          cnpj?: string
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          plan?: string | null
          status?: string | null
          users_count?: number | null
        }
        Relationships: []
      }
      imoveis: {
        Row: {
          area: number | null
          banheiros: number | null
          caracteristicas: string[] | null
          created_at: string | null
          descricao: string | null
          disponivel: boolean | null
          fotos: string[] | null
          id: string
          localizacao: string
          preco: number
          quartos: number | null
          tipologia: string | null
          titulo: string
        }
        Insert: {
          area?: number | null
          banheiros?: number | null
          caracteristicas?: string[] | null
          created_at?: string | null
          descricao?: string | null
          disponivel?: boolean | null
          fotos?: string[] | null
          id?: string
          localizacao: string
          preco: number
          quartos?: number | null
          tipologia?: string | null
          titulo: string
        }
        Update: {
          area?: number | null
          banheiros?: number | null
          caracteristicas?: string[] | null
          created_at?: string | null
          descricao?: string | null
          disponivel?: boolean | null
          fotos?: string[] | null
          id?: string
          localizacao?: string
          preco?: number
          quartos?: number | null
          tipologia?: string | null
          titulo?: string
        }
        Relationships: []
      }
      imoveis_sugeridos: {
        Row: {
          cliente_id: string
          created_at: string | null
          id: string
          imovel_id: string
          nota_lia: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          id?: string
          imovel_id: string
          nota_lia?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          id?: string
          imovel_id?: string
          nota_lia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imoveis_sugeridos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imoveis_sugeridos_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
        ]
      }
      lia_configurations: {
        Row: {
          created_at: string
          id: string
          max_tokens: number | null
          metrics_settings: Json | null
          openai_api_key: string | null
          openai_model: string | null
          render_api_url: string | null
          supabase_anon_key: string | null
          supabase_service_role_key: string | null
          supabase_url: string | null
          system_prompt: string | null
          temperature: number | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          max_tokens?: number | null
          metrics_settings?: Json | null
          openai_api_key?: string | null
          openai_model?: string | null
          render_api_url?: string | null
          supabase_anon_key?: string | null
          supabase_service_role_key?: string | null
          supabase_url?: string | null
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          max_tokens?: number | null
          metrics_settings?: Json | null
          openai_api_key?: string | null
          openai_model?: string | null
          render_api_url?: string | null
          supabase_anon_key?: string | null
          supabase_service_role_key?: string | null
          supabase_url?: string | null
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      metrics_alerts: {
        Row: {
          created_at: string
          fonte: string
          id: string
          mensagem: string
          nivel: string | null
          resolvido: boolean | null
          resolvido_em: string | null
          tipo_alerta: string
          valor_atual: number | null
          valor_limite: number | null
        }
        Insert: {
          created_at?: string
          fonte: string
          id?: string
          mensagem: string
          nivel?: string | null
          resolvido?: boolean | null
          resolvido_em?: string | null
          tipo_alerta: string
          valor_atual?: number | null
          valor_limite?: number | null
        }
        Update: {
          created_at?: string
          fonte?: string
          id?: string
          mensagem?: string
          nivel?: string | null
          resolvido?: boolean | null
          resolvido_em?: string | null
          tipo_alerta?: string
          valor_atual?: number | null
          valor_limite?: number | null
        }
        Relationships: []
      }
      metrics_cartesia: {
        Row: {
          caracteres_enviados: number
          created_at: string
          creditos_restantes: number | null
          creditos_usados: number | null
          custo_estimado: number | null
          data: string
          empresa_id: string | null
          id: string
          minutos_fala: number | null
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          caracteres_enviados?: number
          created_at?: string
          creditos_restantes?: number | null
          creditos_usados?: number | null
          custo_estimado?: number | null
          data?: string
          empresa_id?: string | null
          id?: string
          minutos_fala?: number | null
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          caracteres_enviados?: number
          created_at?: string
          creditos_restantes?: number | null
          creditos_usados?: number | null
          custo_estimado?: number | null
          data?: string
          empresa_id?: string | null
          id?: string
          minutos_fala?: number | null
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      metrics_cloudflare: {
        Row: {
          created_at: string
          custo_estimado: number | null
          data: string
          empresa_id: string | null
          erros_4xx: number | null
          erros_5xx: number | null
          id: string
          plano: string | null
          requests_dia: number | null
          tempo_execucao_ms: number | null
          trafego_rota: Json | null
          updated_at: string
          workers_executados: number | null
        }
        Insert: {
          created_at?: string
          custo_estimado?: number | null
          data?: string
          empresa_id?: string | null
          erros_4xx?: number | null
          erros_5xx?: number | null
          id?: string
          plano?: string | null
          requests_dia?: number | null
          tempo_execucao_ms?: number | null
          trafego_rota?: Json | null
          updated_at?: string
          workers_executados?: number | null
        }
        Update: {
          created_at?: string
          custo_estimado?: number | null
          data?: string
          empresa_id?: string | null
          erros_4xx?: number | null
          erros_5xx?: number | null
          id?: string
          plano?: string | null
          requests_dia?: number | null
          tempo_execucao_ms?: number | null
          trafego_rota?: Json | null
          updated_at?: string
          workers_executados?: number | null
        }
        Relationships: []
      }
      metrics_openai: {
        Row: {
          created_at: string
          custo_estimado: number | null
          data: string
          empresa_id: string | null
          id: string
          modelo: string | null
          tokens_input: number
          tokens_output: number
          tokens_total: number | null
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          custo_estimado?: number | null
          data?: string
          empresa_id?: string | null
          id?: string
          modelo?: string | null
          tokens_input?: number
          tokens_output?: number
          tokens_total?: number | null
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          custo_estimado?: number | null
          data?: string
          empresa_id?: string | null
          id?: string
          modelo?: string | null
          tokens_input?: number
          tokens_output?: number
          tokens_total?: number | null
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      metrics_render: {
        Row: {
          chamadas_dia: number | null
          cpu_percent: number | null
          created_at: string
          custo_mensal: number | null
          data: string
          erros_4xx: number | null
          erros_500: number | null
          id: string
          instancia_tipo: string | null
          logs_erro: Json | null
          ram_percent: number | null
          status: string | null
          tempo_resposta_ms: number | null
          updated_at: string
        }
        Insert: {
          chamadas_dia?: number | null
          cpu_percent?: number | null
          created_at?: string
          custo_mensal?: number | null
          data?: string
          erros_4xx?: number | null
          erros_500?: number | null
          id?: string
          instancia_tipo?: string | null
          logs_erro?: Json | null
          ram_percent?: number | null
          status?: string | null
          tempo_resposta_ms?: number | null
          updated_at?: string
        }
        Update: {
          chamadas_dia?: number | null
          cpu_percent?: number | null
          created_at?: string
          custo_mensal?: number | null
          data?: string
          erros_4xx?: number | null
          erros_500?: number | null
          id?: string
          instancia_tipo?: string | null
          logs_erro?: Json | null
          ram_percent?: number | null
          status?: string | null
          tempo_resposta_ms?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      metrics_supabase: {
        Row: {
          conexoes_abertas: number | null
          consultas_lentas: number | null
          consumo_tabela: Json | null
          created_at: string
          custo_estimado: number | null
          data: string
          escritas_segundo: number | null
          id: string
          leituras_segundo: number | null
          storage_limite_mb: number | null
          storage_usado_mb: number | null
          tamanho_banco_mb: number | null
          taxa_erros: number | null
          updated_at: string
        }
        Insert: {
          conexoes_abertas?: number | null
          consultas_lentas?: number | null
          consumo_tabela?: Json | null
          created_at?: string
          custo_estimado?: number | null
          data?: string
          escritas_segundo?: number | null
          id?: string
          leituras_segundo?: number | null
          storage_limite_mb?: number | null
          storage_usado_mb?: number | null
          tamanho_banco_mb?: number | null
          taxa_erros?: number | null
          updated_at?: string
        }
        Update: {
          conexoes_abertas?: number | null
          consultas_lentas?: number | null
          consumo_tabela?: Json | null
          created_at?: string
          custo_estimado?: number | null
          data?: string
          escritas_segundo?: number | null
          id?: string
          leituras_segundo?: number | null
          storage_limite_mb?: number | null
          storage_usado_mb?: number | null
          tamanho_banco_mb?: number | null
          taxa_erros?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          id: string
          lida: boolean | null
          mensagem: string
          origem: string
          tipo: string
          titulo: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          lida?: boolean | null
          mensagem: string
          origem: string
          tipo: string
          titulo: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          lida?: boolean | null
          mensagem?: string
          origem?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_configs: {
        Row: {
          annual_price: string | null
          created_at: string
          custom_cta_action: string | null
          custom_cta_text: string | null
          description: string | null
          discount_percentage: number | null
          features: string[] | null
          gradient_end: string | null
          gradient_start: string | null
          id: string
          is_popular: boolean | null
          lia_quote: string | null
          max_channels: string | null
          max_conversations: string | null
          max_messages: string | null
          plan_name: string
          price: string | null
          updated_at: string
        }
        Insert: {
          annual_price?: string | null
          created_at?: string
          custom_cta_action?: string | null
          custom_cta_text?: string | null
          description?: string | null
          discount_percentage?: number | null
          features?: string[] | null
          gradient_end?: string | null
          gradient_start?: string | null
          id?: string
          is_popular?: boolean | null
          lia_quote?: string | null
          max_channels?: string | null
          max_conversations?: string | null
          max_messages?: string | null
          plan_name: string
          price?: string | null
          updated_at?: string
        }
        Update: {
          annual_price?: string | null
          created_at?: string
          custom_cta_action?: string | null
          custom_cta_text?: string | null
          description?: string | null
          discount_percentage?: number | null
          features?: string[] | null
          gradient_end?: string | null
          gradient_start?: string | null
          id?: string
          is_popular?: boolean | null
          lia_quote?: string | null
          max_channels?: string | null
          max_conversations?: string | null
          max_messages?: string | null
          plan_name?: string
          price?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      planos: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          plano_nome: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          plano_nome: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          plano_nome?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      processos: {
        Row: {
          cliente_id: string
          created_at: string | null
          etapa_atual: number | null
          id: string
          observacoes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          etapa_atual?: number | null
          id?: string
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          etapa_atual?: number | null
          id?: string
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string | null
          full_name: string | null
          id: string
          plan_type: string | null
          updated_at: string | null
          whatsapp_connected_at: string | null
          whatsapp_numero: string | null
          whatsapp_qr_code: string | null
          whatsapp_status: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          plan_type?: string | null
          updated_at?: string | null
          whatsapp_connected_at?: string | null
          whatsapp_numero?: string | null
          whatsapp_qr_code?: string | null
          whatsapp_status?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          plan_type?: string | null
          updated_at?: string | null
          whatsapp_connected_at?: string | null
          whatsapp_numero?: string | null
          whatsapp_qr_code?: string | null
          whatsapp_status?: string | null
        }
        Relationships: []
      }
      site_content: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          section_key: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          section_key: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          section_key?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      site_content_versions: {
        Row: {
          content: Json
          content_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          version_number: number
        }
        Insert: {
          content: Json
          content_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          version_number: number
        }
        Update: {
          content?: Json
          content_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_content_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "site_content"
            referencedColumns: ["id"]
          },
        ]
      }
      site_theme: {
        Row: {
          colors: Json
          created_at: string | null
          fonts: Json
          id: string
          is_active: boolean | null
          spacing: Json
          theme_name: string
          updated_at: string | null
        }
        Insert: {
          colors: Json
          created_at?: string | null
          fonts: Json
          id?: string
          is_active?: boolean | null
          spacing: Json
          theme_name: string
          updated_at?: string | null
        }
        Update: {
          colors?: Json
          created_at?: string | null
          fonts?: Json
          id?: string
          is_active?: boolean | null
          spacing?: Json
          theme_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_errors: {
        Row: {
          component: string | null
          created_at: string | null
          id: string
          message: string
          resolved: boolean | null
          resolved_at: string | null
          severity: string
          stack_trace: string | null
        }
        Insert: {
          component?: string | null
          created_at?: string | null
          id?: string
          message: string
          resolved?: boolean | null
          resolved_at?: string | null
          severity: string
          stack_trace?: string | null
        }
        Update: {
          component?: string | null
          created_at?: string | null
          id?: string
          message?: string
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string
          stack_trace?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string | null
          id: string
          level: string
          message: string
          metadata: Json | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level: string
          message: string
          metadata?: Json | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          type?: string
        }
        Relationships: []
      }
      usage_limits: {
        Row: {
          agendamentos_count: number
          conversas_count: number
          created_at: string
          id: string
          mensagens_count: number
          periodo_mes: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agendamentos_count?: number
          conversas_count?: number
          created_at?: string
          id?: string
          mensagens_count?: number
          periodo_mes?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agendamentos_count?: number
          conversas_count?: number
          created_at?: string
          id?: string
          mensagens_count?: number
          periodo_mes?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          created_at: string
          direction: string
          id: string
          message_content: string
          phone_number: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          id?: string
          message_content: string
          phone_number: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          message_content?: string
          phone_number?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      provider_metrics: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          provider: string
          date: string
          empresa_id: string | null
          usuario_id: string | null
          tokens_input: number | null
          tokens_output: number | null
          requests: number | null
          reads: number | null
          writes: number | null
          storage_mb: number | null
          cost: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          provider: string
          date?: string
          empresa_id?: string | null
          usuario_id?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          requests?: number | null
          reads?: number | null
          writes?: number | null
          storage_mb?: number | null
          cost?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          provider?: string
          date?: string
          empresa_id?: string | null
          usuario_id?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          requests?: number | null
          reads?: number | null
          writes?: number | null
          storage_mb?: number | null
          cost?: number | null
        }
        Relationships: []
      }
      provider_status: {
        Row: {
          id: string
          created_at: string
          provider: string
          online: boolean
          latency_ms: number | null
          last_check: string
          error_message: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          provider: string
          online: boolean
          latency_ms?: number | null
          last_check?: string
          error_message?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          provider?: string
          online?: boolean
          latency_ms?: number | null
          last_check?: string
          error_message?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage_limit: {
        Args: { p_type: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "cliente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "cliente"],
    },
  },
} as const
