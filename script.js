document.addEventListener('DOMContentLoaded', function() {
    // ===== CONFIGURAÇÃO =====
    let IDIOMA_ORIGEM = 'pt-BR';
    const IDIOMA_DESTINO = 'en';
    const IDIOMA_FALA = 'en-US';
    
    const BANDEIRAS_IDIOMAS = {
        'pt-BR': '🇧🇷', 'en': '🇺🇸', 'es': '🇪🇸', 'fr': '🇫🇷', 
        'de': '🇩🇪', 'it': '🇮🇹', 'ja': '🇯🇵'
    };
    
    // ===== ELEMENTOS DOM =====
    const recordButton = document.getElementById('recordButton');
    const translatedText = document.getElementById('translatedText');
    const recordingModal = document.getElementById('recordingModal');
    const recordingTimer = document.getElementById('recordingTimer');
    const sendButton = document.getElementById('sendButton');
    const speakerButton = document.getElementById('speakerButton');
    const currentLanguageFlag = document.getElementById('currentLanguageFlag');
    const worldButton = document.getElementById('worldButton');
    const languageDropdown = document.getElementById('languageDropdown');
    const languageOptions = document.querySelectorAll('.language-option');
    
    // ===== CONFIGURAÇÃO INICIAL =====
    currentLanguageFlag.textContent = BANDEIRAS_IDIOMAS[IDIOMA_ORIGEM];
    translatedText.textContent = "🎤";
    
    // ===== VERIFICAÇÃO DE SUPORTE =====
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const SpeechSynthesis = window.speechSynthesis;
    
    if (!SpeechRecognition) {
        translatedText.textContent = "❌";
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
    
    // ===== VARIÁVEIS DE ESTADO =====
    let isRecording = false;
    let recordingStartTime = 0;
    let timerInterval = null;
    let pressTimer;
    let tapMode = false;
    let isSpeechPlaying = false;
    let microphonePermissionGranted = false;
    
    // ===== FUNÇÕES DE IDIOMA =====
    worldButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        languageDropdown.classList.toggle('show');
    });
    
    document.addEventListener('click', function(e) {
        if (!languageDropdown.contains(e.target) && e.target !== worldButton) {
            languageDropdown.classList.remove('show');
        }
    });
    
    languageOptions.forEach(option => {
        option.addEventListener('click', function() {
            const novoIdioma = this.getAttribute('data-lang');
            IDIOMA_ORIGEM = novoIdioma;
            currentLanguageFlag.textContent = BANDEIRAS_IDIOMAS[novoIdioma];
            languageDropdown.classList.remove('show');
            
            if (isRecording) recognition.stop();
            
            recognition = new SpeechRecognition();
            recognition.lang = novoIdioma;
            recognition.continuous = true;
            recognition.interimResults = true;
            setupRecognitionEvents();
            
            translatedText.textContent = "✅";
            setTimeout(() => translatedText.textContent = "🎤", 1000);
        });
    });
    
    // ===== FUNÇÕES PRINCIPAIS =====
    function setupRecognitionEvents() {
        recognition.onresult = function(event) {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            
            if (finalTranscript) {
                translatedText.textContent = "⏳";
                translateText(finalTranscript).then(translation => {
                    translatedText.textContent = translation;
                    if (SpeechSynthesis) {
                        setTimeout(() => speakText(translation), 500);
                    }
                });
            }
        };
        
        recognition.onerror = function(event) {
            if (event.error !== 'no-speech') {
                translatedText.textContent = "❌";
            }
            stopRecording();
        };
        
        recognition.onend = stopRecording;
    }
    
    async function requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            microphonePermissionGranted = true;
            recordButton.disabled = false;
            translatedText.textContent = "🎤";
            setupRecognitionEvents();
        } catch (error) {
            translatedText.textContent = "🚫";
            recordButton.disabled = true;
        }
    }
    
    async function translateText(text) {
        try {
            const response = await fetch('https://chat-tradutor.onrender.com/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, targetLang: IDIOMA_DESTINO })
            });
            const result = await response.json();
            speakerButton.disabled = false;
            return result.translatedText || "❌";
        } catch (error) {
            return "❌";
        }
    }
    
    function speakText(text) {
        if (!SpeechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = IDIOMA_FALA;
        utterance.rate = 0.9;
        utterance.onstart = function() {
            isSpeechPlaying = true;
            speakerButton.textContent = '⏹';
        };
        utterance.onend = function() {
            isSpeechPlaying = false;
            speakerButton.textContent = '🔊';
        };
        window.speechSynthesis.speak(utterance);
    }
    
    function toggleSpeech() {
        if (!SpeechSynthesis) return;
        if (isSpeechPlaying) {
            window.speechSynthesis.cancel();
            isSpeechPlaying = false;
            speakerButton.textContent = '🔊';
        } else {
            const textToSpeak = translatedText.textContent;
            if (textToSpeak && textToSpeak !== "🎤" && textToSpeak !== "⏳" && textToSpeak !== "❌") {
                speakText(textToSpeak);
            }
        }
    }
    
    function startRecording() {
        try {
            recognition.start();
            isRecording = true;
            recordButton.classList.add('recording');
            recordingStartTime = Date.now();
            updateTimer();
            timerInterval = setInterval(updateTimer, 1000);
            translatedText.textContent = "🎙️";
            speakerButton.disabled = true;
            speakerButton.textContent = '🔇';
        } catch (error) {
            translatedText.textContent = "❌";
        }
    }
    
    function stopRecording() {
        if (!isRecording) return;
        recognition.stop();
        isRecording = false;
        recordButton.classList.remove('recording');
        clearInterval(timerInterval);
        hideRecordingModal();
        translatedText.textContent = "⏳";
    }
    
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
    
    // ===== EVENTOS =====
    recordButton.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (recordButton.disabled || !microphonePermissionGranted) return;
        if (!isRecording) {
            pressTimer = setTimeout(() => {
                tapMode = false;
                startRecording();
            }, 300);
        }
    });
    
    recordButton.addEventListener('touchend', function(e) {
        e.preventDefault();
        clearTimeout(pressTimer);
        if (isRecording) {
            if (tapMode) {
                stopRecording();
            } else {
                stopRecording();
            }
        } else {
            if (microphonePermissionGranted) {
                tapMode = true;
                startRecording();
                showRecordingModal();
            }
        }
    });
    
    sendButton.addEventListener('click', stopRecording);
    speakerButton.addEventListener('click', toggleSpeech);
    
    // ===== INICIALIZAÇÃO =====
    requestMicrophonePermission();
});
