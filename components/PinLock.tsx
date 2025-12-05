'use client';

import { useState } from 'react';
import { Delete } from 'lucide-react';

type PinLockProps = {
  onUnlock: () => void;
};

export default function PinLock({ onUnlock }: PinLockProps) {
  const [pin, setPin] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleNumberClick = (num: number) => {
    const firstEmpty = pin.findIndex((p) => p === '');
    if (firstEmpty !== -1) {
      const newPin = [...pin];
      newPin[firstEmpty] = num.toString();
      setPin(newPin);

      // Check if PIN is complete
      if (firstEmpty === 5) {
        setTimeout(() => verifyPin(newPin.join('')), 100);
      }
    }
  };

  const handleDelete = () => {
    const lastFilled = pin.map((p, i) => (p !== '' ? i : -1)).filter((i) => i !== -1).pop();
    if (lastFilled !== undefined) {
      const newPin = [...pin];
      newPin[lastFilled] = '';
      setPin(newPin);
    }
    setError(false);
  };

  const verifyPin = (enteredPin: string) => {
    const storedPin = localStorage.getItem('app_pin');

    if (storedPin === enteredPin) {
      // Success
      sessionStorage.setItem('pin_unlocked', 'true');
      onUnlock();
    } else {
      // Error
      setError(true);
      setShake(true);
      setTimeout(() => {
        setPin(['', '', '', '', '', '']);
        setShake(false);
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] carbon-fiber overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-sm mx-auto py-4">
          {/* Logo */}
          <div className="flex justify-center mb-3 sm:mb-4 md:mb-6">
            <img
              src="/logo-KG.png"
              alt="KG Feeling Service"
              className="h-12 sm:h-16 md:h-20 lg:h-24 w-auto object-contain drop-shadow-2xl"
              style={{
                filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.3))'
              }}
            />
          </div>

          {/* Title */}
          <div className="text-center mb-3 sm:mb-4 md:mb-5">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white mb-1 drop-shadow-lg">
              ป้อน PIN
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-gray-300 drop-shadow">
              ป้อน PIN 6 หลักเพื่อเข้าสู่ระบบ
            </p>
          </div>

          {/* PIN Dots */}
          <div className={`flex justify-center gap-2 sm:gap-2.5 md:gap-3 mb-4 sm:mb-5 md:mb-6 ${shake ? 'animate-shake' : ''}`}>
            {pin.map((digit, index) => (
              <div
                key={index}
                className={`w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14 flex items-center justify-center rounded-full border-3 transition-all duration-200 backdrop-blur-sm ${
                  digit !== ''
                    ? error
                      ? 'border-red-500 bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                      : 'border-white bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                    : 'border-gray-600 bg-gray-800/30'
                }`}
              >
                {digit !== '' && (
                  <div
                    className={`w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 lg:w-4 lg:h-4 rounded-full ${error ? 'bg-red-500' : 'bg-white'} shadow-lg`}
                    style={{
                      boxShadow: error ? '0 0 10px rgba(239,68,68,0.8)' : '0 0 10px rgba(255,255,255,0.8)'
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-center text-red-400 text-xs sm:text-sm mb-3 sm:mb-4 animate-pulse drop-shadow-lg">
              PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง
            </p>
          )}

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 md:gap-3 lg:gap-4 mb-2 max-w-[260px] sm:max-w-[280px] md:max-w-xs lg:max-w-sm mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num)}
                className="aspect-square rounded-full bg-white/10 hover:bg-white/20 active:bg-white/25 backdrop-blur-md border border-white/20 text-white text-base sm:text-lg md:text-xl lg:text-2xl font-bold transition-all active:scale-95 shadow-xl hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center justify-center touch-manipulation"
                style={{
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                {num}
              </button>
            ))}
          </div>

          {/* Bottom Row: 0 and Delete */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 md:gap-3 lg:gap-4 max-w-[260px] sm:max-w-[280px] md:max-w-xs lg:max-w-sm mx-auto">
            <div></div>
            <button
              onClick={() => handleNumberClick(0)}
              className="aspect-square rounded-full bg-white/10 hover:bg-white/20 active:bg-white/25 backdrop-blur-md border border-white/20 text-white text-base sm:text-lg md:text-xl lg:text-2xl font-bold transition-all active:scale-95 shadow-xl hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center justify-center touch-manipulation"
              style={{
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                backdropFilter: 'blur(10px)'
              }}
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="aspect-square rounded-full bg-white/10 hover:bg-white/20 active:bg-white/25 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all active:scale-95 shadow-xl hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] touch-manipulation"
              style={{
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <Delete className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .carbon-fiber {
          background-color: #0a0a0a;
          background-image:
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 2px,
              rgba(255, 255, 255, 0.03) 2px,
              rgba(255, 255, 255, 0.03) 4px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 2px,
              rgba(255, 255, 255, 0.03) 2px,
              rgba(255, 255, 255, 0.03) 4px
            ),
            linear-gradient(
              to bottom,
              #0a0a0a,
              #1a1a1a
            );
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }

        .border-3 {
          border-width: 3px;
        }
      `}</style>
    </div>
  );
}
