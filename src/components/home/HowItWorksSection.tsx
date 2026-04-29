const STEPS = [
  {
    number: '01',
    title: 'Build your tracklist',
    desc: 'Search for songs to add using Spotify results. Adding the songs will automatically calculate the time left on the cassette making it easy to fill the list with the perfect amount and length of songs',
    tag: 'Mixtape Editor',
  },
  {
    number: '02',
    title: 'Fine-tune the sequence',
    desc: 'Rearrange tracks by dragging them up and down. Balance both sides so neither ends with dead air. Obsess over the running order — it matters.',
    tag: 'Mixtape Editor',
  },
  {
    number: '03',
    title: 'Design your J-Card',
    desc: 'Switch to the J-Card designer, upload cover art, add your title and tracklist, style the spine — then export a print-ready PDF sized to fold into a standard cassette case.',
    tag: 'J-Card Designer',
  },
];

const HowItWorksSection = () => (
  <section id="how-it-works" className="lp-how">
    <div className="lp-section-inner">
      <div style={{ textAlign: 'center', marginBottom: '52px' }}>
        <div className="lp-section-label" style={{ color: 'var(--color-mustard)', letterSpacing: '3px' }}>Process</div>
        <div className="lp-section-title" style={{ color: 'var(--color-paper)', marginTop: '8px' }}>How it works.</div>
      </div>
      <div className="lp-steps-grid">
        {STEPS.map(({ number, title, desc, tag }) => (
          <div key={number} className="lp-step">
            <div className="lp-step-number">{number}</div>
            <div className="lp-step-title">{title}</div>
            <p className="lp-step-desc">{desc}</p>
            <div className="lp-step-tag">{tag}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
