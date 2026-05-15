export function heatExposureScore(
  outdoorProviders: number,
  totalProviders: number,
): number {
  return outdoorProviders / totalProviders;
}

export function floodExposureScore(
  inFloodZone: number,
  totalProviders: number,
  area: number,
): number {
  return (inFloodZone * (totalProviders / area)) / 100;
}

export function populationVulnerabilityScore(_populationDetails: object): number {
  return 0;
}

export function providerDiversityScore(
  outdoorProviders: number,
  indoorProviders: number,
): number {
  return Math.abs(outdoorProviders - indoorProviders) / 100;
}

export function vulnerabilityScore(
  hazardExposureScore: number,
  populationVulnerabilityScore: number,
  providerDiversityScore: number,
  floodExposureScore: number,
): number {
  const w1 = 1;
  const w2 = 0.9;
  const w3 = 0.5;
  const w4 = 1;

  return (
    (w1 * hazardExposureScore +
      w2 * populationVulnerabilityScore +
      w3 * providerDiversityScore +
      w4 * floodExposureScore) /
    100
  );
}
