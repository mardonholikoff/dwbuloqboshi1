import { ServiceRecord } from '../types';

/**
 * Check if a service record is associated with an oil change
 */
export function checkIsOilRecord(r: ServiceRecord): boolean {
  if (!r) return false;
  if (r.replacedOil && r.replacedOil.trim().length > 0) return true;
  const text = `${r.replacedParts || ''} ${r.partsToReplace || ''} ${r.notes || ''} ${r.carModel || ''}`.toLowerCase();
  const hasKeywords =
    text.includes('moy') ||
    text.includes('oil') ||
    text.includes('yog') ||
    text.includes('maslo') ||
    text.includes('filtr') ||
    text.includes('almashtir') ||
    text.includes('5w') ||
    text.includes('10w') ||
    text.includes('0w') ||
    text.includes('shell') ||
    text.includes('castrol') ||
    text.includes('mobil') ||
    text.includes('zic') ||
    text.includes('total') ||
    text.includes('mannol') ||
    text.includes('liqui') ||
    text.includes('motul') ||
    text.includes('kixx');
  return hasKeywords || Boolean(r.replacedParts || r.carPlate || r.customerName);
}

/**
 * Calculate days passed since a date string
 */
export function getDaysAgo(dateStr: string): number {
  if (!dateStr) return 0;
  const created = new Date(dateStr).getTime();
  if (isNaN(created)) return 0;
  const diff = Date.now() - created;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export interface OverdueCustomer {
  key: string;
  plate: string;
  customerName: string;
  phoneNumber: string;
  carModel: string;
  latestOilRecord: ServiceRecord;
  daysAgo: number;
  thresholdDays: number;
  isCustomInterval?: boolean;
  totalServices: number;
}

/**
 * Extract unique customers whose LATEST service was thresholdDays+ ago
 * (Either custom visitIntervalDays if set, or default 30 days)
 */
export function getOverdueOilCustomers(records: ServiceRecord[]): OverdueCustomer[] {
  if (!Array.isArray(records) || records.length === 0) return [];

  // Group all records by unique normalized customer key
  const customerMap = new Map<string, ServiceRecord[]>();

  records.forEach((r) => {
    const rawPlate = (r.carPlate || '').toUpperCase().trim();
    const rawPhone = (r.phoneNumber || '').trim();
    const rawName = (r.customerName || '').toLowerCase().trim();

    const cleanPlate = rawPlate.replace(/[\s\-_]/g, '');
    const cleanPhone = rawPhone.replace(/[\s\-_]/g, '');

    // Unique customer key prioritizing normalized plate, then phone, then name
    const key = cleanPlate || cleanPhone || rawName;
    if (!key) return;

    if (!customerMap.has(key)) {
      customerMap.set(key, []);
    }
    customerMap.get(key)!.push(r);
  });

  const overdueList: OverdueCustomer[] = [];

  customerMap.forEach((customerRecords, key) => {
    // Filter to oil/service records for this customer
    const oilRecords = customerRecords.filter(checkIsOilRecord);
    const validRecords = oilRecords.length > 0 ? oilRecords : customerRecords;

    // Sort customer's records descending (latest service first)
    validRecords.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const latestOilRecord = validRecords[0];
    const daysAgo = getDaysAgo(latestOilRecord.createdAt);

    // Check if customer has a specified visitIntervalDays on any of their records (newest takes precedence)
    const customIntervalRecord = customerRecords.find(
      (c) => c.visitIntervalDays && Number(c.visitIntervalDays) > 0
    );
    const thresholdDays = customIntervalRecord?.visitIntervalDays
      ? Number(customIntervalRecord.visitIntervalDays)
      : 30;

    // Check if the latest service was >= thresholdDays ago
    if (daysAgo >= thresholdDays) {
      const plate = latestOilRecord.carPlate || (customerRecords.find((c) => c.carPlate)?.carPlate) || "NOMA'LUM";
      const customerName = latestOilRecord.customerName || (customerRecords.find((c) => c.customerName)?.customerName) || "Mijoz";
      const phoneNumber = latestOilRecord.phoneNumber || (customerRecords.find((c) => c.phoneNumber)?.phoneNumber) || "";
      const carModel = latestOilRecord.carModel || (customerRecords.find((c) => c.carModel)?.carModel) || "";

      overdueList.push({
        key,
        plate,
        customerName,
        phoneNumber,
        carModel,
        latestOilRecord,
        daysAgo,
        thresholdDays,
        isCustomInterval: Boolean(customIntervalRecord?.visitIntervalDays),
        totalServices: customerRecords.length,
      });
    }
  });

  // Sort by most overdue beyond their threshold first
  overdueList.sort((a, b) => (b.daysAgo - b.thresholdDays) - (a.daysAgo - a.thresholdDays));

  return overdueList;
}
