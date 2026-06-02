'use strict';

/*
  JavaScript recreation of the key calculation chain in:
  jonsson_3cy_01_04_20_21.xlsx

  Scope:
  - Config inputs
  - FEC / required slicer SNR
  - Frequency grid
  - 802.3ch-style PSD mask variants used by the selected config
  - Channel insertion loss model
  - Wire/connector/channel echo
  - AFE + residual echo noise
  - Weighted in-band average SNR and SNR margin

  The workbook contains many selectable models and scenario-summary cells. This file implements
  the selected/default case and keeps the functions general enough to change inputs/models.
*/

const MODULATION_TABLE = Object.freeze({
  'PAM2':  { name: 'PAM2',  bitsPerSymbol: 1.0, symbolsPerSample: 1.0,    slicerLevels: 2, psdType: 'ZOH' },
  'PAM4':  { name: 'PAM4',  bitsPerSymbol: 2.0, symbolsPerSample: 0.5,    slicerLevels: 4, psdType: 'ZOH' },
  'PAM8':  { name: 'PAM8',  bitsPerSymbol: 3.0, symbolsPerSample: 0.3333, slicerLevels: 8, psdType: 'ZOH' },
  'PAM16': { name: 'PAM16', bitsPerSymbol: 4.0, symbolsPerSample: 0.25,   slicerLevels: 16, psdType: 'ZOH' },
  'DME':   { name: 'DME',   bitsPerSymbol: 0.5, symbolsPerSample: 2.0,    slicerLevels: 2, psdType: 'DME' },
  '3B2T':  { name: '3B2T',  bitsPerSymbol: 1.5, symbolsPerSample: 0.6667, slicerLevels: 3, psdType: 'ZOH' }
});

const DEFAULT_INPUTS = Object.freeze({
  configTitle: '',
  configDescription: '',
  dataRateGbpsUs: 25,
  dataRateGbpsDs: 25,
  targetBer: 1e-12,
  cableLengthM: 11,
  wireReflectionLimit: 'jonsson*12_08_20',
  numberOfConnectors: 4,
  modulationUs: 'PAM4',
  modulationDs: 'PAM4',
  fecBlockSizeUs: 360,
  fecBlockSizeDs: 360,
  fecDataSizeUs: 326,
  fecDataSizeDs: 326,
  fecCorrectionEfficiencyUs: 1,
  fecCorrectionEfficiencyDs: 1,
  fecBitsPerSymbolUs: 10,
  fecBitsPerSymbolDs: 10,
  tddDutyCycleUs: 1,
  tddDutyCycleDs: 1,
  framingOverheadUs: 0.01875,
  framingOverheadDs: 0.01875,
  psdMaskUs: 'PSD_ZOH',
  psdMaskDs: 'PSD_ZOH',
  txPowerDbmUs: 0,
  txPowerDbmDs: 0,
  impulseErrorRate: 1e-4,
  afeNoiseDbmPerHzUs: -140,
  afeNoiseDbmPerHzDs: -140,
  cableReflectionEchoCancellationDbUs: 6,
  cableReflectionEchoCancellationDbDs: 6,
  connectorEchoCancellationDbUs: 50,
  connectorEchoCancellationDbDs: 50,
  implementationLossDbUs: 5,
  implementationLossDbDs: 5,
  cableModel: 'mueller_3cy_01_12_01_20_sdp',
  pcbModel: 'pcb_kadry_3cy_02_0820',
  pcbTraceLengthM: 0.0762,
  connectorEchoModel: 'Hard',
  temperatureC: 20,
  fMaxHz: 9e9,
  nSteps: 200
});

