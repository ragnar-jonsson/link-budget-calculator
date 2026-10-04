# AI Agent Guide: Link Budget Calculator Web API

This document provides a complete technical reference for AI agents and automated scripts interacting with the Link Budget Calculator Web API exposed by [`server.ts`](file:///c:/Users/ragna/git/link-budget-calculator/server.ts). 

When using this guide, an AI agent does not need to parse or reverse-engineer the underlying JavaScript source code.

---

## 1. Host & Base Configuration

- **Default Remote Host**: `http://72.60.126.28:3000`
- **Local Fallback Host**: `http://localhost:3000`
- **Data Exchange Format**: JSON (`application/json`)
- **Transport**: HTTP (CORS enabled: `Access-Control-Allow-Origin: *`)

---

## 2. API Endpoints

### 2.1 Health Check / Ping
- **Method**: `GET`
- **Path**: `/ping`
- **Description**: Verifies service availability and latency.
- **Request Body**: None
- **Response**:
  ```json
  { "status": "ok" }
  ```

### 2.2 Calculate Link Budget
- **Method**: `POST`
- **Path**: `/compute`
- **Headers**: `Content-Type: application/json`
- **Description**: Executes the Salz SNR channel capacity calculation engine. Accepts optional parameter overrides. Unspecified parameters automatically fall back to standard baseline defaults (IEEE 802.3ch / 802.3cy reference).
- **Request Body Schema**:
  ```json
  {
    "inputOverrides": {
      "<parameter_name>": "<value>"
    }
  }
  ```
  *(Passing `{}` or `{"inputOverrides": {}}` runs the baseline default configuration).*

- **Response Wrapper**:
  ```json
  {
    "success": true,
    "result": { ... }
  }
  ```
  *(On error, returns HTTP 500 with `{"success": false, "error": "<error_message>"}`).*

---

## 3. Parameter Dictionary (`inputOverrides`)

All parameters are optional in `inputOverrides`.

### 3.1 Link & Transceiver Fundamentals
| Parameter | Type | Default | Description | Valid / Common Values |
| :--- | :--- | :--- | :--- | :--- |
| `dataRateGbpsUs` | number | `10` | Upstream net data rate in Gbps | `2.5`, `5`, `10`, `25` |
| `dataRateGbpsDs` | number | `10` | Downstream net data rate in Gbps | `2.5`, `5`, `10`, `25` |
| `modulationUs` | string | `"PAM4"` | Upstream modulation scheme | `"PAM2"`, `"PAM4"`, `"PAM8"`, `"PAM16"`, `"3B2T"`, `"DME"` |
| `modulationDs` | string | `"PAM4"` | Downstream modulation scheme | `"PAM2"`, `"PAM4"`, `"PAM8"`, `"PAM16"`, `"3B2T"`, `"DME"` |
| `txPowerDbmUs` | number | `0` | Upstream transmit power in dBm | e.g. `-5` to `10` |
| `txPowerDbmDs` | number | `0` | Downstream transmit power in dBm | e.g. `-5` to `10` |
| `psdMaskUs` | string | `"PSD_ZOH"` | Upstream transmit PSD mask model | `"PSD_ZOH"`, `"Butterworth"`, `"PSD_brick"`, `"eq149-14"`, `"eq149-22"` |
| `psdMaskDs` | string | `"PSD_ZOH"` | Downstream transmit PSD mask model | `"PSD_ZOH"`, `"Butterworth"`, `"PSD_brick"`, `"eq149-14"`, `"eq149-22"` |
| `afeNoiseDbmPerHzUs` | number | `-140` | Upstream Analog Front-End (AFE) thermal noise floor | Typical `-145` to `-135` dBm/Hz |
| `afeNoiseDbmPerHzDs` | number | `-140` | Downstream AFE thermal noise floor | Typical `-145` to `-135` dBm/Hz |
| `implementationLossDbUs` | number | `5` | Implementation margin loss deducted from theoretical SNR | Typical `3` to `6` dB |
| `implementationLossDbDs` | number | `5` | Downstream implementation loss in dB | Typical `3` to `6` dB |

### 3.2 Channel Physical Media & Temperature
| Parameter | Type | Default | Description | Valid / Common Values |
| :--- | :--- | :--- | :--- | :--- |
| `cableLengthM` | number | `15` | Total cable length in meters | `1` to `30` |
| `cableModel` | string | `"eq149-18"` | Cable attenuation model equation | See [Table 3.5: Channel Models](#35-available-channel-models) |
| `pcbModel` | string | `"pcb_kadry_3cy_02_0820"` | PCB trace insertion loss model | `"pcb_kadry_3cy_02_0820"`, `"none"` |
| `pcbTraceLengthM` | number | `0.0762` | PCB trace length in meters (default 0.0762m = 3 inches) | e.g. `0` to `0.2` |
| `temperatureC` | number | `20` | Operating temperature in Celsius | `-40` to `125` |

### 3.3 Connectors, Wire Echo & Return Loss
| Parameter | Type | Default | Description | Valid / Common Values |
| :--- | :--- | :--- | :--- | :--- |
| `numberOfConnectors` | number | `4` | Number of in-line connector pairs | `0` to `8` |
| `connectorEchoModel` | string | `"Hard"` | Return loss / echo severity per connector | `"Bad"`, `"Hard"`, `"Good"`, `"Easy"` |
| `connectorEchoCancellationDbUs` | number | `50` | Echo cancellation DSP capability on connectors (dB) | Typical `40` to `60` dB |
| `connectorEchoCancellationDbDs` | number | `50` | Downstream connector echo cancellation (dB) | Typical `40` to `60` dB |
| `cableReflectionEchoCancellationDbUs` | number | `6` | Echo cancellation DSP on cable reflections (dB) | Typical `0` to `12` dB |
| `cableReflectionEchoCancellationDbDs` | number | `6` | Downstream cable reflection echo cancellation (dB) | Typical `0` to `12` dB |
| `wireReflectionLimit` | string / number | `"jonsson*12_08_20"` | Model or static dB for wire reflection limit | `"jonsson*12_08_20"`, `"jonsson*10_14_20"`, `"jonsson_3cy_02_03_15_21"`, `"custom_rule"`, or static dB (e.g. `-35`) |

### 3.4 Duplexing & Timing
| Parameter | Type | Default | Description | Valid / Common Values |
| :--- | :--- | :--- | :--- | :--- |
| `duplexMode` | string | `"Echo Canceled"` | Duplex mode | `"Echo Canceled"` (full duplex), `"Half-Duplex"`, `"Simplex"` |
| `tddDutyCycleUs` | number | `1` | Upstream TDD duty cycle fraction (1.0 = full time) | `0.1` to `1.0` |
| `tddDutyCycleDs` | number | `1` | Downstream TDD duty cycle fraction (1.0 = full time) | `0.1` to `1.0` |

### 3.5 Available Channel Models (`cableModel`)
- `"eq149-18"` (IEEE 802.3ch standard vehicle cable baseline)
- `"Cat5"`, `"Cat5e"`, `"Cat6"`, `"Cat7"`, `"Cat3"`
- `"CR4"`, `"CX31a"`, `"CX174e"`
- `"boyer_3cy_01_10_14_20_c1"`, `"patel_3cy_01_0920"`, `"zimmerman_3cy_01a_1120"`
- `"mueller_3cy_01_10_14_20_target"`, `"mueller_3cy_01_12_01_20_sdp"`, `"mueller_3cy_01_12_01_20_stp"`
- `"koeppendoerfer_3cy_01_10_28_20_sdp3"`, `"neulinger_3cy_01_12_15_20"`
- `"diminico_3cy_01a_1_5_21_26awg"`, `"diminico_3cy_01a_1_5_21_28awg"`
- `"Gianordoli_Silvano_de_Sousa_3cy_01_02_09_21_24awg"`
- `"none"` (ideal lossless cable)

### 3.6 FEC & Simulation Grid
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `targetBer` | number | `1e-12` | Post-FEC Bit Error Rate target |
| `impulseErrorRate` | number | `1e-4` | Uncorrelated impulse error probability |
| `fecBlockSizeUs` | number | `360` | RS-FEC codeword symbol length $N$ |
| `fecDataSizeUs` | number | `326` | RS-FEC data payload symbol length $K$ |
| `fecBitsPerSymbolUs`| number | `10` | Symbol width $m$ (10 bits for RS(360, 326)) |
| `fecCorrectionEfficiencyUs` | number | `1` | FEC efficiency coefficient ($0.0 - 1.0$) |
| `fMaxHz` | number | `9e9` | Grid maximum frequency in Hz (9 GHz) |
| `nSteps` | number | `200` | Number of frequency steps computed |

---

## 4. Response Data Structure (`result`)

The `result` object contains high-level link metrics and the frequency grid breakdown:

```typescript
interface ComputeResult {
  // Key Link Budget Pass/Fail Indicators
  snrMarginDbUs: number;                   // Upstream SNR Margin (dB). Must be >= 0 for link closure.
  snrMarginDbDs: number;                   // Downstream SNR Margin (dB).
  estimatedSlicerSnrDbUs: number;          // Theoretical SNR minus implementationLossDbUs.
  estimatedSlicerSnrDbDs: number;          // Theoretical SNR minus implementationLossDbDs.
  requiredSlicerSnrDbUs: number;           // Slicer SNR required by FEC for target BER.
  requiredSlicerSnrDbDs: number;           // Slicer SNR required by DS FEC.
  theoreticalSlicerSnrDbUs: number;        // Raw Salz weighted in-band SNR (dB).
  theoreticalSlicerSnrDbDs: number;        // Raw DS Salz weighted in-band SNR (dB).

  // Channel & Echo Metrics @ Nyquist
  nyquistHzUs: number;                     // US Nyquist frequency (Hz)
  nyquistHzDs: number;                     // DS Nyquist frequency (Hz)
  sampleRateHzUs: number;                  // US symbol baud rate (Hz)
  sampleRateHzDs: number;                  // DS symbol baud rate (Hz)
  cableLossNyquistDbUs: number;            // Cable insertion loss at Nyquist (dB)
  channelInsertionLossNyquistDbUs: number; // Total insertion loss (Cable + PCB) at Nyquist (dB)
  wireEchoDb: number;                      // Selected wire reflection return loss (dB)

  // FEC Performance Details
  fecUs: {
    correctionSymbols: number;             // t = floor((N - K)/2 * eff)
    avgErrorsPerBlock: number;
    requiredSlicerBer: number;
    requiredSnrDb: number;
    decoderErrorProb: number;
  };

  // Frequency-Domain Grid Profile
  fStepHz: number;                         // Frequency step resolution (Hz)
  rows: Array<{
    fHz: number;                           // Frequency point (Hz)
    ilCableDb: number;                     // Cable loss at fHz (dB)
    ilPcbDb: number;                       // PCB trace loss at fHz (dB)
    ilDb: number;                          // Total insertion loss at fHz (dB)
    txPsdUs: number;                       // Transmit PSD (dBm/Hz)
    rxPsdUs: number;                       // Received signal PSD (dBm/Hz)
    channelEchoDb: number;                 // Total echo return loss (dB)
    echoResUs: number;                     // Residual echo after DSP cancellation (dBm/Hz)
    noiseUs: number;                       // Total noise floor = AFE + residual echo (dBm/Hz)
    snrDbUs: number;                       // In-band SNR at frequency slice (dB)
    inbandUs: 0 | 1;                       // 1 if fHz <= nyquistHzUs, else 0
  }>;
}
```

---

## 5. Primary AI Decision Metric: Link Closure

When optimizing or assessing link feasibility:
1. **Pass Condition**: `snrMarginDbUs >= 0.0` (Recommended production design margin is &ge; `+2.0 dB` or `+3.0 dB`).
2. **Margin Degradation Drivers**:
   - Cable length ($> 15\text{ m}$) &rarr; high insertion loss at high frequencies.
   - Temperature rise ($20^\circ\text{C} \to 105^\circ\text{C}$) &rarr; copper resistance increases attenuation via $\Delta\rho$.
   - Modulation order ($\text{PAM4} \to \text{PAM8}$) &rarr; reduces Baud rate and Nyquist frequency, but requires $+6\text{ dB}$ higher slicer SNR.
   - In-line connectors &rarr; residual echo noise increases with connector count.

---

## 6. Ready-to-Use Agent Scripts

### 6.1 Python Example (Sweep & Optimization)

```python
import json
import urllib.request

API_URL = "http://72.60.126.28:3000/compute"

def compute_link_budget(overrides: dict) -> dict:
    req = urllib.request.Request(
        API_URL,
        data=json.dumps({"inputOverrides": overrides}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        data = json.loads(response.read().decode("utf-8"))
        if not data.get("success"):
            raise RuntimeError(f"API error: {data.get('error')}")
        return data["result"]

# Example: Sweep cable length from 5m to 20m at 10 Gbps PAM4
results = []
for length in range(5, 21, 2):
    res = compute_link_budget({"dataRateGbpsUs": 10, "cableLengthM": length})
    results.append({
        "length_m": length,
        "snr_margin_db": round(res["snrMarginDbUs"], 2),
        "channel_loss_nyq_db": round(res["channelInsertionLossNyquistDbUs"], 2),
        "pass": res["snrMarginDbUs"] >= 0.0
    })

for row in results:
    status = "PASS" if row["pass"] else "FAIL"
    print(f"Cable: {row['length_m']:2d}m | Loss: {row['channel_loss_nyq_db']:5.2f} dB | Margin: {row['snr_margin_db']:+5.2f} dB [{status}]")
```

### 6.2 cURL / Shell Example

```bash
# 1. Health check
curl -s http://72.60.126.28:3000/ping

# 2. Compute custom scenario (10Gbps, 11m, 2 connectors)
curl -s -X POST http://72.60.126.28:3000/compute \
  -H "Content-Type: application/json" \
  -d '{"inputOverrides": {"dataRateGbpsUs": 10, "cableLengthM": 11, "numberOfConnectors": 2}}'
```

### 6.3 PowerShell Example

```powershell
$payload = @{
    inputOverrides = @{
        dataRateGbpsUs = 10
        cableLengthM   = 15
        temperatureC   = 85
    }
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://72.60.126.28:3000/compute" -Method Post -Body $payload -ContentType "application/json"
Write-Output ("SNR Margin: {0:N2} dB" -f $response.result.snrMarginDbUs)
Write-Output ("Channel Loss @ Nyquist: {0:N2} dB" -f $response.result.channelInsertionLossNyquistDbUs)
```

### 6.4 Node.js / Deno / Browser Fetch Example

```javascript
const response = await fetch("http://72.60.126.28:3000/compute", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    inputOverrides: {
      dataRateGbpsUs: 25,
      modulationUs: "PAM4",
      cableLengthM: 11
    }
  })
});
const { success, result, error } = await response.json();
if (success) {
  console.log(`US Margin: ${result.snrMarginDbUs.toFixed(2)} dB`);
} else {
  console.error("Compute error:", error);
}
```

### 6.5 Standard IEEE Profiles

#### IEEE 802.3ch (10GBASE-T1)
- Net Data Rate: `10 Gbps`
- Modulation: `PAM4` (2 bits/symbol)
- FEC: `RS(360, 326)` with $m=10$ bits (`fecBlockSizeUs: 360`, `fecDataSizeUs: 326`, `fecBitsPerSymbolUs: 10`)
- Baud Rate: `5.625 GBd` (Nyquist: `2.8125 GHz`)
- Required Slicer SNR: `17.20 dB`

#### IEEE 802.3cy (25GBASE-T1)
- Net Data Rate: `25 Gbps` (`dataRateGbpsUs: 25`, `dataRateGbpsDs: 25`)
- Modulation: `PAM4` (2 bits/symbol)
- FEC: `RS(936, 846)` with $m=10$ bits (`fecBlockSizeUs: 936`, `fecBlockSizeDs: 936`, `fecDataSizeUs: 846`, `fecDataSizeDs: 846`, `fecBitsPerSymbolUs: 10`)
- Wire Reflection Rule: `"jonsson_3cy_02_03_15_21"`
- Baud Rate: `14.0625 GBd` (Nyquist: `7.03125 GHz`)
- Required Slicer SNR: `16.27 dB` (yielding $\approx 0.93\text{ dB}$ higher coding gain over RS(360, 326))

---

## 7. Typical Experiment Templates for Agents

When requested to run experiments, an agent can immediately execute one of these standard archetypes:

1. **Maximum Reach Search (Binary Search)**:
   - Target: Find maximum `cableLengthM` where `snrMarginDbUs >= 0.0`.
   - Modulate: `dataRateGbpsUs` (2.5, 5, 10, 25).
2. **Modulation Order Trade-Off Analysis**:
   - Compare `PAM2`, `PAM4`, `PAM8` for a given throughput.
   - Compare `nyquistHzUs` (lower for higher PAM) vs `requiredSlicerSnrDbUs` (higher for higher PAM).
3. **Automotive Temperature Qualification**:
   - Fix length at `11m` or `15m`.
   - Sweep `temperatureC` across `-40`, `25`, `85`, `105`, `125` °C.
4. **Connector Topology Budgeting**:
   - Vary `numberOfConnectors` from `0` to `6` and `connectorEchoModel` (`Good` vs `Hard` vs `Bad`).
   - Observe residual echo floor rise in `noiseUs` and subsequent margin drop.
