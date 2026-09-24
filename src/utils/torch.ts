/**
 * Controller for mobile hardware LED torch via MediaStreamTrack
 */

let mediaStream: MediaStream | null = null;
let videoTrack: MediaStreamTrack | null = null;
let isTorchHardwareSupported = false;

export async function requestTorchAccess(): Promise<{ supported: boolean; hasHardwareTorch: boolean; error?: string }> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { supported: false, hasHardwareTorch: false, error: 'API de cámara no disponible en este navegador' };
    }

    // Reuse or create track
    if (!videoTrack || videoTrack.readyState === 'ended') {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }
        }
      });
      videoTrack = mediaStream.getVideoTracks()[0];
    }

    if (videoTrack) {
      const capabilities = (typeof videoTrack.getCapabilities === 'function' ? videoTrack.getCapabilities() : {}) as any;
      isTorchHardwareSupported = Boolean(capabilities && capabilities.torch);
      return { supported: true, hasHardwareTorch: isTorchHardwareSupported };
    }

    return { supported: false, hasHardwareTorch: false };
  } catch (err: any) {
    console.warn('Acceso a cámara no disponible:', err);
    return { supported: false, hasHardwareTorch: false, error: err?.message || 'Permiso denegado' };
  }
}

export async function setHardwareTorch(on: boolean): Promise<boolean> {
  if (!videoTrack || videoTrack.readyState === 'ended') {
    return false;
  }

  try {
    const trackAny = videoTrack as any;
    if (typeof trackAny.applyConstraints === 'function') {
      await trackAny.applyConstraints({
        advanced: [{ torch: on }]
      });
      return true;
    }
  } catch (e) {
    console.warn('Error aplicando torch constraint:', e);
  }
  return false;
}

export function releaseHardwareTorch() {
  if (videoTrack) {
    try {
      const trackAny = videoTrack as any;
      if (typeof trackAny.applyConstraints === 'function') {
        trackAny.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
      }
    } catch {}
    videoTrack.stop();
    videoTrack = null;
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
}
