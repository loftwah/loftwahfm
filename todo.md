# LoftwahFM Todo

## Make my own playlist from available songs, or even just have them enabled or disabled? Think of something.

Done: Implemented a local "My Playlist" virtual album.
- Add from anywhere: Use the + button next to any track/video in an album queue.
- Reorder/remove: Open "My Playlist", use Up/Down arrows and X to manage items.
- Persistence: Stored in localStorage under `lfm.playlist` and reflected live.

## Ability to change order of songs in playlist

Done: Up/Down arrows in the "My Playlist" queue reorder items; changes persist.

## Ability to add songs from anywhere to my playlist

Done: + button on queue items adds them to "My Playlist".

## Bug with player controls on smaller android devices

Improved: Elevated the player bar (`z-index: 50`) and made controls larger tap targets.
If further issues persist, provide device details and we can fine-tune spacing.

## Ability to display lyrics from the lyrics.txt in the directory (don't care how this works)

Done: When a `lyrics.txt` exists in an album folder, it's fetched via `/media/<slug>/lyrics.txt` and shown beneath the queue.

## All songs don't count the amount of tracks available, where as the albums do, were could figure this out?

Done: The "All Songs" card now shows total track/video counts aggregated from all albums.

## It is hard to know what state things are like if shuffle or repeat is on. Make sure there is a text indicator of what is going on.

Done: Visible text labels next to Shuffle and Repeat indicate their current state.

