const NEON = "#ff6b9d";

export default function Toggle({ on, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 48, height: 26, borderRadius: 13,
        background: on ? NEON : "#444",
        cursor: "pointer", position: "relative",
        transition: "background .3s", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 3,
        left: on ? 24 : 3, width: 18, height: 18,
        borderRadius: "50%", background: "#fff",
        transition: "left .25s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
      }}/>
    </div>
  );
}