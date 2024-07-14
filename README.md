Shift is a minimalistic approach to maximum control of your Transmission.
===

> [!WARNING]
> There have been some major changes in Shift. These changes were pushed on 2024.07.15. If you have made changes to shift.js, try to move these changes to shift_gear.js before your next pull if possible. It is very likely that automatic merging with your code will fail.

Shift is a web interface for transmission-daemon. It is a complete implementation of the [Transmission RPC specification](https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md). It handles 10k+ torrents so you can manage all of your hosted Linux distribution torrents with a browser.

*Shift is targeted at desktop Mozilla Firefox with degraded and untested functionality for other or older browsers.*

<figure>
<img src="https://user-images.githubusercontent.com/932370/49582327-0074ef80-f955-11e8-93e8-8f305621f30a.png" alt="Torrents view"/>
<figcaption>Torrents view</figcaption>
</figure>

## Installation.

###### Prerequisite: You have a working installation of Transmission and you can access the web interface.

* Download the zip file from github and unzip on your machine where transmission-daemon resides. (Or use `git clone` for future easy updating.)
* Verify that transmission-daemon has proper access to the files. (See `chmod` and/or `chown`.)
* Set the [TRANSMISSION_WEB_HOME](https://github.com/transmission/transmission/wiki/Environment-Variables) environment variable to the path to where you placed the Shift files. Example:
```bash
export TRANSMISSION_WEB_HOME=/my/path/to/the/unzipped/dir
```
*   If transmission-daemon is executed from a script you should put the export command in there.
*   If transmission-daemon is executed from systemd you should add an Environment line there. Example:
```service
[Service]
...
Environment=TRANSMISSION_WEB_HOME=/my/path/to/the/unzipped/dir
...
```
* (Re)start transmission-daemon.
* Once started any changes to index.html, shift.js or any other file will be picked up after a page reload/forced refresh.

## Drag & drop torrents.

You can drop multiple files and links anywhere on the Shift page. Currently supported are torrent files, torrent links, magnet links and text files containing torrent links or magnet links. Using the [FileReader API](https://developer.mozilla.org/en-US/docs/Web/API/FileReader) for uploading torrents to transmission-daemon was invented here.
<br>See [Can I use](https://caniuse.com/#search=filereader) for browser compatibility.

## Label your stuff (LabelMatically).

You can add labels to a torrent or a selection of torrents. Just open the labels filter, grab a label and drop it on a torrent. If a selection is active the label will be added to all torrents in that selection. You can reorder labels by dragging and dropping within the label bar. You can remove any label anywhere by dragging and dropping it on the trash can. Any changes made to the label bar will be saved instantly. There is a second, dynamic, label bar that contains unknown labels encountered during the rendering of torrent rows. You can make an unknown label known by dragging it to the primary label bar. If you have enabled the LabelMatic, any new torrents will get processed for label application as long as you keep Shift open.

You can style labels any way you want. Use `text-rendering: unset;` as a marker to prevent text rendering. The provided images are for demonstration purposes only. You can replace them with whatever you like. If you believe an image should be replaced or added to the collection, post it [here](https://github.com/killemov/Shift/issues/27).

## Paths! Paths! Paths!

For the few of us who use more than just the default download location enter the path selector. No more free-form error-prone typing of paths ... unless you still want to. Go to the Shift settings to edit the collection of paths. You can scrape previously used download locations from torrents. You can also use scrape to (de)select torrents from a specific location. After applying the changes the list of paths is used where torrent locations can be set. If you want to use a custom path select the &hellip; option (ellipsis) and work from the previously selected path. If you change your mind just clear the input box and the select box will reappear. Please note that when the Shift configuration is stored in a cookie, that storage is limited to about 4K. You can either move paths to shift.json or use `localStorage` which do not have this limit.

## Files not found? Remove + re-add? Recycle!

In rare cases a started torrent that stopped before any files could be written to disk cannot be restarted by Transmission. (You would never delete files yourself, right?) You can only remove and re-add the torrent to continue downloading the payload. If you have configured torrentLink properly and you can download a torrent file from the torrent details page a Recycle option will be available in the torrents context menu of the main torrents view.

## Move content server-side.

You can (batch!) move your torrent content on the server with Shift. Select one or more torrents and select Relocate from the menu or go to the details page of a torrent and change the "downloadDir" property. The "Move" indicator needs to be active to actually move the data. An advanced version to substitute paths with whatever is available. Be aware that moving content across file-system boundaries takes resources away from other tasks on the server, including transmission-daemon itself. Beware of servercide.

## Hello darkness ...

You can join the dark side by selecting "Dark" next to the style sheet selector in the Shift settings. Or ... you will join automatically because Shift follows the browser which follows the OS. For own-rolled style sheets: A "dark" class is added to the "html" tag and then by default a negative filter is applied to the entire page. Style sheets that are dark by nature should override this style to do nothing.

## Column based sorting and filtering.

Click on the name in a column header and the table will be sorted by that column. Click on it again and the sorting order is reversed. Click on the LED in the column header, next to the name, and filtering input options are shown. By default only torrents currently downloading are shown and are sorted by percentDone in descending order. When you change the value of the "Status" filter the column view changes also to better suit the context of the filtered torrents.

## Files management.

* **Sorting**
The sorting of files contained in the torrent works similar to the sorting of torrents but with a twist or two. The first twist is that files are sorted by the given column and then the tree structure is changed to match the new sort order. The other twist is in the name column. By default it is sorted by torrent order in the exact sequence of files contained in the torrent. Click on the name column header and it is sorted by tree order, alphabetically and nested. If the files were added to the torrent in proper tree order then the view will not change.

* **Priorities**
Double-click on a torrent row to view the files contained in the torrent. The files are shown in a tree-like structure, with the important addition that this structure is fully functional. Change the download priority (high, normal, low, none) on a node, again from the context menu, and all sub-nodes are assigned the same priority. Oh, and you CAN change the priority of already downloaded files.

* **(Batch) Renaming**
You can rename files within a torrent. Be warned that when you remove a torrent with renamed files and later re-add the same torrent the renamed files will not be found when checking for existing content.

* **Links**
Files and folders in torrents can be downloaded or displayed directly from Shift, even if the files are not 100% complete. Go to Session/Shift to configure a base URL to be used as a prefix for the content or folders, ftp://myname@myserver/mydownloads/  for example. To make the complete URLs work you still need to install and configure a web/ftp/... server such as [Lighty](https://www.lighttpd.net/) to serve the file. Be warned that this is not for the novice user.
For testing purposes you could use transmission-daemon itself to serve the linked file. You need file-system access and enough permissions for some clever file placement and/or symbolic linking to make that work, though.
<sub>Hint: The files that make up the web interface for transmission-daemon are also stored somewhere on the server.</sub>

<figure>
<img src="https://user-images.githubusercontent.com/932370/38288439-12f2fb66-37d1-11e8-9a12-37aad2dfe95c.png" alt="Torrent details"/>
<figcaption>Torrent details</figcaption>
</figure>

## Future/feature proof-ish.

The session configuration and shift configuration pages are dynamically generated from the data itself. So when developers add a simple field to the data, Shift will automagically display it and make it editable. Only if you, developer, need to hide a field, make it read-only or make it special/complex then you need to edit the shift.js file. If you activate "Copy to clipboard" and click "Apply", the data will be available in JSON format for pasting in any text editor.

## Session configuration

<figure>
<img src="https://cloud.githubusercontent.com/assets/932370/12071322/ff3b78fa-b0a5-11e5-9ee8-195593a59364.png" alt="Session configuration"/>
<figcaption>Session configuration</figcaption>
</figure>

## Shift configuration

<figure>
<img src="https://user-images.githubusercontent.com/932370/50279656-9d9e5080-044a-11e9-9d63-c73b7f9e0553.png" alt="Shift configuration"/>
<figcaption>Shift configuration</figcaption>
</figure>

Shift has some configuration parameters for the interface itself. They are stored in shift.json server-side and in a [cookie](https://en.wikipedia.org/wiki/HTTP_cookie) in your browser. Currently the interface can only update and persist the configuration in the cookie. You will need to manually update the shift.json file on the server to make it permanent across sessions and browsers.
<br>
<table>
<tbody>
<tr><td><b>contentMagic</b></td>
<td>Show cover art in main torrents view.</td>
</tr>
<tr><td><b>dark</b></td>
<td>Force dark mode.</td>
</tr>
<tr><td><b>deleteTorrentLabelByKey</b></td>
<td>Allow the current focussed label to be deleted with <kbd>**Del**</kbd>.</td>
</tr>
<tr><td><b>notificationLevel</b></td>
<td>Receive browser notifications for certain events or errors. The higher the level the more types of notification will be displayed.</td>
</tr>
<tr><td><b>registerMagnetHandler</b></td>
<td>Registers Shift as the <a href="https://developer.mozilla.org/en-US/docs/Web/API/Navigator/registerProtocolHandler/Web-based_protocol_handlers">protocol handler</a> for magnet links.</td>
</tr>
<tr><td><b>replaceMagnet</b></td>
<td>Replace a previously added magnet with the newly added torrent if it matches.</td>
</tr>
<tr><td><b>soundDone</b></td>
<td>A URL to any supported audio file or empty for a generated beep sound.</td>
</tr>
<tr><td><b>torrentLink</b></td>
<td>A URL prefix to the torrentFile attribute in the torrent details to make it a complete URL. This is a prerequisite to activate the Recycle function to remove and re-add the torrent.</td>
</tr>
<tr><td><b>torrentLinkEnabled</b></td>
<td>This makes the torrentFile attribute in the torrent details a link. (Needs <b>torrentLink</b>.)</td>
</tr>
</tbody>
</table>

Shift has some additional functionality on the Shift configuration page. The page must remain open to allow actions to finish as they are completely client-side/JavaScript driven.<br>

<table>
<tbody>
<tr><td><b>labelMaticEnabled</b></td>
<td>Click "Activate Now" to apply the labelMaticRules to all torrents.</td>
</tr>
<tr><td><b>minSeeders</b></td>
<td>Stop seeding torrents that have more than a minimum number of seeders.</td>
</tr>
<tr><td><b>trackers</b></td>
<td>Batch add/remove/replace tracker URLs to all torrents.</td>
</tr>
<tr><td><b>Set queue positions </b></td>
<td>Every time Transmission is started the torrents are queued seemingly random. Clicking "Date" reorders the torrents queuePositions by addedDate.</td>
</tr>
</tbody>
</table>

## Keyboard navigation.

* **General**

| Key                                        | Action                    |
| -----------------------------------------: | :------------------------ |
| <kbd>**Up**</kbd>                          | Activate row up           |
| <kbd>**Down**</kbd>                        | Activate row down         |
| <kbd>**Esc**</kbd>                         | Close popup / dialog      |
| <kbd>**Enter**</kbd>                       | Confirm popup / dialog    |
| <kbd>**Space**</kbd>                       | Select / Deselect         |
| <kbd>**1**</kbd>..<kbd>**0**</kbd>         | (Reverse) Sort column     |
| <kbd>**Shift + 1**</kbd>..<kbd>**0**</kbd> | Sort column ascending     |
| <kbd>**?**</kbd>                           | About                     |

* **Torrent view**

| Key                                       | Action                               |
| ----------------------------------------: | :----------------------------------- |
| <kbd>**a**</kbd>                          | Show all torrents                    |
| <kbd>**c**</kbd>                          | Show checking (/waiting) torrents    |
| <kbd>**d**</kbd>                          | Show downloading (/waiting) torrents |
| <kbd>**s**</kbd>                          | Show stopped torrents                |
| <kbd>**u**</kbd>                          | Show uploading (/waiting) torrents   |
| <kbd>**Del**</kbd>                        | Remove torrent                       |
| <kbd>**Shift + Del**</kbd>                | Trash torrent                        |
| <kbd>**[**</kbd>                          | Store selection                      |
| <kbd>**]**</kbd>                          | Restore selection                    |
| <kbd>**\\**</kbd>                         | Select visible torrents              |
| <kbd>**\|**</kbd>                         | Deselect visible torrents            |
| <kbd>**Ctrl + 1**</kbd>..<kbd>**9**</kbd> | Show/hide column filter              |

## Open for mutilation.

** "I really loved your old-skool green-on-black theme, just loved it!" **

No problemo, it is still around but has been renamed to terminal.css. You can change the Session/Shift/styleSheet attribute.

** "I really need to have a column to show the eta of the torrents." **

~~Then you need to add an "eta" entry in the torrentColumns object and you need to invoke a specific renderer for it because it is communicated as an interval in seconds. To make it visible and have it regularly updated for status "Downloading" also add the entry to the columns array. It should already be there in the fields array.~~
<br>Now this has become somewhat harder to do since Shift 1.2 because the column and field arrays have been removed from the `torrentStatus` object. They have been replaced by an `sb` field containing status bits in both the corresponding field object and the subsequent `_column` object respectively.

```Javascript
const torrentFields = {
  ...
  "eta": {
    sb: 33, // Bits for status "All" and "Downloading"
    _column: {
      sb: 33, // Bits for status "All" and "Downloading"
      label: "ETA",
      render: function( seconds ) {
        return seconds ? renderDateTime( Date.now() / 1000 + seconds ) : "";
      }
    }
  },
  ...
}
```

You also need to add a width style that fits the data.
```css
col.eta: { width: 100px }
```

You can add a filter object or an eventhandler to the `_column` object.

** "This functionality doesn't work on Google Chrome\*." **

Ah, then you(!) have some 'splaining to do... and probably some work as well.
<sup>\* Swap in your favorite browser here.</sup>

This work is licensed under a [Creative Commons Attribution-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-sa/4.0/).
 [![enter image description here](https://licensebuttons.net/l/by-sa/4.0/88x31.png)](http://creativecommons.org/licenses/by-sa/4.0/)
