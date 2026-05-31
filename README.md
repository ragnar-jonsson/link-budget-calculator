# Link Budget Calculator

An interactive, link budget calculator based on Salz SNR calculations and channel insertion loss models. This application provides interactive transmission line SNR calculations for standards like **IEEE 802.3ch** (Multi-Gig Automotive Ethernet), **IEEE 802.3cy** (25G Automotive Ethernet), and **IEEE 802.3dm** (Asymmetrical Automotive Ethernet).

---

## 📖 Interactive User Manual
For a detailed breakdown of the mathematical engine, parameter directories, and output indicators, open the local user manual directly in your browser:
* **[User Manual](user_manual.html)** (interactive sidebar navigation, ScrollSpy, and searchable parameter dictionary)

---

## 🚀 Key Features

* **Baseband Channel Capacity Calculator**: Complete JS translation of core transmission line capacity equations including insertion loss fits (cable and PCB), connector count echo levels, reflection return limits, and AFE thermal noise floors.
* **Dual Directional FEC & Baud Scaling**: Supports independent Forward Error Correction block length ($N$), payload data symbol size ($K$), and efficiency settings for the **Upstream (US)** and **Downstream (DS)** paths.
* **TDD Duty Cycle Configurations**: Time Division Duplexing (TDD) duty cycle sliders automatically scale symbol Baud rates and Nyquist frequencies to maintain target throughput margins.
* **Interactive Waveform Charts**: Smooth, high-contrast curves (powered by Chart.js) depicting:
  1. **Signal-to-Noise Ratio (SNR)** profiles vs. Frequency.
  2. **Insertion Loss Profiles** separating Cable Loss, PCB Loss, and Total Channel Loss.
  3. **Transmit Power Spectral Density (PSD)** mask shapes (e.g. ZOH, Butterworth, eq149-14, eq149-22).
* **JSON Configuration Backup**: Instant buttons to **Save Config** (downloads current inputs state as a `.json` backup) and **Load Config** (restores parameters and triggers debounced live recalculations).
* **Print-Ready HTML Reports**: Generates custom, standalone, print-friendly HTML summaries embedding light-themed high-resolution offscreen chart waveforms.

---

## 🛠️ Installation & Usage

1. Clone or download the repository to your local directory.
2. Open **[index.html](index.html)** in any modern web browser.
3. Adjust simulation parameters in the sidebar to see live, real-time recalculations on margins, baud rates, and waveforms.

---

## 🎓 Acknowledgments & Credits

* **Calculation Baseline**: This simulator's core calculation logic is inspired by and partially based on the **IEEE 802.3cy Channel Capacity Calculator** spreadsheet created by Ragnar Jónsson:
  * [jonsson_3cy_01_04_20_21.xlsx](https://www.ieee802.org/3/cy/public/adhoc/jonsson_3cy_01_04_20_21.xlsx)
* **Development**: Developed and integrated with the help of **Antigravity**, an advanced agentic coding assistant designed by the **Google DeepMind** team.
