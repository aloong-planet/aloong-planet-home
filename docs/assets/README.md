# Website assets

Shipping assets are under assets/. sources.json records their origin and SHA256 hashes. Original portrait photographs are not included; the user-supplied transparent seated illustration is retained unchanged as the source, and the homepage ships a 780×1170 WebP reduced from it, three times its displayed size. portrait-prompt.txt records the earlier illustration prompt and is not the provenance of the current supplied asset. The dog sprite manifest assets/golden-wag/config.json records sprite sizes and hashes. The three motion sheets are lossy WebP at quality 82, re-encoded from the lossless sheets of commit ba6ad2e with dwebp, then cwebp -q 82 -alpha_q 100 -m 6 -sharp_yuv (libwebp 1.6.0); the lossless sheets remain in Git history.

Transfer is a synthetic white-theme product screenshot; Agentshed is the supplied 90-day view. Earlier screenshots and duplicate sprites remain in the original local workspace. The isolated Transfer fixture is not a production data source.
