// ======================================================================
// 🛠️ TOOLS CONFIGURATION - Centralized Tool Definitions
// ======================================================================

export const GPT3_MINI_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "sendQuickMessage",
            "description": "Envia uma mensagem curta e direta ao usuário ou contato salvo.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "recipient": { "type": "string", "description": "Nome ou identificador do destinatário." },
                    "message": { "type": "string", "description": "Conteúdo da mensagem." }
                },
                "required": ["recipient", "message"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "createQuickNote",
            "description": "Cria uma nota rápida.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "content": { "type": "string", "description": "Conteúdo da nota." },
                    "category": { "type": "string", "description": "Categoria da nota (opcional)." }
                },
                "required": ["content"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "getDailySummary",
            "description": "Retorna um resumo do dia.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "translateTextLight",
            "description": "Traduz texto curto.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "text": { "type": "string", "description": "Texto a traduzir." },
                    "targetLanguage": { "type": "string", "description": "Idioma de destino." }
                },
                "required": ["text", "targetLanguage"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "lightSearchMemory",
            "description": "Busca rápida na memória/histórico.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "query": { "type": "string", "description": "Termo de busca." }
                },
                "required": ["query"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generateSimpleResponse",
            "description": "Gera resposta simples.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "question": { "type": "string", "description": "Pergunta." }
                },
                "required": ["question"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "convertShortAudioToText",
            "description": "Converte áudio curto em texto.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "audioUrl": { "type": "string", "description": "URL do áudio." }
                },
                "required": ["audioUrl"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "summarizeNote",
            "description": "Resume uma nota.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "text": { "type": "string", "description": "Texto da nota." }
                },
                "required": ["text"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "validateSimpleInput",
            "description": "Valida entrada simples.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "inputText": { "type": "string", "description": "Texto de entrada." }
                },
                "required": ["inputText"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "extractKeyTerms",
            "description": "Extrai termos-chave de um texto.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "text": { "type": "string", "description": "Texto para análise." }
                },
                "required": ["text"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "checkTaskCompletion",
            "description": "Verifica conclusão de tarefa.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "taskDescription": { "type": "string", "description": "Descrição da tarefa." }
                },
                "required": ["taskDescription"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "listNextSteps",
            "description": "Lista próximos passos.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "activity": { "type": "string", "description": "Atividade." }
                },
                "required": ["activity"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "detectEmotionInText",
            "description": "Detecta emoção em texto.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "text": { "type": "string", "description": "Texto para análise." }
                },
                "required": ["text"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "summarizeAndTagText",
            "description": "Resume e adiciona tags ao texto.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "content": { "type": "string", "description": "Conteúdo." },
                    "audience": { "type": "string", "description": "Audiência." }
                },
                "required": ["content", "audience"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "lightEmailAssistant",
            "description": "Assistente de email rápido.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "emailContent": { "type": "string", "description": "Conteúdo do email." },
                    "desiredTone": { "type": "string", "description": "Tom desejado." }
                },
                "required": ["emailContent", "desiredTone"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generateAndRefineContent",
            "description": "Gera e refina conteúdo.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "theme": { "type": "string", "description": "Tema." },
                    "tone": { "type": "string", "description": "Tom." }
                },
                "required": ["theme", "tone"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "summarizeAndExtractPoints",
            "description": "Resume e extrai pontos principais.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "content": { "type": "string", "description": "Conteúdo." }
                },
                "required": ["content"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "quickEmailHelper",
            "description": "Ajuda rápida com email.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "emailDraft": { "type": "string", "description": "Rascunho do email." },
                    "tone": { "type": "string", "description": "Tom." }
                },
                "required": ["emailDraft"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "lightTaskAndNoteManager",
            "description": "Gerenciador leve de tarefas e notas.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "note": { "type": "string", "description": "Nota." },
                    "context": { "type": "string", "description": "Contexto." }
                },
                "required": ["note"],
                "additionalProperties": false
            }
        }
    }
];

export const GPT4O_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "buscar_na_web",
            "description": "Realiza busca avançada na web.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "query": { "type": "string", "description": "Termo de busca." }
                },
                "required": ["query"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "gerar_imagem",
            "description": "Gera imagem usando DALL-E.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "prompt": { "type": "string", "description": "Descrição da imagem." }
                },
                "required": ["prompt"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "falar_com_voz",
            "description": "Converte texto em áudio (TTS).",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "text": { "type": "string", "description": "Texto para converter." }
                },
                "required": ["text"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obter_hora_local",
            "description": "Obtém hora local de um timezone.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "timezone": { "type": "string", "description": "Timezone (ex: Europe/Lisbon)." }
                },
                "required": [],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "resumir_arquivo",
            "description": "Resume conteúdo de um arquivo.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "fileUrl": { "type": "string", "description": "URL do arquivo." }
                },
                "required": ["fileUrl"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "traduzir_arquivo",
            "description": "Traduz arquivo.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "fileUrl": { "type": "string", "description": "URL do arquivo." },
                    "targetLanguage": { "type": "string", "description": "Idioma alvo." }
                },
                "required": ["fileUrl", "targetLanguage"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "interpretar_sentimento",
            "description": "Interpreta sentimento de texto.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "text": { "type": "string", "description": "Texto para análise." }
                },
                "required": ["text"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "criar_relatorio",
            "description": "Cria relatório ou documento.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "title": { "type": "string", "description": "Título." },
                    "content": { "type": "string", "description": "Conteúdo." },
                    "format": { "type": "string", "description": "Formato (pdf, docx, markdown)." }
                },
                "required": ["title", "content"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "criar_componente",
            "description": "Cria componente de código.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "componentType": { "type": "string", "description": "Tipo do componente." }
                },
                "required": ["componentType"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "editar_componente",
            "description": "Edita componente existente.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "componentId": { "type": "string", "description": "ID do componente." }
                },
                "required": ["componentId"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "criar_automacao",
            "description": "Cria automação.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "name": { "type": "string", "description": "Nome da automação." },
                    "steps": { "type": "array", "items": { "type": "string" }, "description": "Passos da automação." }
                },
                "required": ["name", "steps"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "criar_api",
            "description": "Cria API REST.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "method": { "type": "string", "description": "Método HTTP." },
                    "route": { "type": "string", "description": "Rota." }
                },
                "required": ["method", "route"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "criar_painel_cliente",
            "description": "Cria painel para cliente.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "clientId": { "type": "string", "description": "ID do cliente." }
                },
                "required": ["clientId"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "integrar_ferramenta",
            "description": "Integra ferramenta externa.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "toolName": { "type": "string", "description": "Nome da ferramenta." }
                },
                "required": ["toolName"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "criar_api_personalizada",
            "description": "Cria API personalizada.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "apiName": { "type": "string", "description": "Nome da API." },
                    "endpoints": { "type": "array", "items": { "type": "string" }, "description": "Endpoints." }
                },
                "required": ["apiName", "endpoints"],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "resposta_personalizada",
            "description": "Gera resposta personalizada.",
            "strict": false,
            "parameters": {
                "type": "object",
                "properties": {
                    "context": { "type": "string", "description": "Contexto." },
                    "tone": { "type": "string", "description": "Tom." }
                },
                "required": ["context", "tone"],
                "additionalProperties": false
            }
        }
    }
];

// Combine all tools
export const ALL_TOOLS = [
    ...GPT3_MINI_TOOLS,
    ...GPT4O_TOOLS
];
