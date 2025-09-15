document.addEventListener('DOMContentLoaded', function() {
    // Elementos DOM
    const recordButton = document.getElementById('recordButton');
    const originalText = document.getElementById('originalText');
    const translatedText = document.getElementById('translatedText');
    const speakerButton = document.getElementById('speakerButton');
    
    // ENDPOINT da API de tradução
    const TRANSLATE_ENDPOINT = 'https://chat-tradutor.onrender.com/translate';
    
    // Verificar se o navegador suporta reconhecimento de voz e síntese de voz
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const SpeechSynthesis = window.speechSynthesis;
    
    if (!SpeechRecognition) {
        originalText.textContent = "Navegador não compatível com reconhecimento de voz.";
        recordButton.style.display = 'none';
        return;
    }
    
    if (!SpeechSynthesis) {
        speakerButton.style.display = 'none';
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    
    // Variáveis de estado
    let isRecording = false;
    let pressTimer;
    let tapMode = false; // false = modo pressionar, true = modo toque
    let isSpeechPlaying = false;
    
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
            originalText.textContent = "Toque e segure o botão para falar";
        } catch (error) {
            console.error('Erro ao acessar o microfone:', error);
            originalText.textContent = "Permissão do microfone necessária. Recarregue a página e autorize o microfone.";
            recordButton.disabled = true;
        }
    }
    
    // Função de tradução usando sua API
    async function translateText(text, targetLang = 'en') {
        try {
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
            return "Erro na tradução. Tente novamente.";
        }
    }
    
    // Função para ler o texto em voz alta
    function speakText(text) {
        if (!SpeechSynthesis) return;
        
        // Parar qualquer fala anterior
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US'; // Inglês
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
            if (textToSpeak && textToSpeak !== "Tradução aparecerá aqui" && 
                textToSpeak !== "Traduzindo..." && !textToSpeak.startsWith("Erro")) {
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
        }
    });
    
    // Prevenir scroll durante o toque no botão
    recordButton.addEventListener('touchstart', function(e) {
        e.preventDefault();
    }, { passive: false });
    
    function startRecording() {
        try {
            recognition.start();
            isRecording = true;
            recordButton.classList.add('recording');
            
            originalText.textContent = "Ouvindo...";
            translatedText.textContent = "Aguardando para traduzir...";
            
            // Desabilitar o botão de áudio durante a gravação
            speakerButton.disabled = true;
        } catch (error) {
            console.error('Erro ao iniciar gravação:', error);
            originalText.textContent = "Erro ao acessar o microfone";
        }
    }
    
    function stopRecording() {
        if (!isRecording) return;
        
        recognition.stop();
        isRecording = false;
        recordButton.classList.remove('recording');
    }
    
    recognition.onresult = function(event) {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
        }
        
        if (finalTranscript) {
            originalText.textContent = finalTranscript;
            translatedText.textContent = "Traduzindo...";
            
            // Usar sua API para traduzir o texto
            translateText(finalTranscript, 'en').then(translation => {
                translatedText.textContent = translation;
                
                // Reproduzir automaticamente a tradução em voz alta
                if (SpeechSynthesis && translation && !translation.startsWith("Erro")) {
                    setTimeout(() => {
                        speakText(translation);
                    }, 500);
                }
            });
        }
    };
    
    recognition.onerror = function(event) {
        console.error('Erro no reconhecimento de voz:', event.error);
        
        // Se for erro de "no-speech", apenas ignore
        if (event.error !== 'no-speech') {
            originalText.textContent = "Erro: " + event.error;
        }
        
        stopRecording();
    };
    
    recognition.onend = function() {
        stopRecording();
    };
});
