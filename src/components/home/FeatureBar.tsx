const FEATURES = [
  {
    label: 'Auto length calculation',
    icon: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8h10M8 3v10" stroke="#EFE8D6" strokeWidth="2"/></svg>,
  },
  {
    label: 'Side A & B balancing',
    icon: <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="4" width="12" height="8" stroke="#EFE8D6" strokeWidth="1.5" fill="none"/><line x1="2" y1="7" x2="14" y2="7" stroke="#EFE8D6" strokeWidth="1"/></svg>,
  },
  {
    label: 'J-Card designer',
    icon: <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" stroke="#EFE8D6" strokeWidth="1.5" fill="none"/><rect x="4" y="4" width="8" height="5" fill="#EFE8D6" fillOpacity="0.4"/></svg>,
  },
  {
    label: 'Print-ready export',
    icon: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 13 L3 6 L8 3 L13 6 L13 13 Z" stroke="#EFE8D6" strokeWidth="1.5" fill="none"/><rect x="6" y="9" width="4" height="4" fill="#EFE8D6" fillOpacity="0.5"/></svg>,
  },
  {
    label: 'No account needed',
    icon: <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5" stroke="#EFE8D6" strokeWidth="1.5" fill="none"/><circle cx="8" cy="8" r="2" fill="#EFE8D6" fillOpacity="0.5"/></svg>,
  },
];

const FeatureBar = () => (
  <div className="lp-feature-bar">
    <div className="lp-feature-bar-inner">
      {FEATURES.map(({ icon, label }, i) => (
        <div key={i} className="lp-feature-pill">
          <div className="lp-pill-icon">{icon}</div>
          {label}
        </div>
      ))}
    </div>
  </div>
);

export default FeatureBar;