// Channels!W:AL parameter table. Formula: IL_per_m = b0*((1+drho*(T-20))*f)^p + b1*f
const CHANNEL_MODELS = Object.freeze({
  'eq149-18': { b1: -1.3333333333333334e-10, b0: -9.045189161192256e-5, p: 0.45, drho: 0 },
  'mueller_3cy_01_10_14_20_target': { b1: -8.831339802848656e-11, b0: -2.91866049923803e-5, p: 0.5, drho: 0.004 },
  'boyer_3cy_01_10_14_20_c1': { b1: -1.2353665436395793e-10, b0: -2.2866874998790228e-5, p: 0.5, drho: 0.004 },
  'patel_3cy_01_0920': { b1: -2.0677835206542268e-10, b0: -2.2166641006363804e-5, p: 0.5, drho: 0.004 },
  'zimmerman_3cy_01a_1120': { b1: -7.272727272727272e-11, b0: -8.166636466797575e-5, p: 0.45, drho: 0 },
  'mueller_3cy_01_12_01_20_sdp': { b1: -9.218595807956661e-11, b0: -2.11820422200573e-5, p: 0.5, drho: 0.004 },
  'mueller_3cy_01_12_01_20_stp': { b1: -3.291003355690276e-10, b0: -1.7601039374847014e-5, p: 0.5, drho: 0.004 },
  'koeppendoerfer_3cy_01_10_28_20_sdp3': { b1: -9.934097406279351e-11, b0: -2.622701573690151e-5, p: 0.5, drho: 0.004 },
  'neulinger_3cy_01_12_15_20': { b1: -7.778552179559718e-11, b0: -2.3934384125859205e-5, p: 0.5, drho: 0.004 },
  'diminico_3cy_01a_1_5_21_26awg': { b1: -5.57124339148326e-11, b0: -2.1531762390265137e-5, p: 0.5, drho: 0.004 },
  'diminico_3cy_01a_1_5_21_28awg': { b1: -4.2070178303516764e-11, b0: -2.7283241168989157e-5, p: 0.5, drho: 0.004 },
  'Gianordoli_Silvano_de_Sousa_3cy_01_02_09_21_24awg': { b1: -8.381150118176195e-11, b0: -1.900538624362459e-5, p: 0.5, drho: 0.004 },
  'pcb_kadry_3cy_02_0820': { b1: -3.854330708661418e-9, b0: -4.4819683372465216e-5, p: 0.5, drho: 0 },
  none: { b1: 0, b0: 0, p: 0.5, drho: 0 }
});

const CONNECTOR_ECHO_C0 = Object.freeze({ Bad: 7.5e-11, Hard: 1.7e-11, Good: 1e-12, Easy: 1e-14 });

const log10 = (x) => Math.log(x) / Math.LN10;
const dbToLinear = (db) => Math.pow(10, db / 10);
const linearToDb = (x) => 10 * log10(x);
const sinc = (x) => Math.abs(x) < 1e-14 ? 1 : Math.sin(x) / x;

