import { useState, useEffect } from "react";

const NEON = "#ff6b9d";

const CATEGORIES = {
  valute: {
    label: "Valute", icon: "💶",
    units: ["EUR","USD","GBP","JPY","CHF","CAD","AUD","CNY","INR","BTC"],
  },
  lunghezza: {
    label: "Lunghezza", icon: "📏",
    units: ["metro","chilometro","centimetro","millimetro","miglio","yard","piede","pollice","miglio nautico"],
    factors: { metro:1, chilometro:1000, centimetro:0.01, millimetro:0.001, miglio:1609.344, yard:0.9144, piede:0.3048, pollice:0.0254, "miglio nautico":1852 },
  },
  peso: {
    label: "Peso", icon: "⚖️",
    units: ["chilogrammo","grammo","milligrammo","tonnellata","libbra","oncia","carato"],
    factors: { chilogrammo:1, grammo:0.001, milligrammo:0.000001, tonnellata:1000, libbra:0.453592, oncia:0.0283495, carato:0.0002 },
  },
  temperatura: {
    label: "Temperatura", icon: "🌡️",
    units: ["Celsius","Fahrenheit","Kelvin"],
  },
  area: {
    label: "Area", icon: "📐",
    units: ["m²","km²","cm²","mm²","ettaro","acro","miglio²","yard²","piede²"],
    factors: { "m²":1,"km²":1e6,"cm²":0.0001,"mm²":0.000001,"ettaro":10000,"acro":4046.86,"miglio²":2589988,"yard²":0.836127,"piede²":0.092903 },
  },
  velocita: {
    label: "Velocità", icon: "🚀",
    units: ["m/s","km/h","mph","nodi","Mach"],
    factors: { "m/s":1,"km/h":0.277778,"mph":0.44704,"nodi":0.514444,"Mach":340.29 },
  },
  volume: {
    label: "Volume", icon: "🧪",
    units: ["litro","millilitro","m³","cm³","gallone US","pinta","tazza","cucchiaio","cucchiaino"],
    factors: { litro:1, millilitro:0.001, "m³":1000, "cm³":0.001, "gallone US":3.78541, pinta:0.473176, tazza:0.236588, cucchiaio:0.0147868, cucchiaino:0.00492892 },
  },
};

function convertTemp(val, from, to) {
  let celsius;
  if (from === "Celsius") celsius = val;
  else if (from === "Fahrenheit") celsius = (val - 32) * 5 / 9;
  else celsius = val - 273.15;
  if (to === "Celsius") return celsius;
  if (to === "Fahrenheit") return celsius * 9 / 5 + 32;
  return celsius + 273.15;
}

