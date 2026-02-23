import './style.css';

export class LiaWidget {
    private workspaceId: string | null = null;
    private enableVoice: boolean = false;
    private container: HTMLElement;
    private chatWindow: HTMLElement;
    private chatContent: HTMLElement;
    private chatInput: HTMLInputElement;
    private chatButton: HTMLElement;

    constructor() {
        this.extractConfig();
        this.container = document.createElement('div');
        this.container.id = 'lia-widget-container';
        this.chatWindow = this.createChatWindow();
        this.chatInput = this.chatWindow.querySelector('#lia-chat-input') as HTMLInputElement;
        this.chatContent = this.chatWindow.querySelector('.lia-chat-content') as HTMLElement;
        this.chatButton = this.createChatButton();
        this.render();
    }

    private extractConfig() {
        const scripts = document.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i];
            if (script.src.includes('widget.js') || script.hasAttribute('data-workspace-id')) {
                this.workspaceId = script.getAttribute('data-workspace-id');
                this.enableVoice = script.getAttribute('data-enable-voice') === 'true';
                break;
            }
        }
    }

    private createChatWindow(): HTMLElement {
        const el = document.createElement('div');
        el.id = 'lia-chat-window';
        el.className = 'lia-hidden';

        // Header
        const header = document.createElement('div');
        header.className = 'lia-chat-header';
        header.innerHTML = `
      <div class="lia-header-info">
        <div class="lia-avatar">LIA</div>
        <div class="lia-title">
          <span>Suporte LIA</span>
          <span class="lia-status">Online agora</span>
        </div>
      </div>
      <button class="lia-close-btn">&times;</button>
    `;

        header.querySelector('.lia-close-btn')?.addEventListener('click', () => this.toggleChat());

        // Content
        const content = document.createElement('div');
        content.className = 'lia-chat-content';

        // Initial message
        const initialMsg = document.createElement('div');
        initialMsg.className = 'lia-message lia-received';
        initialMsg.textContent = 'Olá! Pronto para transformar seu atendimento?';
        content.appendChild(initialMsg);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'lia-chat-footer';

        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'lia-chat-input';
        input.placeholder = 'Digite...';
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        const sendBtnContainer = document.createElement('div');
        sendBtnContainer.className = 'lia-chat-actions';

        if (this.enableVoice) {
            const micBtn = document.createElement('button');
            micBtn.className = 'lia-action-btn lia-mic-btn';
            micBtn.innerHTML = '🎤'; // Replace with SVG later
            sendBtnContainer.appendChild(micBtn);
        }

        const sendBtn = document.createElement('button');
        sendBtn.className = 'lia-action-btn lia-send-btn';
        sendBtn.innerHTML = '➤'; // Replace with SVG later
        sendBtn.addEventListener('click', () => this.sendMessage());
        sendBtnContainer.appendChild(sendBtn);

        footer.appendChild(input);
        footer.appendChild(sendBtnContainer);

        el.appendChild(header);
        el.appendChild(content);
        el.appendChild(footer);

        return el;
    }

    private createChatButton(): HTMLElement {
        const btn = document.createElement('div');
        btn.id = 'lia-chat-button';
        btn.innerHTML = '💬'; // Replace with SVG later
        btn.addEventListener('click', () => this.toggleChat());
        return btn;
    }

    private toggleChat() {
        this.chatWindow.classList.toggle('lia-hidden');
    }

    private async sendMessage() {
        const text = this.chatInput.value.trim();
        if (!text) return;

        this.chatInput.value = '';

        // Append user message
        const msgEl = document.createElement('div');
        msgEl.className = 'lia-message lia-sent';
        msgEl.textContent = text;
        this.chatContent.appendChild(msgEl);
        this.chatContent.scrollTop = this.chatContent.scrollHeight;

        if (!this.workspaceId) {
            this.appendReceivedMessage('Erro: Workspace ID não configurado no script.');
            return;
        }

        try {
            this.appendTypingIndicator();

            const apiUrl = 'https://lia-chat-api.onrender.com';
            const response = await fetch(`${apiUrl}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    liaMode: 'NORMAL',
                    userId: 'widget-user', // TBD: generate or read persistent sessionId
                    conversationId: this.workspaceId // Usar workspaceId como thread base por enquanto
                }),
            });

            this.removeTypingIndicator();

            if (!response.ok) {
                throw new Error('API Error');
            }

            const data = await response.json();

            if (data.response || data.reply || data.text) {
                this.appendReceivedMessage(data.response || data.reply || data.text);
            } else {
                this.appendReceivedMessage('Desculpe, não consegui entender.');
            }

        } catch (e) {
            this.removeTypingIndicator();
            this.appendReceivedMessage('Ocorreu um erro ao enviar sua mensagem. Tente novamente mais tarde.');
        }
    }

    private appendTypingIndicator() {
        const msgEl = document.createElement('div');
        msgEl.className = 'lia-message lia-received lia-typing';
        msgEl.textContent = 'Digitando...';
        msgEl.id = 'lia-typing-indicator';
        this.chatContent.appendChild(msgEl);
        this.chatContent.scrollTop = this.chatContent.scrollHeight;
    }

    private removeTypingIndicator() {
        const el = this.chatContent.querySelector('#lia-typing-indicator');
        if (el) el.remove();
    }

    private appendReceivedMessage(text: string) {
        const msgEl = document.createElement('div');
        msgEl.className = 'lia-message lia-received';
        msgEl.textContent = text;
        this.chatContent.appendChild(msgEl);
        this.chatContent.scrollTop = this.chatContent.scrollHeight;
    }

    private render() {
        this.container.appendChild(this.chatWindow);
        this.container.appendChild(this.chatButton);
        document.body.appendChild(this.container);
    }
}
