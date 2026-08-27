/**
 * High-definition, Echo-cancelled and Noise-suppressed WebRTC Audio Constraints for SIP
 * with Max-Gain Automatic Level Control
 */
export const SIP_AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: { ideal: true },
    noiseSuppression: { ideal: true },
    autoGainControl: { ideal: true },
    channelCount: { ideal: 1 },
    sampleRate: { ideal: 48000 },
    sampleSize: { ideal: 16 },
    // Google Chrome / Chromium WebRTC AGC Boost
    googEchoCancellation: { ideal: true },
    googAutoGainControl: { ideal: true },
    googAutoGainControl2: { ideal: true },
    googNoiseSuppression: { ideal: true },
    googHighpassFilter: { ideal: false },
    googAudioMirroring: { ideal: false }
  },
  video: false
};

export const SIP_SDH_OPTIONS = {
  constraints: SIP_AUDIO_CONSTRAINTS
};
