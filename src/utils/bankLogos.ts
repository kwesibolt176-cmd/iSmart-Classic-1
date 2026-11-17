export const bankLogos: Record<string, string> = {
  "Absa Bank Ghana": "/banklogos/absa bank.png",
  "Access Bank Ghana": "/banklogos/acc.ico",
  "Agricultural Development Bank": "/banklogos/adb.ico",
  "Bank of Africa Ghana": "/banklogos/boa.png",
  "CAL Bank": "/banklogos/cal.png",
  "Consolidated Bank Ghana": "/banklogos/cbg.png",
  "Ecobank Ghana": "/banklogos/ecb.png",
  "FBNBank Ghana": "/banklogos/fbn.png",
  "Fidelity Bank Ghana": "/banklogos/fid.png",
  "First Atlantic Bank": "/banklogos/fab.ico",
  "First National Bank Ghana": "/banklogos/fnb.png",
  "GCB Bank": "/banklogos/gcb.png",
  "Guaranty Trust Bank Ghana": "/banklogos/gtb.png",
  "National Investment Bank": "/banklogos/nib.ico",
  "OmniBSIC Bank": "/banklogos/omn.ico",
  "Prudential Bank": "/banklogos/pbl.ico",
  "Republic Bank Ghana": "/banklogos/rep.ico",
  "Societe Generale Ghana": "/banklogos/sgg.ico",
  "Stanbic Bank Ghana": "/banklogos/stb.ico",
  "Standard Chartered Bank Ghana": "/banklogos/scb.ico",
  "United Bank for Africa Ghana": "/banklogos/uba.ico",
  "Zenith Bank Ghana": "/banklogos/zen.ico",
  "Universal Merchant Bank": "/banklogos/umb.png",
  // Aliases
  "UMB": "/banklogos/umb.png",
  "UBA": "/banklogos/uba.ico",
  "GTBank": "/banklogos/gtb.png",
  "GTB": "/banklogos/gtb.png",
  "CBG": "/banklogos/cbg.png",
  "ADB": "/banklogos/adb.ico",
  "ABS": "/banklogos/absa bank.png",
  "ACC": "/banklogos/acc.ico",
  "BOA": "/banklogos/boa.png",
  "CAL": "/banklogos/cal.png",
  "ECB": "/banklogos/ecb.png",
  "FBN": "/banklogos/fbn.png",
  "FID": "/banklogos/fid.png",
  "FAB": "/banklogos/fab.ico",
  "FNB": "/banklogos/fnb.png",
  "GCB": "/banklogos/gcb.png",
  "NIB": "/banklogos/nib.ico",
  "OMN": "/banklogos/omn.ico",
  "PBL": "/banklogos/pbl.ico",
  "REP": "/banklogos/rep.ico",
  "SGG": "/banklogos/sgg.ico",
  "STB": "/banklogos/stb.ico",
  "SCB": "/banklogos/scb.ico",
  "ZEN": "/banklogos/zen.ico",
};

export const getBankLogo = (bankName?: string | null): string | null => {
  if (!bankName) return null;
  
  // Try direct match
  if (bankLogos[bankName]) return bankLogos[bankName];
  
  // Try normalized match (case insensitive, trimmed)
  const normalizedSearch = bankName.trim().toLowerCase();
  
  for (const [name, path] of Object.entries(bankLogos)) {
    if (name.toLowerCase() === normalizedSearch) return path;
    // Partial matches for cases like "UBA" matching "United Bank for Africa Ghana"
    if (normalizedSearch.length > 2 && name.toLowerCase().includes(normalizedSearch)) return path;
    if (name.toLowerCase().length > 2 && normalizedSearch.includes(name.toLowerCase())) return path;
  }
  
  return null;
};