export default function ConvertitoreApp({ c }) {
  const [cat, setCat] = useState("lunghezza");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [valFrom, setValFrom] = useState("1");
  const [valTo, setValTo] = useState("");
  const [rates, setRates] = useState(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState("");

  const category = CATEGORIES[cat];

  useEffect(() => {
    setFrom(category.units[0]);
    setTo(category.units[1]);
    setValFrom("1");
    setValTo("");
  }, [cat]);

  useEffect(() => {
    if (cat === "valute" && !rates) {
      setRateLoading(true);
      fetch("https://api.exchangerate-api.com/v4/latest/EUR")
        .then(r => r.json())
        .then(d => { setRates(d.rates); setRateLoading(false); })
        .catch(() => { setRateError("Impossibile caricare i tassi di cambio."); setRateLoading(false); });
    }
  }, [cat]);

  const convert = (val, fromLeft) => {
    const n = parseFloat(val);
    if (isNaN(n)) { setValTo(""); return; }
    let result;
    if (cat === "temperatura") {
      result = convertTemp(n, fromLeft ? from : to, fromLeft ? to : from);
    } else if (cat === "valute") {
      if (!rates) return;
      const f = fromLeft ? from : to, t2 = fromLeft ? to : from;
      const inEur = n / (rates[f] || 1);
      result = inEur * (rates[t2] || 1);
    } else {
      const factors = category.factors;
      const f = fromLeft ? from : to, t2 = fromLeft ? to : from;
      result = n * factors[f] / factors[t2];
    }
    const res = parseFloat(result.toFixed(8)).toString();
    if (fromLeft) setValTo(res); else setValFrom(res);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { convert(valFrom, true); }, [from, to, rates]);


  const swap = () => {
    const tmpFrom = from, tmpTo = to, tmpVal = valFrom;
    setFrom(tmpTo); setTo(tmpFrom); setValFrom(valTo); setValTo(tmpVal);
  };

  const sel = () => ({
    padding: "10px 12px", borderRadius: 8, border: `1px solid ${c.border}`,
    background: c.inputBg, color: c.text, fontSize: 14, outline: "none", width: "100%",
  });

  const inp = {
    padding: "14px 16px", borderRadius: 10, border: `1px solid ${c.border}`,
    background: c.inputBg, color: c.text, fontSize: 22, outline: "none",
    width: "100%", boxSizing: "border-box", fontVariantNumeric: "tabular-nums",
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Categoria */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {Object.entries(CATEGORIES).map(([id, { label, icon }]) => (
          <button key={id} onClick={() => setCat(id)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer",
            border: `1px solid ${cat === id ? c.accent : c.border}`,
            background: cat === id ? c.accentBg : "transparent",
            color: cat === id ? c.accent : c.textMuted,
          }}>{icon} {label}</button>
        ))}
      </div>

      {rateLoading && <div style={{ color: c.textMuted, fontSize: 13, textAlign: "center" }}>Caricamento tassi di cambio...</div>}
      {rateError && <div style={{ color: NEON, fontSize: 13, textAlign: "center" }}>{rateError}</div>}

      {/* Convertitore */}
      <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: c.textHint, marginBottom: 6, letterSpacing: 1 }}>DA</div>
            <select value={from} onChange={e => setFrom(e.target.value)} style={sel()}>
              {category.units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <button onClick={swap} style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.accentBg, color: c.accent, cursor: "pointer", fontSize: 18, flexShrink: 0 }}>⇄</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: c.textHint, marginBottom: 6, letterSpacing: 1 }}>A</div>
            <select value={to} onChange={e => setTo(e.target.value)} style={sel()}>
              {category.units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <input type="number" value={valFrom} onChange={e => { setValFrom(e.target.value); convert(e.target.value, true); }} style={inp} />
            <div style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}>{from}</div>
          </div>
          <div style={{ color: c.accent, fontSize: 24, flexShrink: 0 }}>=</div>
          <div style={{ flex: 1 }}>
            <input type="number" value={valTo} onChange={e => { setValTo(e.target.value); convert(e.target.value, false); }} style={{ ...inp, color: c.accent }} />
            <div style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}>{to}</div>
          </div>
        </div>

        {cat === "valute" && rates && (
          <div style={{ fontSize: 12, color: c.textHint, textAlign: "center" }}>
            Tassi aggiornati in tempo reale via ExchangeRate-API
          </div>
        )}
      </div>

      {/* Tabella conversioni rapide */}
      {cat !== "valute" && category.factors && (
        <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: c.textHint, marginBottom: 10, letterSpacing: 1 }}>CONVERSIONI RAPIDE DA {from.toUpperCase()}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {category.units.filter(u => u !== from).slice(0, 6).map(u => {
              const n = parseFloat(valFrom) || 1;
              const factors = category.factors;
              const res = parseFloat((n * factors[from] / factors[u]).toFixed(6));
              return (
                <div key={u} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${c.border}`, fontSize: 13 }}>
                  <span style={{ color: c.textMuted }}>{u}</span>
                  <span style={{ color: c.text, fontWeight: 500 }}>{res}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}