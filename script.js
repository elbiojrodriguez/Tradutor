document.addEventListener('DOMContentLoaded', function() {
    // Elementos DOM
    const recordButton = document.getElementById('recordButton');
    const instructionText = document.getElementById('instructionText');
    const originalText = document.getElementById('originalText');
    const translatedText = document.getElementById('translatedText');
    const recordingModal = document.getElementById('recordingModal');
    const recordingTimer = document.getElementById('recordingTimer');
    const sendButton = document.getElementById('sendButton');
    const apiStatus = document.getElementById('apiStatus');
    const permissionRequest = document.getElementById('permissionRequest');
    const permissionButton = document.getElementById('permissionButton');
    const speakerButton = document.getElementById('speakerButton');
    const stopSpeechButton = document.getElementById('stopSpeechButton');
    
    // ENDPOINT da API de tradução
    const TRANSLATE_ENDPOINT = 'https://chat-tradutor.onrender.com/translate';
    
    // Verificar se o navegador suporta reconhecimento de voz e síntese de voz
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const SpeechSynthesis = window.speechSynthesis;
    
    if (!SpeechRecognition) {
        originalText.textContent = "Seu navegador não suporta reconhecimento de voz. Tente usar Chrome ou Edge.";
        recordButton.style.display = 'none';
        apiStatus.textContent = "Navegador não compatível com reconhecimento de voz";
        permissionRequest.style.display = 'none';
        return;
    }
    
    if (!SpeechSynthesis) {
        speakerButton.style.display = 'none';
        apiStatus.textContent += " | Navegador não compatível com leitura de texto";
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    
    // Variáveis de estado
    let isRecording = false;
    let recordingStartTime = 0;
    let timerInterval = null;
    let pressTimer;
    let microphonePermissionGranted = false;
    let tapMode = false; // false = modo pressionar, true = modo toque
    let isSpeechPlaying = false;
    
    // Solicitar permissão do microfone
    permissionButton.addEventListener('click', requestMicrophonePermission);
    
    // Eventos para o botão de áudio
    speakerButton.addEventListener('click', toggleSpeech);
    stopSpeechButton.addEventListener('click', stopSpeech);
    
    async function requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Parar as tracks imediatamente após obter a permissão
            stream.getTracks().forEach(track => track.stop());
            
            microphonePermissionGranted = true;
            permissionRequest.style.display = 'none';
            recordButton.disabled = false;
            originalText.textContent = "Toque e segure o botão para falar";
            apiStatus.textContent = "Permissão concedida. Conectando com a API...";
            
            // Testar a conexão com a API
            testApiConnection();
        } catch (error) {
            console.error('Erro ao acessar o microfone:', error);
            permissionRequest.innerHTML = `
                <p>Permissão do microfone negada. Por favor, permita o acesso ao microfone nas configurações do seu navegador.</p>
                <button class="permission-btn" onclick="window.location.reload()">Tentar novamente</button>
            `;
        }
    }
    
    // Função de tradução usando sua API
    async function translateText(text, targetLang = 'en') {
        try {
            apiStatus.textContent = "Traduzindo...";
            const response = await fetch(TRANSLATE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, targetLang })
            });

            const result = await response.json();
            apiStatus.textContent = "Tradução concluída com sucesso";
            
            // Habilitar o botão de áudio após a tradução
            if (SpeechSynthesis) {
                speakerButton.disabled = false;
            }
            
            return result.translatedText || text;
        } catch (error) {
            console.error('Erro na tradução:', error);
            apiStatus.textContent = "Erro na tradução. Verifique o console para detalhes.";
            return "Erro na tradução. Verifique o console para detalhes.";
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
            speakerButton.classList.add('active');
            speakerButton.textContent = '🔊';
            stopSpeechButton.style.display = 'block';
        };
        
        utterance.onend = function() {
            isSpeechPlaying = false;
            speakerButton.classList.remove('active');
            stopSpeechButton.style.display = 'none';
        };
        
        utterance.onerror = function() {
            isSpeechPlaying = false;
            speakerButton.classList.remove('active');
            stopSpeechButton.style.display = 'none';
            apiStatus.textContent = "Erro na reprodução de áudio";
        };
        
        window.speechSynthesis.speak(utterance);
    }
    
    // Função para parar a fala
    function stopSpeech() {
        if (SpeechSynthesis) {
            window.speechSynthesis.cancel();
            isSpeechPlaying = false;
            speakerButton.classList.remove('active');
            stopSpeechButton.style.display = 'none';
        }
    }
    
    // Alternar entre reproduzir e parar a fala
    function toggleSpeech() {
        if (!SpeechSynthesis) return;
        
        if (isSpeechPlaying) {
            stopSpeech();
        } else {
            const textToSpeak = translatedText.textContent;
            if (textToSpeak && textToSpeak !== "A tradução aparecerá aqui" && 
                textToSpeak !== "Traduzindo..." && !textToSpeak.startsWith("Erro")) {
                speakText(textToSpeak);
            }
        }
    }
    
    // Testar conexão com a API
    async function testApiConnection() {
        try {
            apiStatus.textContent = "Testando conexão com a API...";
            const response = await fetch(TRANSLATE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: "teste", targetLang: 'en' })
            });
            
            if (response.ok) {
                apiStatus.textContent = "Conectado à API de tradução";
            } else {
                apiStatus.textContent = "Erro na conexão com a API";
            }
        } catch (error) {
            console.error('Erro ao conectar com a API:', error);
            apiStatus.textContent = "Erro ao conectar com a API";
        }
    }
    
    // Eventos de toque para o botão de gravação
    recordButton.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (!microphonePermissionGranted) return;
        
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
        clearInterval(timerInterval);
        
        // Esconder modal se estiver visível
        hideRecordingModal();
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
        
        // Si for erro de "no-speech", apenas ignore
        if (event.error !== 'no-speech') {
            originalText.textContent = "Erro: " + event.error;
        }
        
        stopRecording();
    };
    
    recognition.onend = function() {
        stopRecording();
    };
    
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
    
    // Verificar se já temos permissão do microfone
    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            const hasMicrophone = devices.some(device => device.kind === 'audioinput' && device.label !== '');
            if (hasMicrophone) {
                microphonePermissionGranted = true;
                permissionRequest.style.display = 'none';
                recordButton.disabled = false;
                originalText.textContent = "Toque e segure o botão para falar";
                testApiConnection();
            }
        })
        .catch(err => {
            console.error('Erro ao verificar dispositivos:', err);
        });
});
