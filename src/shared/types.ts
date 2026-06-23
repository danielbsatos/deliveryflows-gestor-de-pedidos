export interface PrintRoute {
  id: string
  name: string
  printer: string
  categories: string[]
}

export interface StoreCategory {
  id: string
  name: string
}

export interface PrinterInfo {
  name: string
  displayName: string
  description: string
  status: number
  isDefault: boolean
  options: Record<string, unknown>
}

export interface PrintPayload {
  html: string
  target: string
}

export interface ElectronAPI {
  printReceipt(htmlContent: string, target: string): void
  getPrinters(): Promise<PrinterInfo[]>
  getConfig(): Promise<PrintRoute[]>
  saveConfig(config: PrintRoute[]): Promise<boolean>
  syncStoreCategories(categories: StoreCategory[]): void
  getStoreCategories(): Promise<StoreCategory[]>
}

export interface CacheEntry<T> {
  data: T
  expiresAt: number
}
