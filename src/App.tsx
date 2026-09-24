import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Flashlight,
  Power,
  RotateCw,
  Gauge,
  SunMedium,
} from 'lucide-react';
import {
  requestTorchAccess,
  setHardwareTorch,
  releaseHardwareTorch,
} from './utils/torch';

type Mode = 'celular' | 'pantalla' | 'patrulla';

export default function App() {
  const [mode, setMode] = useState<Mode>('pantalla');
  const [isOn, setIsOn] = useState<boolean>(false);

  // Strobe / Intermittency speed (0 = Continuous, 1 to 12 = Speed)
  const [strobeSpeed, setStrobeSpeed] = useState<number>(0);

  // Hardware torch intensity (10% to 100%)
  const [intensity, setIntensity] = useState<number>(100);

  // Strobe light phase states
  const [strobePhase, setStrobePhase] = useState<boolean>(true);
  const [policePhase, setPolicePhase] = useState<'red' | 'blue' | 'none'>('red');
  const [hardwareSupported, setHardwareSupported] = useState<boolean | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastToggleTimeRef = useRef<number>(performance.now());
  const policeCounterRef = useRef<number>(0);

  // Haptic feedback for tactile feel
  const triggerHaptic = useCallback((pattern: number | number[] = 25) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  }, []);

  // Cycle flashlight mode: Celular -> Pantalla -> Patrulla -> Celular
  const cycleMode = () => {
    triggerHaptic(30);
    const order: Mode[] = ['pantalla', 'patrulla', 'celular'];
    const nextIndex = (order.indexOf(mode) + 1) % order.length;
    setMode(order[nextIndex]);
  };

  // Toggle power button
  const togglePower = () => {
    triggerHaptic(40);
    setIsOn((prev) => !prev);
  };

  // Initialize hardware torch when celular mode is selected
  useEffect(() => {
    if (mode === 'celular' && isOn) {
      requestTorchAccess().then((res) => {
        setHardwareSupported(res.hasHardwareTorch);
      });
    }

    return () => {
      if (mode === 'celular') {
        releaseHardwareTorch();
      }
    };
  }, [mode, isOn]);

  // High precision animation loop for strobes and emergency pulses
  useEffect(() => {
    if (!isOn) {
      setStrobePhase(false);
      setPolicePhase('none');
      if (mode === 'celular') {
        setHardwareTorch(false);
      }
      return;
    }

    let isMounted = true;

    const loop = (timestamp: number) => {
      if (!isMounted) return;

      const elapsed = timestamp - lastToggleTimeRef.current;

      if (mode === 'pantalla' || mode === 'celular') {
        if (strobeSpeed === 0) {
          // Steady continuous light
          setStrobePhase(true);
          if (mode === 'celular') {
            setHardwareTorch(true);
          }
        } else {
          // Intermittent frequency: 0.5Hz (strobeSpeed 1) to 14Hz (strobeSpeed 12)
          const interval = Math.max(35, 480 - strobeSpeed * 36);
          if (elapsed >= interval) {
            lastToggleTimeRef.current = timestamp;
            setStrobePhase((prev) => {
              const next = !prev;
              if (mode === 'celular') {
                setHardwareTorch(next);
              }
              return next;
            });
          }
        }
      } else if (mode === 'patrulla') {
        // High-realism police wig-wag pattern (RED double flash, BLUE double flash)
        const stepTime = Math.max(25, 230 - strobeSpeed * 16);
        if (elapsed >= stepTime) {
          lastToggleTimeRef.current = timestamp;
          policeCounterRef.current = (policeCounterRef.current + 1) % 8;

          const step = policeCounterRef.current;
          if (step === 0 || step === 2) {
            setPolicePhase('red');
          } else if (step === 1 || step === 3) {
            setPolicePhase('none');
          } else if (step === 4 || step === 6) {
            setPolicePhase('blue');
          } else {
            setPolicePhase('none');
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOn, mode, strobeSpeed]);

  return (
    <div className="relative flex flex-col h-screen w-screen max-w-lg mx-auto bg-black text-neutral-100 select-none overflow-hidden justify-between p-3 sm:p-5 font-sans">
      {/* Dynamic ambient room flare */}
      <div
        className="pointer-events-none fixed inset-0 transition-opacity duration-75 z-0"
        style={{
          background:
            isOn && mode === 'patrulla'
              ? policePhase === 'red'
                ? 'radial-gradient(circle at center, rgba(239, 68, 68, 0.45) 0%, rgba(239, 68, 68, 0.1) 50%, transparent 80%)'
                : policePhase === 'blue'
                ? 'radial-gradient(circle at center, rgba(59, 130, 246, 0.45) 0%, rgba(59, 130, 246, 0.1) 50%, transparent 80%)'
                : 'transparent'
              : isOn && mode === 'pantalla' && strobePhase
              ? 'radial-gradient(circle at center, rgba(255, 255, 255, 0.3) 0%, transparent 80%)'
              : isOn && mode === 'celular' && strobePhase
              ? `radial-gradient(circle at center, rgba(255, 245, 210, ${(intensity / 100) * 0.3}) 0%, transparent 80%)`
              : 'transparent',
        }}
      />

      {/* Minimalist Top Bar */}
      <header className="relative z-10 flex items-center justify-between py-1 px-1">
        <div>
          <h1 className="text-base font-black tracking-widest text-white uppercase flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                isOn ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-neutral-600'
              }`}
            />
            Linterna Police
          </h1>
          <span className="text-[11px] font-medium text-neutral-400">
            {mode === 'pantalla' && 'Linterna en Pantalla'}
            {mode === 'patrulla' && 'Luces de Patrulla'}
            {mode === 'celular' && 'Linterna del Celular'}
          </span>
        </div>

        {/* Button to interchange flashlight types */}
        <button
          onClick={cycleMode}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700/80 hover:bg-neutral-800 active:scale-95 transition-all text-xs font-semibold text-neutral-200 shadow"
          title="Intercambiar tipo de linterna"
        >
          <RotateCw className="w-3.5 h-3.5 text-neutral-300" />
          <span>Cambiar Linterna</span>
        </button>
      </header>

      {/* Main Lighting Surface */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full py-2 overflow-hidden">
        {/* OPCS: LINTERNA EN PANTALLA (85% of screen area is white) */}
        {mode === 'pantalla' && (
          <div className="relative w-full h-full flex items-center justify-center">
            <div
              className={`rounded-3xl transition-all duration-75 flex items-center justify-center border ${
                isOn && strobePhase
                  ? 'bg-white border-white glow-white'
                  : 'bg-neutral-950 border-neutral-900'
              }`}
              style={{
                // Explicit 85% screen surface dimension
                width: '85vw',
                height: '85%',
                maxWidth: '420px',
              }}
            >
              {isOn && strobePhase && (
                <div className="w-full h-full bg-white rounded-3xl" />
              )}
            </div>
          </div>
        )}

        {/* OPCS: LUCES DE PATRULLA (Each light occupies 43% of the screen with stroboscopic flares) */}
        {mode === 'patrulla' && (
          <div className="relative w-full h-full flex flex-col items-center justify-center gap-3">
            {/* Red Light Bar: 43% of screen height */}
            <div
              className={`relative rounded-2xl overflow-hidden transition-all duration-75 border ${
                isOn && policePhase === 'red'
                  ? 'bg-red-600 border-red-300 glow-red'
                  : 'bg-neutral-950 border-neutral-900 opacity-60'
              }`}
              style={{
                width: '92%',
                height: '43%',
                maxHeight: '43vh',
              }}
            >
              <div className="absolute inset-0 fresnel-lens pointer-events-none" />

              {/* Realistic dynamic strobe flare burst */}
              {isOn && policePhase === 'red' && (
                <>
                  <div className="absolute inset-0 bg-radial from-white via-red-500 to-red-700 opacity-95" />
                  {/* Strobe halo shockwave */}
                  <div className="absolute -inset-8 bg-red-500/40 blur-3xl pointer-events-none" />
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 bg-white/70 blur-[8px]" />
                </>
              )}
            </div>

            {/* Blue Light Bar: 43% of screen height */}
            <div
              className={`relative rounded-2xl overflow-hidden transition-all duration-75 border ${
                isOn && policePhase === 'blue'
                  ? 'bg-blue-600 border-blue-300 glow-blue'
                  : 'bg-neutral-950 border-neutral-900 opacity-60'
              }`}
              style={{
                width: '92%',
                height: '43%',
                maxHeight: '43vh',
              }}
            >
              <div className="absolute inset-0 fresnel-lens pointer-events-none" />

              {/* Realistic dynamic strobe flare burst */}
              {isOn && policePhase === 'blue' && (
                <>
                  <div className="absolute inset-0 bg-radial from-white via-blue-500 to-blue-700 opacity-95" />
                  {/* Strobe halo shockwave */}
                  <div className="absolute -inset-8 bg-blue-500/40 blur-3xl pointer-events-none" />
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 bg-white/70 blur-[8px]" />
                </>
              )}
            </div>
          </div>
        )}

        {/* OPCS: LINTERNA DEL CELULAR (LED Torch + Screen Fixture) */}
        {mode === 'celular' && (
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <div
              className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-full flex items-center justify-center p-3 border-4 transition-all duration-75 ${
                isOn && strobePhase
                  ? 'border-amber-300 shadow-[0_0_80px_35px_rgba(251,191,36,0.6)]'
                  : 'border-neutral-800 bg-neutral-950'
              }`}
              style={{
                opacity: isOn && strobePhase ? Math.max(0.3, intensity / 100) : 0.8,
              }}
            >
              <div
                className={`w-full h-full rounded-full flex items-center justify-center transition-all ${
                  isOn && strobePhase ? 'bg-amber-100 glow-white' : 'reflector-dish'
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                    isOn && strobePhase
                      ? 'bg-white shadow-[0_0_25px_12px_rgba(255,255,255,1)] scale-110'
                      : 'bg-amber-400/20 border border-amber-500/30'
                  }`}
                >
                  <Flashlight
                    className={`w-8 h-8 transition-colors ${
                      isOn && strobePhase ? 'text-amber-500' : 'text-neutral-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            {hardwareSupported === false && isOn && (
              <p className="mt-3 text-[11px] text-amber-400/80 text-center px-4">
                LED de cámara no detectado en este dispositivo (simulando en pantalla).
              </p>
            )}
          </div>
        )}
      </main>

      {/* Minimalist Controls Underneath Each Light */}
      <footer className="relative z-10 bg-neutral-950/95 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3 shadow-2xl backdrop-blur-md">
        {/* Sliders Area */}
        <div className="flex flex-col gap-2.5">
          {/* Intensity Slider (Only for Linterna Celular) */}
          {mode === 'celular' && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs font-semibold text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <SunMedium className="w-3.5 h-3.5 text-amber-400" />
                  Intensidad
                </span>
                <span className="font-mono text-amber-400">{intensity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>
          )}

          {/* Blink Speed / Strobe Slider (Velocidad de Parpadeo) */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs font-semibold text-neutral-300">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-blue-400" />
                {mode === 'celular' ? 'Intermitencia' : 'Velocidad de Parpadeo'}
              </span>
              <span className="font-mono text-blue-400">
                {strobeSpeed === 0 ? 'Fijo' : `Nivel ${strobeSpeed}`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="12"
              step="1"
              value={strobeSpeed}
              onChange={(e) => setStrobeSpeed(Number(e.target.value))}
              className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
            />
          </div>
        </div>

        {/* Master ON/OFF Toggle Button */}
        <button
          onClick={togglePower}
          className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2.5 text-base font-black tracking-wider transition-all active:scale-[0.98] shadow-lg ${
            isOn
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/60'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60'
          }`}
        >
          <Power className={`w-5 h-5 ${isOn ? 'animate-pulse' : ''}`} />
          <span>{isOn ? 'APAGAR' : 'ENCENDER'}</span>
        </button>
      </footer>
    </div>
  );
}
