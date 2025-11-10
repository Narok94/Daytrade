
export async function fetchUSDBRLRate(): Promise<number> {
  try {
    // Add a cache-busting parameter (_=${Date.now()}) to ensure the latest rate is fetched from the CDN.
    const response = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json?_=${Date.now()}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    const rate = data.usd?.brl;
    if (typeof rate !== 'number' || isNaN(rate)) {
      throw new Error('Invalid rate received from API');
    }
    return rate;
  } catch (error) {
    console.error("Failed to fetch USD-BRL rate:", error);
    // Return a default/fallback rate or re-throw the error
    return 5.35; // Fallback rate
  }
}