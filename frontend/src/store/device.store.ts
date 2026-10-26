import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PrinterConnectionType = 'SYSTEM_PRINT' | 'WEB_USB' | 'WEB_SERIAL' | 'NETWORK_IP';
export type PaperSize = '80mm' | '58mm';
export type ScannerMode = 'HARDWARE_WEDGE' | 'CAMERA' | 'MANUAL';

export interface DeviceState {
  // Printer Configuration
  printerConnectionType: PrinterConnectionType;
  paperSize: PaperSize;
  autoPrintReceipt: boolean;
  autoCutPaper: boolean;
  autoKickDrawer: boolean;
  printerIpAddress: string;
  printerPort: number;
  lastTestPrintAt: string | null;
  printerStatus: 'READY' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

  // Barcode Scanner Configuration
  scannerMode: ScannerMode;
  globalScannerListening: boolean;
  audioBeepEnabled: boolean;
  minBarcodeLength: number;
  maxKeystrokeIntervalMs: number;
  lastScannedBarcode: string | null;
  lastScannedDurationMs: number | null;
  lastScannedAt: string | null;
  scannerStatus: 'READY' | 'ACTIVE' | 'PAUSED';

  // Cash Drawer Configuration
  cashDrawerConnected: boolean;
  lastDrawerKickAt: string | null;

  // Actions
  setPrinterConnectionType: (type: PrinterConnectionType) => void;
  setPaperSize: (size: PaperSize) => void;
  setAutoPrintReceipt: (enabled: boolean) => void;
  setAutoCutPaper: (enabled: boolean) => void;
  setAutoKickDrawer: (enabled: boolean) => void;
  setPrinterIpAddress: (ip: string) => void;
  setPrinterPort: (port: number) => void;
  recordTestPrint: () => void;
  setPrinterStatus: (status: DeviceState['printerStatus']) => void;

  setScannerMode: (mode: ScannerMode) => void;
  setGlobalScannerListening: (enabled: boolean) => void;
  setAudioBeepEnabled: (enabled: boolean) => void;
  setMinBarcodeLength: (len: number) => void;
  setMaxKeystrokeIntervalMs: (ms: number) => void;
  recordScan: (barcode: string, durationMs: number) => void;
  setScannerStatus: (status: DeviceState['scannerStatus']) => void;

  setCashDrawerConnected: (connected: boolean) => void;
  recordDrawerKick: () => void;
  resetDeviceDefaults: () => void;
}

export const useDeviceStore = create<DeviceState>()(
  persist(
    (set) => ({
      // Defaults
      printerConnectionType: 'SYSTEM_PRINT',
      paperSize: '80mm',
      autoPrintReceipt: true,
      autoCutPaper: true,
      autoKickDrawer: true,
      printerIpAddress: '192.168.1.200',
      printerPort: 9100,
      lastTestPrintAt: null,
      printerStatus: 'READY',

      scannerMode: 'HARDWARE_WEDGE',
      globalScannerListening: true,
      audioBeepEnabled: true,
      minBarcodeLength: 3,
      maxKeystrokeIntervalMs: 50,
      lastScannedBarcode: null,
      lastScannedDurationMs: null,
      lastScannedAt: null,
      scannerStatus: 'READY',

      cashDrawerConnected: true,
      lastDrawerKickAt: null,

      setPrinterConnectionType: (type) => set({ printerConnectionType: type }),
      setPaperSize: (size) => set({ paperSize: size }),
      setAutoPrintReceipt: (enabled) => set({ autoPrintReceipt: enabled }),
      setAutoCutPaper: (enabled) => set({ autoCutPaper: enabled }),
      setAutoKickDrawer: (enabled) => set({ autoKickDrawer: enabled }),
      setPrinterIpAddress: (ip) => set({ printerIpAddress: ip }),
      setPrinterPort: (port) => set({ printerPort: port }),
      recordTestPrint: () =>
        set({
          lastTestPrintAt: new Date().toISOString(),
          printerStatus: 'READY',
        }),
      setPrinterStatus: (status) => set({ printerStatus: status }),

      setScannerMode: (mode) => set({ scannerMode: mode }),
      setGlobalScannerListening: (enabled) => set({ globalScannerListening: enabled }),
      setAudioBeepEnabled: (enabled) => set({ audioBeepEnabled: enabled }),
      setMinBarcodeLength: (len) => set({ minBarcodeLength: len }),
      setMaxKeystrokeIntervalMs: (ms) => set({ maxKeystrokeIntervalMs: ms }),
      recordScan: (barcode, durationMs) =>
        set({
          lastScannedBarcode: barcode,
          lastScannedDurationMs: durationMs,
          lastScannedAt: new Date().toISOString(),
          scannerStatus: 'ACTIVE',
        }),
      setScannerStatus: (status) => set({ scannerStatus: status }),

      setCashDrawerConnected: (connected) => set({ cashDrawerConnected: connected }),
      recordDrawerKick: () => set({ lastDrawerKickAt: new Date().toISOString() }),

      resetDeviceDefaults: () =>
        set({
          printerConnectionType: 'SYSTEM_PRINT',
          paperSize: '80mm',
          autoPrintReceipt: true,
          autoCutPaper: true,
          autoKickDrawer: true,
          printerIpAddress: '192.168.1.200',
          printerPort: 9100,
          printerStatus: 'READY',
          scannerMode: 'HARDWARE_WEDGE',
          globalScannerListening: true,
          audioBeepEnabled: true,
          minBarcodeLength: 3,
          maxKeystrokeIntervalMs: 50,
          scannerStatus: 'READY',
          cashDrawerConnected: true,
        }),
    }),
    {
      name: 'pos-device-settings',
    }
  )
);
