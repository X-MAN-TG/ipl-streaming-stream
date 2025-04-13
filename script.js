
document.addEventListener('DOMContentLoaded', () => {
  const firebaseConfig = {
    apiKey: "AIzaSyAYXSWnTHjUBDjIi3ylSn1kN0K1v2m4mW4",
    authDomain: "ipl-streaming-f3d50.firebaseapp.com",
    projectId: "ipl-streaming-f3d50",
    storageBucket: "ipl-streaming-f3d50.firebasestorage.app",
    messagingSenderId: "41702918970",
    appId: "1:41702918970:web:aa17fab82de1090adf5e03",
    measurementId: "G-ZPHSKD3DD1"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  const config = {
    streamUrl: 'https://v18tataplaysyndication.akamaized.net/bpk-tv/StarSports_2_Hin_HD_voot_MOB/output03/hdntl=exp=1744631889~acl=%2F*~data=hdntl~hmac=6ccd2c67d51f4f07c078a9f2145449815fe1a047dfc72d38cc1f29121d6f42b9/StarSports_2_Hin_HD_voot_MOB-audio_108038_hin=108000-video=1275600.m3u8',
    autoPlay: false,
    maxRetries: 3,
    retryDelay: 3000
  };

  const video = document.getElementById('live-video');
  const globalLoading = document.getElementById('global-loading');
  const errorMessage = document.getElementById('error-message');
  let hls = null;
  let retryCount = 0;
  let isPlaying = false;
  let isMuted = false;

  function initPlayer() {
    globalLoading.style.display = 'flex';

    const wasPlaying = !video.paused; // Capture if the video was playing

    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      if (hls) hls.destroy();

      const quality = 'high'; // Set a default quality
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 1,
        maxMaxBufferLength: quality === 'low' ? 10 : quality === 'medium' ? 20 : 30
      });

      hls.loadSource(config.streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        globalLoading.style.display = 'none';
        retryCount = 0;

        // Play the video again if it was playing before
        if (wasPlaying) {
          video.play().catch(handleError);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          if (retryCount < config.maxRetries) {
            retryCount++;
            const delay = config.retryDelay * Math.pow(2, retryCount);
            setTimeout(initPlayer, delay);
            showError(`Connection lost. Retrying (${retryCount}/${config.maxRetries})...`);
          } else {
            showError('Failed to connect. Please refresh the page.');
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = config.streamUrl;
      video.addEventListener('loadedmetadata', () => {
        globalLoading.style.display = 'none';
        if (config.autoPlay) video.play();
      });
    } else {
      showError('Your browser does not support live streaming.');
    }
  }

  function handleError(error) {
    console.error('Player Error:', error);
    showError(error.message);
  }

  function showError(message) {
    errorMessage.innerText = message;
    errorMessage.style.display = 'block';
  }

  // Toggle chat visibility on small screens
  document.getElementById('toggle-chat').addEventListener('click', () => {
    const chatContent = document.getElementById('chat-content');
    chatContent.classList.toggle('hidden');
  });

  // Chat send functionality
  document.getElementById('chat-send').addEventListener('click', () => {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    if (message) {
      db.collection("chats").add({
        message: message,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      chatInput.value = '';
    }
  });

  // Real-time chat listener
  db.collection("chats").orderBy("timestamp")
    .onSnapshot(snapshot => {
      const messages = snapshot.docs.map(doc => doc.data());
      const chatMessages = document.getElementById("chat-messages");
      chatMessages.innerHTML = '';
      messages.forEach(msg => {
        const messageDiv = document.createElement("div");
        messageDiv.textContent = msg.message;
        chatMessages.appendChild(messageDiv);
      });
    });

  // Initialize the player on load
  initPlayer();
});
