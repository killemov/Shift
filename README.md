Shift is a minimalistic approach to maximum control of your Transmission.
=====

*Shift is targeted at Mozilla Firefox 4+ with degraded and untested functionality for other or older browsers.*

## Column based sorting and filtering.

Click on the name in a column header and the table will be sorted by that column. Click on it again and the sorting order is reversed.

* Torrents:
Click on the LED in the column header, next to the name and filtering input options are shown. By default only torrents currently downloading are shown and are sorted by percentDone in descendent order.
* Files:
The sorting of files contained in the torrent works similarly but with a twist or two. The first twist is that files are sorted by the given column and then the tree structure is changed to match the new sort order. The other twist is in the name column. By default it is sorted by torrent order in the exact sequence of files contained in the torrent. Click on the name column header and it is sorted by tree order, alphabetically and nested. If the files were added to the torrent in proper tree order then the view will not change.

## Improved files management.

Double-click on a torrent row or select Details from the torrent context menu, the LED on the left\*, to view the files contained in the torrent. The files are shown in a tree-like structure, with the important addition that this structure is fully functional. Change the download priority (high, normal, low, none) on a node, again from the context menu, and all subnodes are assigned the same priority. Oh, and you CAN change the priority of already downloaded files.

<sup>\* The LED also doubles as a selection indicator for batch commands, except Announce, Detail and Select.</sup>

## FILES WITHIN TORRENTS ARE LINKED!

... If they are 100% complete? No! Click on a file in a torrent and you will get a link to it. You do need to configure some base URLs first, but then the possibilities are ginormous. ( example: ftp://myname@myserver/mydownloads/... ). And even though the Transmission daemon is not meant to be used as a webserver, it IS possible to have it serve the linked file! You do need some clever file placement and/or symbolic linking for that to work, though. I recommend using a reverse proxy for serving the files.

## Improved drag & drop interface.

Drop files and links on the Shift page. Currently supported are torrent files and text files containing links. (Yes, magnets are also links.)

## Change less means more.

Why reload semi-static data each and every AJAX call? Shift tries to minimize the data consumption from Transmission. This means using less bandwidth and less processing for Transmission. Because of this saving the smaller requests can be made more often. Shift also works hard to not update cell data when it doesn't need to.

## Open for mutilation.

* "I really loved your old-skool green-on-black theme, just loved it!" No problemo, it is still around but has been renamed to terminal.css.
* "I really need to have a column to show the eta of the torrents." Then you need to add or change the eta entry in the torrentColumns object. Example for doneDate:

```javascript
var updateTorrentFields = [... , "doneDate", ...];
var torrentColumns = {
  ...
  "doneDate": {
    label: "Finished", readOnly: true, render: function( date ) {
      return date ? renderDateTime( date ) : "";
    }
  },
  ...
}
```
* "This functionality doesn't work on Google Chrome\*." Ah, then you(!) have some 'splaining to do... and probably some work as well.

<sup>\* Swap in your favorite browser here.</sup>

## Interesting stuff for later.

* Blocklist
* Session stats + graphs
* Torrent stats + graphs
