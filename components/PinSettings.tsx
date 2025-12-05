'use client';

import { useState, useEffect } from 'react';
import { Lock, Key, Shield } from 'lucide-react';

export default function PinSettings() {
  const [hasPin, setHasPin] = useState(false);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [newPin, setNewPin] = useState<string[]>(['', '', '', '', '', '']);
  const [confirmPin, setConfirmPin] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedPin = localStorage.getItem('app_pin');
    setHasPin(!!storedPin);
  }, []);

  const handleNumberClick = (num: number) => {
    const currentPin = step === 'enter' ? newPin : confirmPin;
    const setPin = step === 'enter' ? setNewPin : setConfirmPin;

    const firstEmpty = currentPin.findIndex((p) => p === '');
    if (firstEmpty !== -1) {
      const updated = [...currentPin];
      updated[firstEmpty] = num.toString();
      setPin(updated);

      // Auto move to confirm step
      if (step === 'enter' && firstEmpty === 5) {
        setTimeout(() => setStep('confirm'), 300);
      }

      // Auto save when confirm is complete
      if (step === 'confirm' && firstEmpty === 5) {
        setTimeout(() => {
          const newPinStr = newPin.join('');
          const confirmPinStr = updated.join('');

          if (newPinStr === confirmPinStr) {
            localStorage.setItem('app_pin', newPinStr);
            alert('ตั้ง PIN สำเร็จ!');
            setHasPin(true);
            resetPinForm();
          } else {
            setError('PIN ไม่ตรงกัน กรุณาลองใหม่อีกครั้ง');
            setTimeout(() => {
              setStep('enter');
              setNewPin(['', '', '', '', '', '']);
              setConfirmPin(['', '', '', '', '', '']);
              setError('');
            }, 1500);
          }
        }, 100);
      }
    }
  };

  const handleDelete = () => {
    const currentPin = step === 'enter' ? newPin : confirmPin;
    const setPin = step === 'enter' ? setNewPin : setConfirmPin;

    const lastFilled = currentPin.map((p, i) => (p !== '' ? i : -1)).filter((i) => i !== -1).pop();
    if (lastFilled !== undefined) {
      const updated = [...currentPin];
      updated[lastFilled] = '';
      setPin(updated);
    }
    setError('');
  };

  const resetPinForm = () => {
    setIsSettingPin(false);
    setStep('enter');
    setNewPin(['', '', '', '', '', '']);
    setConfirmPin(['', '', '', '', '', '']);
    setError('');
  };

  const handleRemovePin = () => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบ PIN?')) {
      localStorage.removeItem('app_pin');
      sessionStorage.removeItem('pin_unlocked');
      setHasPin(false);
      alert('ลบ PIN สำเร็จ');
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gray-900 dark:bg-white rounded-lg">
          <Shield size={24} className="text-white dark:text-black" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">ความปลอดภัย</h2>
          <p className="text-sm text-gray-600 dark:text-zinc-400">จัดการ PIN เพื่อล็อคแอปพลิเคชัน</p>
        </div>
      </div>

      {!isSettingPin ? (
        <div className="space-y-4">
          {/* PIN Status */}
          <div className="bg-gray-100 dark:bg-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Lock size={20} className="text-gray-900 dark:text-white" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {hasPin ? 'PIN ถูกตั้งค่าแล้ว' : 'ยังไม่ได้ตั้ง PIN'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-zinc-400">
                    {hasPin ? 'แอปของคุณมีการป้องกันด้วย PIN' : 'ตั้งค่า PIN เพื่อความปลอดภัย'}
                  </p>
                </div>
              </div>
              {hasPin ? (
                <div className="w-3 h-3 bg-green-500 rounded-full" />
              ) : (
                <div className="w-3 h-3 bg-gray-400 dark:bg-zinc-600 rounded-full" />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => setIsSettingPin(true)}
              className="w-full flex items-center justify-between p-4 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black rounded-xl transition-all"
            >
              <div className="flex items-center space-x-3">
                <Key size={20} />
                <span className="font-semibold">{hasPin ? 'เปลี่ยน PIN' : 'ตั้งค่า PIN'}</span>
              </div>
              <span className="text-sm opacity-70">→</span>
            </button>

            {hasPin && (
              <button
                onClick={handleRemovePin}
                className="w-full flex items-center justify-between p-4 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl transition-all border border-red-200 dark:border-red-800"
              >
                <div className="flex items-center space-x-3">
                  <Lock size={20} />
                  <span className="font-semibold">ลบ PIN</span>
                </div>
                <span className="text-sm opacity-70">→</span>
              </button>
            )}
          </div>

          {/* Demo Note */}
          <p className="text-xs text-gray-500 dark:text-zinc-500 text-center mt-4">
            💡 สำหรับ Demo: PIN จะถูกเก็บใน localStorage
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {step === 'enter' ? 'กรุณาป้อน PIN ใหม่' : 'ยืนยัน PIN อีกครั้ง'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              {step === 'enter' ? 'ป้อน PIN 6 หลัก' : 'ป้อน PIN เดิมอีกครั้งเพื่อยืนยัน'}
            </p>
          </div>

          {/* PIN Dots */}
          <div className="flex justify-center gap-2">
            {(step === 'enter' ? newPin : confirmPin).map((digit, index) => (
              <div
                key={index}
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  digit !== ''
                    ? 'border-gray-900 dark:border-white bg-gray-100 dark:bg-zinc-800 shadow-md'
                    : 'border-gray-300 dark:border-zinc-700'
                }`}
              >
                {digit !== '' && (
                  <div className="w-3 h-3 rounded-full bg-gray-900 dark:bg-white shadow-sm" />
                )}
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-center text-red-500 text-sm animate-pulse">
              {error}
            </p>
          )}

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num)}
                className="h-14 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white text-xl font-semibold transition-all active:scale-95 shadow-md"
              >
                {num}
              </button>
            ))}
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={resetPinForm}
              className="h-14 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white text-sm font-semibold transition-all shadow-md"
            >
              ยกเลิก
            </button>
            <button
              onClick={() => handleNumberClick(0)}
              className="h-14 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white text-xl font-semibold transition-all active:scale-95 shadow-md"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="h-14 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white text-sm font-semibold transition-all shadow-md"
            >
              ลบ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
