# The Sound of Home

Balochi folk music is virtually invisible in global music databases. This
project makes it visible: extracting audio features from 213 Balochi tracks,
placing them alongside 2,269 songs from 14 other genres, and building an
interactive embroidery of the result.

**Live site:** https://ayanachakzai.github.io/sound-of-home/

## Structure

- [`the_sound_of_home.ipynb`](the_sound_of_home.ipynb) — the analysis: data
  collection, Mann-Whitney U tests, K-Means clustering, PCA, and a cosine
  similarity recommender between Balochi and world music.
- [`data/`](data) — the underlying datasets (`balochi_tracks.csv`,
  `comparison_genres.csv`, `track_data_final.csv`) and the notebook's saved
  figures.
- [`docs/`](docs) — the interactive visualization: 213 Balochi songs sewn as
  shisha mirrors, each held on the cloth by the six songs from the wider
  dataset that sound closest to it, by cosine similarity on standardised
  audio features. The visitor stitches the dataset in themselves, thread by
  thread. See [`docs/README.md`](docs/README.md) for how it works.

MSc Applied Machine Learning for Creatives, University of the Arts London.
