# دوچ — Sound of Home

An interactive embroidery of Balochi music: 213 Balochi folk songs sewn as
shisha mirrors, each held on the cloth by the six songs from a wider,
2,269-track world dataset that sound closest to it, by cosine similarity on
standardised audio features.

Visit the visitor is the embroiderer — press the cloth and pull the thread to
stitch the dataset in yourself.

**Live:** https://ayanachakzai.github.io/sound-of-home/

## What this is

- `index.html`, `main.js` — the piece itself. Canvas-rendered, no build step,
  no dependencies.
- `data.json` — the prepared dataset (track name, genre, audio features,
  sound-space position) for all 2,482 songs.
- `similarity.json` — precomputed cosine similarity (9 standardised audio
  features, matching the notebook's recommender) between every Balochi song
  and its six closest songs in the wider dataset.
- `CONCEPT.md` — the design notes behind the piece.

The underlying analysis (data collection, Mann-Whitney U tests, K-Means,
PCA, cosine similarity recommender) lives in the accompanying coursework
notebook for *Sound of Home*, MSc Applied Machine Learning for Creatives,
University of the Arts London.