function normInv(p) {
  // Peter J. Acklam's inverse normal approximation.
  if (!(p > 0 && p < 1)) throw new RangeError('normInv p must be in (0,1)');
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.3577518672690, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425, phigh = 1 - plow;
  let q, r;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
             ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  q = p - 0.5;
  r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
         (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function logGamma(z) {
  // Lanczos approximation.
  const g = 7;
  const p = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = p[0];
  for (let i = 1; i < p.length; i++) x += p[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function gammaP(a, x) {
  // Regularized lower incomplete gamma P(a,x), as used by chi-square CDF.
  if (x <= 0) return 0;
  if (x < a + 1) {
    let ap = a, sum = 1 / a, del = sum;
    for (let n = 1; n <= 200; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-14) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }
  let b = x + 1 - a;
  let c = 1 / Number.MIN_VALUE;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < Number.MIN_VALUE) d = Number.MIN_VALUE;
    c = b + an / c;
    if (Math.abs(c) < Number.MIN_VALUE) c = Number.MIN_VALUE;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

function chiSqInv(p, df) {
  if (!(p > 0 && p < 1)) throw new RangeError('chiSqInv p must be in (0,1)');
  if (!(df > 0)) throw new RangeError('chiSqInv df must be positive');
  const a = df / 2;
  let lo = 0;
  let hi = Math.max(df, 1);
  while (gammaP(a, hi / 2) < p) hi *= 2;
  for (let i = 0; i < 120; i++) {
    const mid = (lo + hi) / 2;
    if (gammaP(a, mid / 2) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function channelInsertionLossPerMeterDb(fHz, modelName, temperatureC) {
  const m = CHANNEL_MODELS[modelName];
  if (!m) throw new Error(`Unknown channel model: ${modelName}`);
  return m.b0 * Math.pow((1 + m.drho * (temperatureC - 20)) * fHz, m.p) + m.b1 * fHz;
}

function getModulation(direction, input) {
  const modName = direction === 'us'
    ? (input.modulationUs ?? ('PAM' + (input.pamUs ?? 4)))
    : (input.modulationDs ?? ('PAM' + (input.pamDs ?? 4)));
  return MODULATION_TABLE[modName] || MODULATION_TABLE['PAM4'];
}

function computeFecAndRequiredSnr(direction, input, sampleRateSymbolMultiplier) {
  const mod = getModulation(direction, input);
  const levels = mod.slicerLevels;
  const bitsPerSymbol = mod.bitsPerSymbol;

  const targetBer = input.targetBer;
  const n = direction === 'us' ? (input.fecBlockSizeUs ?? input.fecBlockSize ?? 360) : (input.fecBlockSizeDs ?? input.fecBlockSize ?? 360);
  const k = direction === 'us' ? (input.fecDataSizeUs ?? input.fecDataSize ?? 326) : (input.fecDataSizeDs ?? input.fecDataSize ?? 326);
  const eff = direction === 'us' ? (input.fecCorrectionEfficiencyUs ?? input.fecCorrectionEfficiency ?? 1) : (input.fecCorrectionEfficiencyDs ?? input.fecCorrectionEfficiency ?? 1);
  const bitsPerSym = direction === 'us' ? (input.fecBitsPerSymbolUs ?? input.fecBitsPerSymbol ?? 10) : (input.fecBitsPerSymbolDs ?? input.fecBitsPerSymbol ?? 10);

  const correctionSymbols = Math.floor(((n - k) / 2) * eff);
  const avgErrorsPerBlock = chiSqInv(targetBer, 2 * (correctionSymbols + 1)) / 2;
  const avgErrorsPerSymbol = avgErrorsPerBlock / n;
  const requiredSlicerBer = 1 - Math.pow(1 - avgErrorsPerSymbol, bitsPerSymbol / bitsPerSym);
  const requiredGaussianSlicerBer = requiredSlicerBer - input.impulseErrorRate;
  let requiredSnrLinear;
  if (requiredGaussianSlicerBer <= 0) {
    requiredSnrLinear = Infinity;
  } else {
    const normalArg = Math.max(1e-15, Math.min(1 - 1e-15, 1 - (levels * requiredGaussianSlicerBer) / (2 * (levels - 1))));
    requiredSnrLinear = ((levels * levels - 1) / 3) * Math.pow(normInv(normalArg), 2);
  }
  return {
    correctionSymbols,
    avgErrorsPerBlock,
    avgErrorsPerSymbol,
    requiredSlicerBer,
    requiredGaussianSlicerBer,
    requiredSnrLinear,
    requiredSnrDb: linearToDb(requiredSnrLinear)
  };
}

function computeSampleRateAndNyquist(direction, input) {
  const dataRateGbps = direction === 'us' ? input.dataRateGbpsUs : input.dataRateGbpsDs;
  const mod = getModulation(direction, input);
  const bitsPerSymbol = mod.bitsPerSymbol;
  const duty = direction === 'us' ? input.tddDutyCycleUs : input.tddDutyCycleDs;
  
  const n = direction === 'us' ? (input.fecBlockSizeUs ?? input.fecBlockSize ?? 360) : (input.fecBlockSizeDs ?? input.fecBlockSize ?? 360);
  const k = direction === 'us' ? (input.fecDataSizeUs ?? input.fecDataSize ?? 326) : (input.fecDataSizeDs ?? input.fecDataSize ?? 326);
  const fecMultiplier = n / k;
  
  const overhead = direction === 'us' ? (input.framingOverheadUs ?? input.framingOverhead ?? 0.01875) : (input.framingOverheadDs ?? input.framingOverhead ?? 0.01875);
  const sampleRateHz = dataRateGbps * 1e9 * fecMultiplier / bitsPerSymbol / duty * (1 + overhead);
  return { sampleRateHz, nyquistHz: sampleRateHz / 2 };
}

function psdMaskDbmPerHz(kind, direction, fHz, input, nyquistHz) {
  const isUs = direction === 'us';
  const dataRateGbps = isUs ? input.dataRateGbpsUs : input.dataRateGbpsDs;
  const txPowerDbm = isUs ? input.txPowerDbmUs : input.txPowerDbmDs;
  const S_ch = dataRateGbps / 10;
  const K_ch = linearToDb(S_ch);
  switch (kind) {
    case 'eq149-14':
      return Math.min(-90, -89 - fHz / (600e6 * S_ch), -82 - fHz / (250e6 * S_ch)) - K_ch;
    case 'eq149-22':
      return -Math.max(Math.min(20, 20 - 10 * log10((2 * fHz) / 480e6)), 12 - 3);
    case 'PSD_brick':
      return linearToDb(dbToLinear(txPowerDbm) / nyquistHz) + (fHz > nyquistHz ? -50 : 0);
    case 'PSD_ZOH': {
      const mod = getModulation(direction, input);
      const rSym = nyquistHz * 2;
      const u = Math.PI * fHz / rSym;
      if (mod.psdType === 'DME') {
        const sincPart = 20 * log10(Math.abs(sinc(u)));
        const sinPart = 20 * log10(Math.abs(Math.sin(u)) + 1e-15);
        return sincPart + sinPart + txPowerDbm - 10 * log10(nyquistHz) + 1.11 + 6.02;
      } else {
        return 20 * log10(Math.abs(sinc(u))) + txPowerDbm - 10 * log10(nyquistHz) + 1.11;
      }
    }
    case 'Butterworth':
      return 10 * log10(1 / (1 + Math.pow(fHz / nyquistHz, 6))) + txPowerDbm - 10 * log10(nyquistHz) + 0.45;
    default:
      throw new Error(`Unknown PSD mask: ${kind}`);
  }
}

function excelApproxVlookupFrequency(targetHz, fStepHz) {
  // Excel VLOOKUP(..., Calculate!A:E, ..., TRUE) uses the largest frequency grid value <= target.
  return Math.floor(targetHz / fStepHz) * fStepHz;
}

function cableLossAtNyquistPositiveDb(input, nyquistHz, fStepHz) {
  const fLookupHz = excelApproxVlookupFrequency(nyquistHz, fStepHz);
  const ilCableDb = channelInsertionLossPerMeterDb(fLookupHz, input.cableModel, input.temperatureC) * input.cableLengthM;
  return -ilCableDb;
}

function selectedWireEchoDb(input, cableLossNyquistPositiveDb) {
  switch (input.wireReflectionLimit) {
    case 'jonsson*10_14_20': return -40;
    case 'jonsson*12_08_20': return Math.min(-35, -cableLossNyquistPositiveDb - 15);
    case 'jonsson_3cy_02_03_15_21': return Math.min(-30, -cableLossNyquistPositiveDb /* @4GHz in sheet variant */ - 18);
    case 'custom_rule': return -38;
    case 'custom_rule2': return -42;
    default:
      if (typeof input.wireReflectionLimit === 'number') return input.wireReflectionLimit;
      throw new Error(`Unknown wire reflection rule: ${input.wireReflectionLimit}`);
  }
}

function compute(inputOverrides = {}) {
  const input = { ...DEFAULT_INPUTS, ...inputOverrides };
  const usRate = computeSampleRateAndNyquist('us', input);
  const dsRate = computeSampleRateAndNyquist('ds', input);
  const fecUs = computeFecAndRequiredSnr('us', input);
  const fecDs = computeFecAndRequiredSnr('ds', input);
  const fStepHz = input.fMaxHz / input.nSteps;
  const cableLossNyqUsDb = cableLossAtNyquistPositiveDb(input, usRate.nyquistHz, fStepHz);
  const wireEchoDb = selectedWireEchoDb(input, cableLossNyqUsDb);
  const connectorC0 = CONNECTOR_ECHO_C0[input.connectorEchoModel];
  if (connectorC0 == null) throw new Error(`Unknown connector echo model: ${input.connectorEchoModel}`);

  const rows = [];
  let weightedSnrDbUs = 0, weightedSnrDbDs = 0;
  for (let i = 1; i <= input.nSteps; i++) {
    const fHz = i * fStepHz;
    const dF = fStepHz;
    const ilCableDb = channelInsertionLossPerMeterDb(fHz, input.cableModel, input.temperatureC) * input.cableLengthM;
    const ilPcbDb = channelInsertionLossPerMeterDb(fHz, input.pcbModel, input.temperatureC) * input.pcbTraceLengthM;
    const ilDb = ilCableDb + ilPcbDb;
    const txPsdUs = psdMaskDbmPerHz(input.psdMaskUs, 'us', fHz, input, usRate.nyquistHz);
    const txPsdDs = psdMaskDbmPerHz(input.psdMaskDs, 'ds', fHz, input, dsRate.nyquistHz);
    const rxPsdUs = txPsdUs + ilDb;
    const rxPsdDs = txPsdDs + ilDb;
    const connectorEchoDb = input.numberOfConnectors > 0
      ? linearToDb(connectorC0 * fHz + input.numberOfConnectors * 0.00073)
      : -1000;
    const channelEchoDb = linearToDb(dbToLinear(wireEchoDb) + dbToLinear(connectorEchoDb));
    const rxEchoUs = channelEchoDb + txPsdDs;
    const rxEchoDs = channelEchoDb + txPsdUs;
    const echoResUs = linearToDb(
      dbToLinear(rxEchoUs) - dbToLinear(connectorEchoDb + txPsdDs) * (1 - dbToLinear(-input.connectorEchoCancellationDbUs))
    ) - input.cableReflectionEchoCancellationDbUs;
    const echoResDs = linearToDb(
      dbToLinear(rxEchoDs) - dbToLinear(connectorEchoDb + txPsdUs) * (1 - dbToLinear(-input.connectorEchoCancellationDbDs))
    ) - input.cableReflectionEchoCancellationDbDs;
    const linearNoiseUs = dbToLinear(input.afeNoiseDbmPerHzUs) + dbToLinear(echoResUs);
    const linearNoiseDs = dbToLinear(input.afeNoiseDbmPerHzDs) + dbToLinear(echoResDs);
    const noiseUs = linearToDb(linearNoiseUs);
    const noiseDs = linearToDb(linearNoiseDs);
    const snrDbUs = rxPsdUs - noiseUs;
    const snrDbDs = rxPsdDs - noiseDs;
    const inbandUs = fHz > usRate.nyquistHz ? 0 : 1;
    const inbandDs = fHz > dsRate.nyquistHz ? 0 : 1;
    weightedSnrDbUs += inbandUs * snrDbUs * dF;
    weightedSnrDbDs += inbandDs * snrDbDs * dF;
    rows.push({
      fHz, dF, ilCableDb, ilPcbDb, ilDb, txPsdUs, txPsdDs, rxPsdUs, rxPsdDs,
      wireEchoDb, connectorEchoDb, channelEchoDb, rxEchoUs, rxEchoDs, echoResUs, echoResDs,
      noiseUs, noiseDs, snrDbUs, snrDbDs, snrLinearUs: dbToLinear(snrDbUs), snrLinearDs: dbToLinear(snrDbDs),
      inbandUs, inbandDs
    });
  }

  const theoreticalSlicerSnrDbUs = weightedSnrDbUs / usRate.nyquistHz;
  const theoreticalSlicerSnrDbDs = weightedSnrDbDs / dsRate.nyquistHz;
  const estimatedSlicerSnrDbUs = theoreticalSlicerSnrDbUs - input.implementationLossDbUs;
  const estimatedSlicerSnrDbDs = theoreticalSlicerSnrDbDs - input.implementationLossDbDs;

  const modulationUs = getModulation('us', input);
  const modulationDs = getModulation('ds', input);

  return {
    input,
    fStepHz,
    sampleRateHzUs: usRate.sampleRateHz,
    sampleRateHzDs: dsRate.sampleRateHz,
    nyquistHzUs: usRate.nyquistHz,
    nyquistHzDs: dsRate.nyquistHz,
    fecUs,
    fecDs,
    modulationUs,
    modulationDs,
    theoreticalSlicerSnrDbUs,
    theoreticalSlicerSnrDbDs,
    estimatedSlicerSnrDbUs,
    estimatedSlicerSnrDbDs,
    requiredSlicerSnrDbUs: fecUs.requiredSnrDb,
    requiredSlicerSnrDbDs: fecDs.requiredSnrDb,
    snrMarginDbUs: estimatedSlicerSnrDbUs - fecUs.requiredSnrDb,
    snrMarginDbDs: estimatedSlicerSnrDbDs - fecDs.requiredSnrDb,
    wireEchoDb,
    cableLossNyquistDbUs: cableLossNyqUsDb,
    channelInsertionLossNyquistDbUs: -(
      channelInsertionLossPerMeterDb(excelApproxVlookupFrequency(usRate.nyquistHz, fStepHz), input.cableModel, input.temperatureC) * input.cableLengthM +
      channelInsertionLossPerMeterDb(excelApproxVlookupFrequency(usRate.nyquistHz, fStepHz), input.pcbModel, input.temperatureC) * input.pcbTraceLengthM
    ),
    rows
  };
}

if (typeof require !== 'undefined' && require.main === module) {
  const result = compute();
  console.log(JSON.stringify({
    theoreticalSlicerSnrDbUs: result.theoreticalSlicerSnrDbUs,
    estimatedSlicerSnrDbUs: result.estimatedSlicerSnrDbUs,
    requiredSlicerSnrDbUs: result.requiredSlicerSnrDbUs,
    snrMarginDbUs: result.snrMarginDbUs,
    nyquistGHzUs: result.nyquistHzUs / 1e9,
    wireEchoDb: result.wireEchoDb,
    channelInsertionLossNyquistDbUs: result.channelInsertionLossNyquistDbUs,
    cableInsertionLossNyquistDbUs: result.cableLossNyquistDbUs,
    firstRow: result.rows[0]
  }, null, 2));
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    compute,
    DEFAULT_INPUTS,
    CHANNEL_MODELS,
    CONNECTOR_ECHO_C0,
    MODULATION_TABLE,
    normInv,
    chiSqInv,
    psdMaskDbmPerHz,
    channelInsertionLossPerMeterDb,
    excelApproxVlookupFrequency
  };
} else {
  window.compute = compute;
  window.DEFAULT_INPUTS = DEFAULT_INPUTS;
  window.CHANNEL_MODELS = CHANNEL_MODELS;
  window.CONNECTOR_ECHO_C0 = CONNECTOR_ECHO_C0;
  window.MODULATION_TABLE = MODULATION_TABLE;
}

