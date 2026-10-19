// small shared bits for the mint pages: the bouncing throbber and the square progress bar
const mintUI = {
  // fills el with a bouncing pixel comet; returns a stop function
  comet(el, cells = 12) {
    const comet = document.createElement('span');
    comet.className = 'comet';
    const dots = [];
    for (let i = 0; i < cells; i++) dots.push(comet.appendChild(document.createElement('i')));
    el.replaceChildren(comet);
    let pos = 0, dir = 1;
    const tick = () => {
      for (let i = 0; i < cells; i++) {
        const d = (pos - i) * dir;
        dots[i].className = d === 0 ? 'head' : d === 1 ? 'mid' : d === 2 ? 'tail' : '';
      }
      if (pos + dir < 0 || pos + dir >= cells) dir = -dir;
      pos += dir;
    };
    tick();
    const timer = setInterval(tick, 70);
    return () => { clearInterval(timer); comet.remove(); };
  },

  // fills el with a row of square cells; returns set(ratio 0..1)
  bar(el, cells = 22) {
    const bar = document.createElement('div');
    bar.className = 'sqbar';
    const dots = [];
    for (let i = 0; i < cells; i++) dots.push(bar.appendChild(document.createElement('i')));
    el.replaceChildren(bar);
    return (ratio) => {
      const n = Math.round(Math.max(0, Math.min(1, ratio)) * cells);
      for (let i = 0; i < cells; i++) dots[i].className = i < n ? (i === n - 1 ? 'fill edge' : 'fill') : '';
    };
  },

  save(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  },
};
