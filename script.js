document.addEventListener('DOMContentLoaded', function() {
    // ===== CONFIGURAÇÃO DE IDIOMAS =====
    // Idioma padrão inicial
    let IDIOMA_ORIGEM = 'pt-BR';    // Código do idioma de origem (reconhecimento de voz)
    const IDIOMA_DESTINO = 'en';    // Código do idioma de destino (tradução)
    const IDIOMA_FALA = 'en-US';    // Código do idioma para leitura em voz alta
    
    // Mapeamento de idiomas para bandeiras
    const BANDEIRAS_IDIOMAS = {
        'pt-BR': '🇧🇷',     // Português Brasileiro
        'pt-PT': '🇵🇹',     // Português de Portugal
        'en': '🇺🇸',        // Inglês (EUA)
        'en-GB': '🇬🇧',     // Inglês Britânico
        'es': '🇪🇸',        // Espanhol
        'fr': '🇫🇷',        // Francês
        'de': '🇩🇪',        // Alemão
        'it': '🇮🇹',        // Italiano
        'ja': '🇯🇵',        // Japonês
        'zh-CN': '🇨🇳',     // Chinês Simplificado
        'ru': '🇷🇺',        // Russo
        'ar': '🇸🇦',        // Árabe
        'hi': '🇮🇳',        // Hindi
        'ko': '🇰🇷'         // Coreano
    };
    
    // Nomes dos idiomas para exibição
    const NOMES_IDIOMAS = {
        'pt-BR': 'Português',
        'en': 'Inglês',
        'es': 'Espanhol',
        'fr': 'Francês',
        'de': 'Alemão',
        'it': 'Italiano',
        'ja': 'Japonês',
        'zh-CN': 'Chinês',
        'ru': 'Russo',
        'ar': 'Árabe',
        'hi': 'Hindi',
        'ko': 'Coreano'
    };
    
    // Textos exibidos na interface
    const TEXTOS_INTERFACE = {
        pt: {
            titulo_traducao: "Tradução",
            toque_para_comecar: "Toque no microfone para começar",
            ouvindo: "Ouvindo...",
            traduzindo: "Traduzindo...",
            permissao_microfone: "Permissão do microfone necessária. Recarregue a página e autorize o microfone.",
            erro_acesso_microfone: "Erro ao acessar o microfone",
            erro_traducao: "Erro na tradução. Tente novamente.",
            gravando: "Gravando"
        },
        en: {
            titulo_traducao: "Translation",
            toque_para_comecar: "Tap the microphone to start",
            ouvindo: "Listening...",
            traduzindo: "Translating...",
            permissao_microfone: "Microphone permission required. Reload the page and authorize the microphone.",
            erro_acesso_microfone: "Error accessing microphone",
            erro_traducao: "Translation error. Try again.",
            gravando: "Recording"
        },
        es: {
            titulo_traducao: "Traducción",
            toque_para_comecar: "Toca el micrófono para comenzar",
            ouvindo: "Escuchando...",
            traduzindo: "Traduciendo...",
            permissao_microfone: "Permiso de micrófono necesario. Recargue la página y autorice el micrófono.",
            erro_acesso_microfone: "Error al acceder al micrófono",
            erro_traducao: "Error de traducción. Inténtalo de nuevo.",
            gravando: "Grabando"
        }
    };
    
    // Determinar o idioma da interface com base no idioma de destino
    const IDIOMA_INTERFACE = IDIOMA_DESTINO in TEXTOS_INTERFACE ? IDIOMA_DESTINO : 'en';
    const TEXTOS = TEXTOS_INTERFACE[IDIOMA_INTERFACE];
    
    // ===== ELEMENTOS DOM =====
    const recordButton = document.getElementById('recordButton');
    const translatedText = document.getElementById('translatedText');
    const recordingModal = document.getElementById('recordingModal');
    const recordingTimer = document.getElementById('recordingTimer');
    const recordingText = document.querySelector('.recording-text');
    const sendButton = document.getElementById('sendButton');
    const speakerButton = document.getElementById('speakerButton');
    const titleTraducao = document.querySelector('.text-title');
    const currentLanguageFlag = document.getElementById('currentLanguageFlag');
    const worldButton = document.getElementById('worldButton');
    const languageDropdown = document.getElementById('languageDropdown');
    const languageOptions = document.querySelectorAll('.language-option');
    
    // Configurar a bandeira do idioma de origem
    currentLanguageFlag.textContent = BANDEIRAS_IDIOMAS[IDIOMA_ORIGEM] || '🎤';
    
    // Atualizar textos da interface
    titleTraducao.querySelector('span').textContent = TEXTOS.titulo_traducao;
    translatedText.textContent = TEXTOS.toque_para_comecar;
    recordingText.textContent = TEXTOS.gravando;
    
    // ENDPOINT da API de tradução
    const TRANSLATE_ENDPOINT = 'https://chat-tradutor.onrender.com/translate';
    
    // Verificar se o navegador suporta reconhecimento de voz e síntese de voz
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const SpeechSynthesis = window.speechSynthesis;
    
    if (!SpeechRecognition) {
        translatedText.textContent = "Navegador não compatível com reconhecimento de voz.";
        recordButton.style.display = 'none';
        return;
    }
    
    if (!SpeechSynthesis) {
        speakerButton.style.display = 'none';
    }
    
    let recognition = new SpeechRecognition();
    recognition.lang = IDIOMA_ORIGEM;
    recognition.continuous = true;
    recognition.interimResults = true;
    
    // Variáveis de estado
    let isRecording = false;
    let recordingStartTime = 0;
    let timerInterval = null;
    let pressTimer;
    let tapMode = false; // false = modo pressionar, true = modo toque
    let isSpeechPlaying = false;
    
    // ===== FUNÇÕES DE SELEÇÃO DE IDIOMA =====
    
    // Alternar a exibição do dropdown de idiomas
    worldButton.addEventListener('click', function(e) {
        e.stopPropagation();
        languageDropdown.classList.toggle('show');
    });
    
    // Fechar dropdown ao clicar fora dele
    document.addEventListener('click', function(e) {
        if (!languageDropdown.contains(e.target) && e.target !== worldButton) {
            languageDropdown.classList.remove('show');
        }
    });
    
    // Selecionar um novo idioma
    languageOptions.forEach(option => {
        option.addEventListener('click', function() {
            const novoIdioma = this.getAttribute('data-lang');
            alterarIdiomaOrigem(novoIdioma);
            languageDropdown.classList.remove('show');
        });
    });
    
    // Função para alterar o idioma de origem
    function alterarIdiomaOrigem(novoIdioma) {
        IDIOMA_ORIGEM = novoIdioma;
        
        // Atualizar a bandeira exibida
        currentLanguageFlag.textContent = BANDEIRAS_IDIOMAS[IDIOMA_ORIGEM] || '🎤';
        
        // Reiniciar o reconhecimento de voz com o novo idioma
        recognition.stop();
        recognition = new SpeechRecognition();
        recognition.lang = IDIOMA_ORIGEM;
        recognition.continuous = true;
        recognition.interimResults = true;
        
        // Reconfigurar eventos
        reconfigurarEventosReconhecimento();
        
        // Feedback visual
        translatedText.textContent = `Idioma alterado para ${NOMES_IDIOMAS[IDIOMA_ORIGEM] || IDIOMA_ORIGEM}`;
        setTimeout(() => {
            translatedText.textContent = TEXTOS.toque_para_comecar;
        }, 2000);
    }
    
    // Reconfigurar eventos do reconhecimento de voz
    function reconfigurarEventosReconhecimento() {
        recognition.onresult = onRecognitionResult;
        recognition.onerror = onRecognitionError;
        recognition.onend = onRecognitionEnd;
    }
    
    // ===== FUNÇÕES PRINCIPAIS =====
    
    // Solicitar permissão do microfone automaticamente
    requestMicrophonePermission();
    
    // Eventos para o botão de áudio
    speakerButton.addEventListener('click', toggleSpeech);
    
    async function requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Parar as tracks imediatamente após obter a permissão
            stream.getTracks().forEach(track => track.stop());
            
            recordButton.disabled = false;
            translatedText.textContent = TEXTOS.toque_para_comecar;
        } catch (error) {
            console.error('Erro ao acessar o microfone:', error);
            translatedText.textContent = TEXTOS.permissao_microfone;
            recordButton.disabled = true;
        }
    }
    
    // Função de tradução usando sua API
    async function translateText(text, targetLang = IDIOMA_DESTINO) {
        try {
            translatedText.textContent = TEXTOS.traduzindo;
            const response = await fetch(TRANSLATE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, targetLang })
            });

            const result = await response.json();
            
            // Habilitar o botão de áudio após a tradução
            if (SpeechSynthesis) {
                speakerButton.disabled = false;
            }
            
            return result.translatedText || text;
        } catch (error) {
            console.error('Erro na tradução:', error);
            return TEXTOS.erro_traducao;
        }
    }
    
    // Função para ler o texto em voz alta
    function speakText(text) {
        if (!SpeechSynthesis) return;
        
        // Parar qualquer fala anterior
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = IDIOMA_FALA;
        utterance.rate = 0.9; // Velocidade um pouco mais lenta
        
        utterance.onstart = function() {
            isSpeechPlaying = true;
            speakerButton.textContent = '⏹';
        };
        
        utterance.onend = function() {
            isSpeechPlaying = false;
            speakerButton.textContent = '🔊';
        };
        
        utterance.onerror = function() {
            isSpeechPlaying = false;
            speakerButton.textContent = '🔊';
        };
        
        window.speechSynthesis.speak(utterance);
    }
    
    // Alternar entre reproduzir e parar a fala
    function toggleSpeech() {
        if (!SpeechSynthesis) return;
        
        if (isSpeechPlaying) {
            window.speechSynthesis.cancel();
            isSpeechPlaying = false;
            speakerButton.textContent = '🔊';
        } else {
            const textToSpeak = translatedText.textContent;
            if (textToSpeak && textToSpeak !== TEXTOS.toque_para_comecar && 
                textToSpeak !== TEXTOS.traduzindo && !textToSpeak.startsWith("Erro")) {
                speakText(textToSpeak);
            }
        }
    }
    
    // Eventos de toque para o botão de gravação
    recordButton.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (recordButton.disabled) return;
        
        // Se não está gravando, inicia a gravação após um breve delay
        if (!isRecording) {
            pressTimer = setTimeout(function() {
                tapMode = false; // Modo pressionar
                startRecording();
            }, 300);
        }
    });
    
    recordButton.addEventListener('touchend', function(e) {
        e.preventDefault();
        clearTimeout(pressTimer);
        
        if (isRecording) {
            if (tapMode) {
                // No modo toque, um segundo toque para a gravação
                stopRecording();
            } else {
                // No modo pressionar, soltar o botão para a gravação
                stopRecording();
            }
        } else {
            // Toque rápido - ativa o modo toque
            tapMode = true;
            startRecording();
            showRecordingModal();
        }
    });
    
    // Evento para o botão de enviar no modal
    sendButton.addEventListener('click', stopRecording);
    
    // Prevenir scroll durante o toque no botão
    recordButton.addEventListener('touchstart', function(e) {
        e.preventDefault();
    }, { passive: false });
    
    function startRecording() {
        try {
            recognition.start();
            isRecording = true;
            recordButton.classList.add('recording');
            recordingStartTime = Date.now();
            
            // Iniciar temporizador
            updateTimer();
            timerInterval = setInterval(updateTimer, 1000);
            
            translatedText.textContent = TEXTOS.ouvindo;
            
            // Desabilitar o botão de áudio durante a gravação
            speakerButton.disabled = true;
        } catch (error) {
            console.error('Erro ao iniciar gravação:', error);
            translatedText.textContent = TEXTOS.erro_acesso_microfone;
        }
    }
    
    function stopRecording() {
        if (!isRecording) return;
        
        recognition.stop();
        isRecording = false;
        recordButton.classList.remove('recording');
        clearInterval(timerInterval);
        
        // Esconder modal se estiver visível
        hideRecordingModal();
    }
    
    // Funções de callback do reconhecimento de voz
    function onRecognitionResult(event) {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
        }
        
        if (finalTranscript) {
            // Não mostrar o texto original, apenas processar a tradução
            translatedText.textContent = TEXTOS.traduzindo;
            
            // Usar sua API para traduzir o texto
            translateText(finalTranscript, IDIOMA_DESTINO).then(translation => {
                translatedText.textContent = translation;
                
                // Reproduzir automaticamente a tradução em voz alta
                if (SpeechSynthesis && translation && !translation.startsWith("Erro")) {
                    setTimeout(() => {
                        speakText(translation);
                    }, 500);
                }
            });
        }
    }
    
    function onRecognitionError(event) {
        console.error('Erro no reconhecimento de voz:', event.error);
        
        // Se for erro de "no-speech", apenas ignore
        if (event.error !== 'no-speech') {
            translatedText.textContent = "Erro: " + event.error;
        }
        
        stopRecording();
    }
    
    function onRecognitionEnd() {
        stopRecording();
    }
    
    // Configurar eventos do reconhecimento de voz
    reconfigurarEventosReconhecimento();
    
    function showRecordingModal() {
        recordingModal.classList.add('visible');
    }
    
    function hideRecordingModal() {
        recordingModal.classList.remove('visible');
    }
    
    function updateTimer() {
        const elapsedSeconds = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        recordingTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
});
