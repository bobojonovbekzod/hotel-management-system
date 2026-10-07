/**
 * High-definition, Echo-cancelled and Noise-suppressed WebRTC Audio Constraints for SIP
 * with Max-Gain Automatic Level Control
 */
export const SIP_AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  video: false
};

export const SIP_SDH_OPTIONS = {
  constraints: SIP_AUDIO_CONSTRAINTS,
  iceGatheringTimeout: 3000,
  peerConnectionConfiguration: {
    iceTransportPolicy: 'all',  // host+srflx+relay — biri ishlamasa boshqasi ishlaydi
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        // O'zimizning coturn TURN serveri (har ikkala IP orqali)
        urls: [
          'turn:89.126.208.59:3478',
          'turn:89.126.208.59:3478?transport=tcp',
          'turn:138.249.7.136:3478',
          'turn:138.249.7.136:3478?transport=tcp',
        ],
        username: 'hotelbase',
        credential: 'turn123456',
      }
    ]
  }
};
