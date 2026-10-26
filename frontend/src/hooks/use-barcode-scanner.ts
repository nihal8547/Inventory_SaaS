import { useEffect, useRef } from 'react';
import { useDeviceStore } from '@/store/device.store';
import { playScanSuccessBeep } from '@/lib/audio-feedback';

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
}

/**
 * Enterprise Retail Barcode Scanner Hook:
 * Catches hardware USB & wireless 2.4GHz barcode scanners operating in Keyboard Wedge mode globally,
 * even when the search input is not focused!
 */
export function useBarcodeScanner({ onScan, enabled = true }: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const firstKeyTimeRef = useRef<number>(0);

  const {
    globalScannerListening,
    audioBeepEnabled,
    minBarcodeLength,
    maxKeystrokeIntervalMs,
    recordScan,
  } = useDeviceStore();

  const isListening = enabled && globalScannerListening;

  useEffect(() => {
    if (!isListening || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = performance.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;

      // Ignore pure modifier keys
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
        return;
      }

      // If the user has paused for longer than the hardware scanner threshold,
      // reset the scan buffer because it was likely human typing or a new scan sequence
      if (timeSinceLastKey > maxKeystrokeIntervalMs && bufferRef.current.length > 0) {
        bufferRef.current = '';
        firstKeyTimeRef.current = 0;
      }

      // Check for termination character (Enter or Tab)
      if (e.key === 'Enter' || e.key === 'Tab') {
        const barcode = bufferRef.current.trim();
        const scanDuration = firstKeyTimeRef.current ? Math.round(now - firstKeyTimeRef.current) : 15;

        // Verify if the input meets the hardware velocity & length criteria
        // (Hardware optical scanners typically input 8-14 digits in under 120ms)
        const isHardwareVelocity = scanDuration < 150 && barcode.length >= minBarcodeLength;

        if (barcode.length >= minBarcodeLength) {
          // If the target element is an INPUT or TEXTAREA, only intercept if it was clearly
          // a high-speed hardware scan to avoid breaking normal form field typing
          const activeEl = document.activeElement;
          const isInputFocused =
            activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;

          if (isHardwareVelocity || !isInputFocused) {
            e.preventDefault();
            e.stopPropagation();

            recordScan(barcode, scanDuration);

            if (audioBeepEnabled) {
              playScanSuccessBeep();
            }

            onScan(barcode);
          }
        }

        // Reset buffer
        bufferRef.current = '';
        firstKeyTimeRef.current = 0;
        lastKeyTimeRef.current = 0;
        return;
      }

      // Accept printable characters
      if (e.key.length === 1) {
        if (!firstKeyTimeRef.current) {
          firstKeyTimeRef.current = now;
        }
        bufferRef.current += e.key;
        lastKeyTimeRef.current = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [
    isListening,
    maxKeystrokeIntervalMs,
    minBarcodeLength,
    audioBeepEnabled,
    recordScan,
    onScan,
  ]);
}
