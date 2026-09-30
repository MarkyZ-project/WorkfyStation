export default function Toggle({ on, onToggle, color = "#ffffff", dark = true }) {
  const isBW = color === "#ffffff" || color === "#000000" || color.toLowerCase() === "#fff";
  const activeBg = isBW ? (dark ? "#ffffff" : "#000000") : color;
  const inactiveBg = dark ? "#2a2a2a" : "#d4d4d8";
  const thumbColor = on && isBW ? (dark ? "#000000" : "#ffffff") : "#ffffff";

  return (
    <div
      onClick={onToggle}
      style={{
        width: 48, height: 26, borderRadius: 13,
        background: on ? activeBg : inactiveBg,
        cursor: "pointer", position: "relative",
        transition: "background .25s ease", flexShrink: 0,
        boxShadow: on && !isBW ? `0 0 10px ${color}66` : "none",
      }}
    >
      <div style={{
        position: "absolute", top: 3,
        left: on ? 25 : 3, width: 20, height: 20,
        borderRadius: "50%", background: thumbColor,
        transition: "left .22s cubic-bezier(.16,1,.3,1)",
        boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
      }}/>
    </div>
  );
}