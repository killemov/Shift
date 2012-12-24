/**
 * Shift: a Transmission web interface.
 *
 * © 2012 Killemov.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 3.0 Unported License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/3.0/ or send a
 * letter to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.
 */

try {
  console.assert( 1 );
}
catch( e ) {
  var alertFunction = function( msg ) {
    alert( msg );
  }
  var ignore = function(){};
  console = {
    assert: ignore,
    clear: ignore,
    count: ignore,
    debug: ignore,
    dir: ignore,
    dirxml: ignore,
    error: alertFunction,
    exception: alertFunction,
    group: ignore,
    groupCollapsed: ignore,
    groupEnd: ignore,
    info: ignore,
    log: ignore,
    memoryProfile: ignore,
    memoryProfileEnd: ignore,
    profile: ignore,
    profileEnd: ignore,
    table: ignore,
    time: ignore,
    timeEnd: ignore,
    timeStamp: ignore,
    trace: ignore,
    warn: ignore
  }
}


Object.extend( Object, {
  isBoolean: function( value ) {
    return typeof value === "boolean";
  },
  isEmpty: function( value ) {
    for( var k in value ) {
      if ( Object.prototype.hasOwnProperty.call( value, k ) ) {
        return false;
      }
    }
    return true;
  }
} );

function prepare( s )
{
  return s ? s.toLocaleLowerCase().replace( noAlphanumeric, " " ) : s;
}

Object.extend( Array.prototype, {
  concatUnique: function( element ) {
    if ( Object.isArray( element ) ) {
      var self = this;
      element.each( function( element ) {
        self.pushUnique( element );
      } )
    }
    else {
      this.pushUnique( element );
    }
    return this;
  },

  insert: function( index ) {
    this.length = ( index > this.length ) ? index : this.length;
    index = ( index < 0 ) ? this.length : index;

    this.splice.apply( this, [index, 0].concat( Array.slice( arguments, 1 ) ) );
    return this;
  },

  pushUnique: function( element ) {
    if ( !this.include( element ) ) {
      this.push( element )
    }
    return this;
  },

  remove: function( element ) {
    for( var i = 0, len = this.length; i < len; ++i ) {
      if ( this[i] == element ) {
        this.splice( i, 1 );
        break;
      }
    }
    return this;
  },

  // Counter unstable Array.sort with additional index. ( a.i == null ? 0 : ( a.i - b.i ) )
  sortByProperty: function( property, order, isString ) {
    this.sort( isString ? function( a, b ) {
      var aa = prepare( a[property] );
      var bb = prepare( b[property] );
      return aa == bb ? ( a.i == null ? 0 : ( a.i - b.i ) ) : bb == null ? -1 : bb.localeCompare( aa ) * ( order ? -1 : 1 );
    } : function( a, b ) {
      var aa = a[property];
      var bb = b[property];
      return aa == bb ? ( a.i == null ? 0 : ( a.i - b.i ) ) : bb == null || ( order ? aa < bb : bb < aa ) ? -1 : 1;
    } );
  }
} );

var COOKIE_KEY = "shift.settings=";
var HEADER_TRANSMISSION = "X-Transmission-Session-Id";

var updateTorrentFields = ["eta", "id", "percentDone", "rateDownload", "rateUpload", "status"];

function newRequest( method, arguments, onSuccess, properties ) {
  var request = {
    parametersObject: {
      method: method ? ( method ) : "",
      arguments: arguments ? ( arguments ) : {}
    }
  }
  if ( onSuccess ) {
    request.onSuccess = onSuccess;
  }
  if ( properties ) {
    Object.extend( request, properties );
  }
  return request;
}

function newPeriodicalUpdater( method, interval, onSuccess, fields, ids ) {
  return newRequest( method, fields ? {
    fields: fields, ids: ids ? ids : []
  } : null, onSuccess, {
    container: "torrentBody",
    frequency: interval,
    decay: 1,
    onFailure: onFailure
  } );
}

function getArguments( response ) {
  globals.lastResponse = response;
  return response.responseJSON.arguments;
}

var globals = {
  magnets: [],
  torrents: [],
  removed: [],
  torrentHash: {},
  columnHash: {},
  rpcUrl: "/transmission/rpc",
  requestHeaders: [ HEADER_TRANSMISSION, "" ],

  shift: {
    version: "0.9.4",

    updateTorrents: newPeriodicalUpdater( "torrent-get", 1, function( response ) {
      var arguments = getArguments( response );

      if ( arguments.removed ) {
        arguments.removed.each( removeTorrentById );
      }
      if ( arguments.torrents ) {
        updateTorrents( arguments.torrents );
        filterTorrents();
        if ( globals.activeTableId == "torrentTable" ) {
          sortTorrents();
          renderTorrents();
        }
      }
    }, updateTorrentFields, "recently-active" ),

    updateStats: newPeriodicalUpdater( "session-stats", 5, function( response ) {
      updateFields( globals.shift.sessionStats = getArguments( response ) );
    } ),

    updateSession: newPeriodicalUpdater( "session-get", 60, function( response ) {
      updateFields( globals.shift.session = getArguments( response ) );
    } )
  }
}

var filePriority = { "high": { label: "+" } , "normal": { label: " " }, "low": { label: "-" }, "none": { label: "" } };
var filePriorityKeys = Object.keys( filePriority );
var noAlphanumeric = new RegExp( "\\W", "g" );
var torrentRegexp = /(\b(https?|ftp|magnet):\/?\/?[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|])/ig;
var dropCount = 0;

var sessionFields = {
  "config-dir": { readOnly: true },
  "download-dir-free-space": { readOnly: true, render: renderSize },
  "encryption": { values: ["required", "preferred", "tolerated"] },
  // actions return true if handling should continue.
  "peer-port": { action: function( row, keyCell, valueCell, o ) {
    var l = rLed( false, { id: "port-is-open", style: "float: right", title: "Checking", readonly: true } );
    keyCell.insert( l );
    doRequest( newRequest( "port-test", {}, function( response ) {
      updateFields( getArguments( response ) );
    } ) );

    return true;
  } },
  "rpc-version": { readOnly: true },
  "rpc-version-minimum": { readOnly: true },
  "version": { readOnly: true }
}

var torrentActions = {
  "start": { label: "Start", method: "torrent-start" },
  "stop": { label: "Stop", method: "torrent-stop" },
  "details": { label: "Details", method: "torrent-get" },
  "announce": { label: "Announce", method: "torrent-reannounce" },
  "verify": { label: "Verify", method: "torrent-verify" },
  "trash": { label: "Trash", method: "torrent-remove" },
  "remove": { label: "Remove", method: "torrent-remove" },
  "add": { label: "Add", method: "torrent-add" },
  "get": { label: "Get", method: "torrent-get" },
  "set": { label: "Set", method: "torrent-set" }
}

var torrentFields = {
  "activityDate": { readOnly: true, render: renderDateTime },
  "addedDate": { readOnly: true, render: renderDateTime },
  "bandwidthPriority": {},
  "comment": { readOnly: true },
  "corruptEver": { readOnly: true, render: renderSize },
  "creator": { readOnly: true },
  "display": { ignore: true, readOnly: true },
  "dateCreated": { readOnly: true, render: renderDateTime },
  "desiredAvailable": { readOnly: true, render: renderSize },
  "doneDate": { readOnly: true, render: renderDateTime },
  "downloadDir": { readOnly: true },
  "downloadedEver": { readOnly: true, render: renderSize },
  "downloadLimit": {},
  "downloadLimited": {},
  "error": { readOnly: true },
  "errorString": { readOnly: true },
  "eta": { readOnly: true },
  "files": { ignore: true, readOnly: true },
  "fileStats": { ignore: true, readOnly: true },
  "hashString": { readOnly: true },
  "haveUnchecked": { readOnly: true, render: renderSize },
  "haveValid": { readOnly: true, render: renderSize },
  "honorsSessionLimits": {},
  "id": { ignore: true, readOnly: true },
  "index": { ignore: true, readOnly: true },
  "isFinished": { readOnly: true },
  "isPrivate": { readOnly: true },
  "isStalled": { readOnly: true },
  "leftUntilDone": { readOnly: true, render: renderSize },
  "location": {},
  "magnetLink": { readOnly: true, render: rLink },
  "manualAnnounceTime": { readOnly: true },
  "maxConnectedPeers": { readOnly: true },
  "metadataPercentComplete": { readOnly: true, render: renderPercentage },
  "name": { readOnly: true },
  "peer-limit": {},
  "peers": { ignore: true, readOnly: true },
  "peersConnected": { readOnly: true },
  "peersFrom": { ignore: true, readOnly: true },
  "peersGettingFromUs": { readOnly: true },
  "peersSendingToUs": { readOnly: true },
  "percentDone": { readOnly: true, render: renderPercentage },
  "pieces": { ignore: true, readOnly: true },
  "pieceCount": { readOnly: true },
  "pieceSize": { readOnly: true, render: renderSize },
  "priorities": { ignore: true, readOnly: true },
  "queuePosition": {},
  "rateDownload": { readOnly: true, render: renderSpeed },
  "rateUpload": { readOnly: true, render: renderSpeed },
  "recheckProgress": { readOnly: true, render: renderPercentage },
  "secondsDownloading": { readOnly: true },
  "secondsSeeding": { readOnly: true },
  "seedIdleLimit": {},
  "seedIdleMode": {},
  "seedRatioLimit": {},
  "seedRatioMode": {},
  "selected": { ignore: true, readOnly: true },
  "sizeWhenDone": { readOnly: true, render: renderSize },
  "startDate": { readOnly: true, render: renderDateTime },
  "status": { readOnly: true, render: renderStatus },
  "trackers": { ignore: true, readOnly: true },
  "trackerAdd": { ignore: true },
  "trackerRemove": { ignore: true },
  "trackerReplace": { ignore: true },
  "trackerStats": { ignore: true, readOnly: true },
  "totalSize": { readOnly: true, render: renderSize },
  "torrentFile": { readOnly: true, render: function( file ) {
    file = file.substring( file.lastIndexOf( "/" ) + 1 );
    return globals.shift.settings.torrentLinkEnabled ? rLink( globals.shift.settings.torrentLink + file , file ) : file;
  } },
  "uploadedEver": { readOnly: true, render: renderSize },
  "uploadLimit": {},
  "uploadLimited": {},
  "uploadRatio": { readOnly: true, render: renderPercentage },
  "wanted": { ignore: true, readOnly: true },
  "webseeds": { ignore: true, readOnly: true },
  "webseedsSendingToUs": { readOnly: true }
};

var torrentFieldKeys = Object.keys( torrentFields );

var torrentDetailsFieldKeys = [ "id" ];
var torrentDetailsFieldKeysIgnore = [
  "addedDate",
  "comment",
  "creator",
  "dateCreated",
  "hashString",
  "isFinished",
  "isPrivate",
  "magnetLink",
  "metadataPercentComplete",
  "name",
  "pieceCount",
  "pieceSize",
  "torrentFile",
  "totalSize"
];

for ( var k in torrentFields ) {
  if ( !torrentFields[k].ignore ) {
    torrentDetailsFieldKeys.pushUnique( k );
  }
}

torrentDetailsFieldKeysIgnore.each( function( item ) {
  torrentDetailsFieldKeys.remove( item );
} );

function done() {
  globals.html.style.cursor = "auto";
}

function wait() {
  globals.html.style.cursor = "progress";
}

var torrentColumns = {
  "id": { render: false },

  "menu": {
    label: rLed().observe( "click", function( event ) {
      var popup = $("popupGeneral");
      popup.observe( "click", function( event ) {
        var action = event.target.id;
        var select = action == "select visible" || action == "select all";
        var visible = action == "select visible" || action == "deselect visible";
        switch( action ) {
          case "select all":
          case "deselect all":
          case "select visible":
          case "deselect visible":
          case "reset":
            globals.torrents.each( function( torrent ) {
              torrent.set( !visible || visible && torrent.display ? select : torrent.selected );
            } );
            if ( action == "reset ") {
              // TODO: Set every filter to default settings
            }
            break;
        }
      } );
      showPopup( popup, event );
    } ),
    render: function() { return rLed() },
    listHandler: function( event, torrent ) {
      globals.currentTorrent = torrent;
      var popup = $("popupStatus");
      popup.observe( "click", function( event ) {
        var action = event.target.id;
        if ( action == "select" ) {
          torrent.toggleSelect();
          return;
        }

        if ( !torrentActions[ action ] ) {
          return
        }

        wait();

        if ( action == "details" ) {
          filesClickHandler( event );
          return;
        }

        var selected = globals.torrents.collect( function( torrent ) {
          return torrent.display && torrent.isSelected() ? ( torrent ) : null;
        } ).compact();

        selected = selected.length == 0 ? [ torrent ] : selected;

        var selectedIds = [];
        var selectedMagnetIds = [];

        if ( action == "trash" ) {
          var partitioned = selected.partition( function( torrent ) {
            return torrent.metadataPercentComplete == null || torrent.metadataPercentComplete == 1.0;
          } );
          selectedIds = partitioned[ 0 ].pluck( "id" );
          selectedMagnetIds = partitioned[ 1 ].pluck( "id" );
        }
        else {
          selectedIds = selected.pluck( "id" );
        }

        var request = newRequest( torrentActions[ action ].method, null, action == "trash" && selectedIds.length > 0 && selectedMagnetIds.length > 0 ? function( response ) {
          // If the array of ids is empty, Transmission assumes ALL.
          if ( selectedMagnetIds.length > 0 ) {
            var magnetRequest = newRequest( torrentActions[ action ].method );
            magnetRequest.parametersObject.arguments.ids = selectedMagnetIds;
            doRequest( magnetRequest );
            globals.removed.concatUnique( selectedMagnetIds );
          }
        } : null );

        if ( action != "trash" || confirm("Are you sure you want to trash the following torrent(s)? \n\"" + selected.pluck( "name" ).join( "\",\n\"") + "\"" ) ) {
          if ( action == "trash" ) {
            if ( selectedIds.length > 0 ) {
              request.parametersObject.arguments["delete-local-data"] = true;
            }
            else {
              selectedIds = selectedMagnetIds;
              selectedMagnetIds = [];
            }
          }
          selected.invoke( "deselect" );
          // If the array of ids is empty, Transmission assumes ALL.
          if ( selectedIds.length > 0 ) {
            request.parametersObject.arguments.ids = selectedIds;
            doRequest( request );
            if ( action == "remove" || action == "trash" ) {
              globals.removed.concatUnique( selectedIds );
            }
          }
        }
      } );

      showPopup( popup, event );
    }
  },

  "status": {
    label: "Status", render: renderStatus, filter: {
      active: true, value: 4, renderNode: renderStatusFilter, match: function( torrent ) {
        return torrent.status == null || this.value == -1 || this.value == torrent.status
      }
    }
  },

  "percentDone": {
    label: "Done", render: renderDone, defaultOrder: false, filter: {
      active: true, comparator: "le", value: 1.0, renderNode: renderDoneFilter, match: function( torrent ) {
        return compareValue( torrent.percentDone, this.comparator, this.value );
      }
    }
  },

  "rateDownload": {
    label: "Down", readOnly: true, render: renderSpeed
  },

  "rateUpload": {
    label: "Up", readOnly: true, render: renderSpeed
  },

  "sizeWhenDone": {
    label: "Size", readOnly: true, render: renderSizeCell, filter: {
      active: true, comparator: "ge", value: 0, renderNode: renderSizeFilter, match: function( torrent ) {
        return compareValue( torrent.sizeWhenDone, this.comparator, this.value );
      }
    }
  },

  "name": {
    label: "Name", readOnly: true, render: renderName, isString: true, filter: {
      active: true, value: "", renderNode: renderNameFilter, match: function( torrent ) {
        return torrent.name == null || torrent.name.toLowerCase().include( this.value )
      }
    }
  },

  "eta": { render: false }
}

var fileColumns = {
  "priority": { label: rLed().observe( "click", function( event ) {
    event.stop();
    if ( confirm( "Reset all priorities to normal?" ) ) {
      var torrent = globals.currentTorrent;
      setFilesPriority( torrent.id, [], "normal" );
    }
  } ) },
  "percentDone": { label: "Done" },
  "length": { label: "Size" },
  "name": { label: "Name", defaultOrder: false }
}

var peerColumns = {
  "menu": { label: {}, render: rLed },
  "address": { label: "Peer", defaultOrder: false },
  "port": { label: "Port" },
  "rateToClient": { label: "Down", render: renderSpeed },
  "rateToPeer": { label: "Up", render: renderSpeed },
  "progress": { label: "Has", render: renderPercentage },
  "flagStr": { label: "Flags" },
  "clientName": { label: "Client" }
}

var trackerColumns = {
  "menu": { label: {}, render: function() { return rLed().observe( "click", function( event ) {
    event.stop();
  } ) } },
  "announce": { label: "Tracker", defaultOrder: false },
  "lastAnnounceTime": { label: "Last Announce", render: renderDateTime },
  "nextAnnounceTime": { label: "Next Announce", render: renderDateTime },
  "lastScrapeTime": { label: "Last Scrape", render: renderDateTime },
  "nextScrapeTime": { label: "Next Scrape", render: renderDateTime },
}

var detailsColumns = {
  "key": { label: "Key" },
  "value": { label: "Value" }
}

var sessionColumns = detailsColumns;
var shiftColumns = detailsColumns;

var preventDefault = function( event ) {
  if ( event ) {
    event.stop();
  }
}

var Torrent = Class.create( {
  initialize: function( torrent ) {
    this.selected = false;
    this.display = false;
    this.update( torrent );
  },
  isSelected: function() {
    return this.selected;
  },
  select: function() {
    this.set( true );
  },
  deselect: function() {
    this.set( false );
  },
  toggleSelect: function() {
    this.selected ? this.deselect() : this.select();
  },
  set: function( selected ) {
    if ( this.selected != selected ) {
      this.selected = selected;
      if ( this.renderNode ) {
        this.renderNode.down(".led").set( selected );
      }
    }
  },
  update: function( torrent ) {
    this.dirty = this.dirty || [];
    for ( t in torrent ) {
      if ( this[t] != torrent[t] ) {
        this[t] = torrent[t];
        if ( t != "id" ) {
          this.dirty.pushUnique( t == "hashString" ? "name" : t );
        }
      }
    }
  }
} );

function rE( tag, attributes, content ) {
  return new Element( tag, attributes ).insert( content );
}

function rSpan( attributes, content )
{
  return rE( "span", attributes, content );
}

function rLed( k, attributes ) {
  return Object.extend( rSpan( Object.extend( { "class": "led" }, attributes ) ), {
    value: false,
    set: function( k ) {
      if ( Object.isBoolean( k ) ) {
        k = k ? "normal" : "none";
      }
      k = k ? k : "none";
      this.value = k != "none";
      for ( p in filePriority ) {
        k == p ? this.addClassName( p ) : this.removeClassName( p )
      }
      return this.update( filePriority[ k ].label );
    },
    toggle: function() {
      this.set( !this.value );
    }
  } ).set( k );
}

function $S(className) {
  if ( document.styleSheets.length < 1 ) {
    return null;
  }

  var cssRules = document.styleSheets[0].cssRules ? "cssRules" : "rules";

  for ( var s = 0, slen = document.styleSheets.length; s < slen; ++s ) {
    var rules = document.styleSheets[s][cssRules];

    for ( var r = 0, rlen = rules.length; r < rlen; ++r ) {
      if ( rules[r].selectorText == className ) {
        return rules[r].style;
      }
    }
  }
  return null;
}

var nameClass = $S( "div.name" );

function showPopup( popup, event, keepOpen ) {
  var popups = $("popups");
  var outside = $("outside");

  popups.close = function( event ) {
    preventDefault( event );
    [ outside, popups, popup ].invoke( "hide" ).invoke( "stopObserving", "click" );
    delete this.close;
  };

  if ( !keepOpen ) {
    outside.observe( "click", popups.close );
    popups.observe( "click", popups.close );
  }

  popup.style.display = "block";
  popups.style.display = "block";
  outside.style.display = "block";

  if ( event ) {
    popup.style.left = event.pointerX() + "px";
    popup.style.top = Math.min( event.pointerY(), Math.max ( document.body.scrollHeight, window.innerHeight ) - popup.getHeight() ) + "px";
  }
  else
  {
    popup.style.left  = ( window.innerWidth / 2 - popup.offsetWidth / 2 ) + "px";
    popup.style.top =  ( window.innerHeight / 2 - popup.offsetHeight / 2 ) + "px";
  }
}

function rButton( attributes ) {
  return rE( "input", Object.extend( { "class": "styled", type: "button", value: "Apply" }, attributes ) );
}

function renderDateTime( seconds ) {
  return seconds == 0 ? "-" : new Date( 1000 * seconds ).toJSON().substr( 0, 19 ).replace( "T", " " );
}

function renderDone( percentage, torrent, ignore, cell ) {
  if ( cell && torrent.eta > -1 ) {
    cell.title = renderInterval( torrent.eta );
  }
  return isNaN( percentage ) ? "" : renderPercentage( percentage );
}

function rInput( value, attributes ) {
  return rE( "input", Object.extend( { "class": "styled", type: "text", value: value }, attributes ) );
}

function renderInterval( seconds ) {
  return seconds < 300 ? seconds + "s" : Math.floor( seconds / 60 ) + "m";
}

function rLink( href, text, attributes ) {
  return rE( "a", Object.extend( { href: href, target: "_blank" }, attributes ), text == null ? unescape( href ) : text );
}

function renderName( name, torrent, ignore, cell ) {
  return ( torrent.eta == -2 && !torrent.sizeWhenDone && torrent.hashString ? "magnet#" + torrent.hashString + ": " : "" ) + name;
}

function renderPercentage( percentage, decimals ) {
  return ( percentage * 100.0 ).toFixed( decimals == undefined ? 2 : decimals ) + "%";
}

function renderSize( size, decimals ) {
  decimals = decimals == undefined ? 2 : decimals;
  return size < 1024 ? size + "B" :
  size < 1048576 ? ( size / 1024 ).toFixed( decimals ) + "KB" :
  size < 1073741824 ? ( size / 1048576 ).toFixed( decimals ) + "MB" :
  ( size / 1073741824 ).toFixed( decimals ) + "GB"
}

function renderSizeCell( size, torrent, ignore, cell ) {
  if ( size > 1024 && cell ) {
    cell.title = size + "B";
  }
  return renderSize( size );
}

function renderSpeed( size ) {
  return renderSize( size, 0 ) + "s";
}

function renderStatus( status ) {
  return globals.tr_torrent_activity[status];
}

function normalizeOptions( options ) {
  var normalized = [];
  for( var k in options ) {
    normalized.push( { value: k, text: options[k] } );
  }
  return normalized;
}

var defaultOptions = normalizeOptions( { le: "<=", eq: "==", ge: ">=" } );

function renderSelect( options ) {
  var select = rE( "select", options.select );
  if ( options.options ) {
    for ( var i = 0, len = options.options.length; i < len; ++i ) {
      var o = options.options[i];
      select.insert( rE( "option", o ).update( o.text ? o.text : o.value ) );
    }
  }
  select.value = options.select.value;
  return select;
}

function getTorrentActivity() {
  return globals.tr_torrent_activity ? globals.tr_torrent_activity : ( globals.tr_torrent_activity = parseFloat( globals.shift.session.version ) < 2.4 ? {
    "-1": "ALL",
    1: "CHECK_WAIT",   // Waiting in queue to check files
    2: "CHECK",        // Checking files
    4: "DOWNLOAD",     // Downloading
    8: "SEED",         // Seeding
    16: "STOPPED"      // Torrent is stopped
  } : {
    "-1": "ALL",
    0: "STOPPED",       // Torrent is stopped
    1: "CHECK_WAIT",    // Queued to check files
    2: "CHECK",         // Checking files
    3: "DOWNLOAD_WAIT", // Queued to download
    4: "DOWNLOAD",      // Downloading
    5: "SEED_WAIT",     // Queued to seed
    6: "SEED"           // Seeding
  } )
}

function renderStatusFilter() {
  return rE( "div", { "class": "filter"} ).hide().insert( "Status: " ).insert(
    renderSelect( { select: { id: "statusSelect", value: 4, "class": "styled" }, options: normalizeOptions( getTorrentActivity() ) } ).observe( "change", function( event ) {
      torrentColumns.status.filter.value = this.value;
      filterTorrents();
    } )
  );
}

function normalizePercentage( value ) {
  value = parseFloat( value );
  return isNaN( value ) || value > 100.00 ? 100.00 : value < 0.00 ? 0.00 : value / 100.00;
}

function normalizeInteger( value ) {
  value = parseInt( value );
  return isNaN( value ) || value < 0 ? 0 : value;
}

function renderDoneFilter() {
  var filter = torrentColumns.percentDone.filter;
  var select = renderSelect( { select: { "class": "styled", value: filter.comparator }, options: defaultOptions } );
  var input = rInput( renderPercentage( filter.value ), { "class": "styled number" } );

  var handler = function( event ) {
    filter.comparator = select.value;
    filter.value = normalizePercentage( input.value );
    input.value =  renderPercentage( filter.value );
    filterTorrents();
  };

  var apply = rButton();

  select.observe( "change", handler );
  input.observe( "change", handler );
  input.observe( "blur", handler );
  apply.observe( "click", handler );

  return rE( "div", { "class": "filter"} ).hide().insert( "Done: " ).insert( select ).insert( input ).insert( apply );
}

function renderSizeFilter() {
  var filter = torrentColumns.sizeWhenDone.filter;
  var select = renderSelect( { select: { "class": "styled", value: filter.comparator }, options: defaultOptions } );
  var input = rInput( filter.value, { "class": "styled number" } );

  var handler = function( event ) {
    filter.comparator = select.value;
    input.value = filter.value = normalizeInteger( input.value );
    filterTorrents();
  };

  var apply = rButton();

  select.observe( "change", handler );
  input.observe( "change", handler );
  input.observe( "blur", handler );
  apply.observe( "click", handler );

  return rE( "div", { "class": "filter"} ).hide().insert( "Size: " ).insert( select ).insert( input ).insert( apply );
}

function renderNameFilter() {
  var filter = torrentColumns.name.filter;
  var input = rInput( filter.value, { id: "doneInput" } );

  var handler = function( event ) {
    filter.value =  input.value.toLowerCase();
    filterTorrents();
  };

  var apply = rButton();

  input.observe( "change", handler );
  input.observe( "blur", handler );
  apply.observe( "click", handler );

  return rE( "div", { "class": "filter"} ).hide().insert( "Name: " ).insert( input ).insert( apply );
}

function compareValue( value, comparator, filterValue ) {
  return value == null ||
    comparator == "eq" && value == filterValue ||
    comparator == "le" && value <= filterValue ||
    comparator == "ge" && value >= filterValue
}

var renderers = {}
var updaters = {
  "port-is-open": function( element, value ) {
    element.set( value ).writeAttribute( "title", value ? "Open" : "Closed" )
  }
}

function removeTorrentById( id ) {
  globals.removed.pushUnique( id );

  var torrent = globals.torrentHash[id];
  if ( torrent ) {
    torrent.renderNode.remove();
    globals.torrents.remove( torrent );
  }
  delete globals.torrentHash[id];
}

function onFailure( response ) {
  globals.lastResponse = response;
  if ( response.status === 409 ) {
    // All requests use a reference to this array.
    globals.requestHeaders[1] = response.getHeader( HEADER_TRANSMISSION );
  }
}

function doRequest( requestBase ) {
  wait();
  requestBase.parameters = requestBase.parameters ? requestBase.parameters : Object.toJSON( requestBase.parametersObject );

  var request = Object.extend( {
    url: globals.rpcUrl,
    method: "post",
    requestHeaders: globals.requestHeaders,
    onSuccess: function( response ) {
      globals.lastResponse = response;
    },
    onFailure: function( response ) {
      globals.lastResponse = response;
      if ( response.status === 409 ) {
        globals.requestHeaders[1] = response.getHeader( HEADER_TRANSMISSION );
        doRequest( requestBase );
      }
    },
    onComplete: function( response ) {
      done();
    }
  }, requestBase );

  return request.frequency && request.frequency > 0 ?
    new Ajax.PeriodicalUpdater( "items", request.url, request ) :
    new Ajax.Request( request.url, request );
};

function updateFields( object ) {
  for( var k in object ) {
    if ( object.hasOwnProperty( k ) ) {
      var o = object[k];
      var element = $( k );

      if ( updaters[k] ) {
        return updaters[k]( element, o );
      }

      if ( Object.isString( o ) || Object.isNumber( o ) || Object.isBoolean( o ) ) {
        var renderer = renderers[k];

        if ( element ) {
          updateElement( element, renderer ? renderer( o ) : o );
        }
        else if ( renderer ) {
          renderer( o );
        }
      }
      else if ( !Object.isFunction( o ) && !Object.isArray( o ) ) {
        updateFields( o );
      }
    }
  }
}

function updateTorrents( torrents ) {
  torrents.each( function( torrent ) {
    if ( globals.removed.include( torrent.id ) ) {
      return;
    }

    var targetTorrent = globals.torrentHash[torrent.id];
    if ( targetTorrent ) {
      targetTorrent.update( torrent );
    }
    else {
      var t = new Torrent( torrent );
      globals.torrents.push( t );
      globals.torrentHash[torrent.id] = t;
    }
  } );
}

function updateOrder( columnsObject, property ) {
  var noReverse = property == null;

  if ( !property ) {
    for( var k in columnsObject ) {
      if ( columnsObject[k].order != null ) {
        property = k;
        break;
      }
    }
  }

  if ( !property ) {
    for( var k in columnsObject ) {
      if ( columnsObject[k].defaultOrder != null ) {
        columnsObject[k].order = columnsObject[k].defaultOrder;
        return k;
      }
    }
    return null;
  }

  for( var k in columnsObject ) {
    if ( k == property ) {
      columnsObject[k].order = columnsObject[k].order == null ? false : noReverse ? columnsObject[k].order : !columnsObject[k].order;
    }
    else {
      delete columnsObject[k].order;
    }
  }
  return property;
}

function sortTorrents( property, reverse ) {
  var torrents = globals.torrents;
  if ( torrents.length == 0 ) {
    return;
  }

  property = updateOrder( torrentColumns, property );

  for ( var i = 0, len = torrents.length; i < len; ++i ) {
    torrents[i].i = i;
  }

  torrents.sortByProperty( property, torrentColumns[property].order, torrentColumns[property].isString );

  globals.shift.newOrderIds = globals.torrents.pluck( "id" ).join( "" );
  var orderChanged = globals.shift.orderIds != globals.shift.newOrderIds;
  globals.shift.orderIds = globals.shift.newOrderIds;
  var currentNode = $("torrentBody").down();

  var process = orderChanged && currentNode;
  for ( var i = 0, len = torrents.length; i < len; ++i ) {
    var torrent = torrents[i];
    if ( process && torrent.renderNode ) {
      if ( torrent.i != i ) {
        currentNode.insert( { after: torrent.renderNode } );
      }
      currentNode = torrent.renderNode;
    }
    delete torrent.i;
  }
}

var filters = Object.values( torrentColumns ).pluck( "filter" ).compact();

function filterTorrents() {
  globals.torrents.each( function ( torrent ) {
    torrent.display = filters.all( function( filter ) { return !filter.active || filter.match( this ) }, torrent );
  } );
}

function renderTorrents( noRefresh ) {
  var torrentBody = $("torrentBody");

  if ( torrentBody == null )
  {
    return;
  }
  var newRows = [];
  var magnet = false;
  globals.torrents.each( function( torrent ) {
    var row = torrent.renderNode;

    if ( !torrent.display || globals.removed.include( torrent.id ) ) {
      if ( row ) {
        row.hide();
      }
      return;
    }

    if ( torrent.dirty.length > 0 ) {
      if ( row ) {
        for ( var k in torrentColumns ) {
          var render = torrentColumns[k].render;
          if ( render && torrent.dirty.include( k ) ) {
            var cell = row.down( "." + k );
            updateElement( cell, render == true ? torrent[k] : render( torrent[k], torrent, k, cell ) );
          }
          torrent.dirty.remove( k );
        }
        row.style.display = "";
        if ( globals.magnets.include( torrent.id ) ) {
          if ( torrent.percentDone ) {
            newRows.push( torrent.id );
            globals.magnets.remove( torrent.id );
          }
        }
        else {
          // This may indicate an incomplete magnet.
          if ( torrent.eta == -2 && torrent.sizeWhenDone == 0 ) {
            doRequest( newRequest( "torrent-get", { fields: ["id","hashString","metadataPercentComplete"], ids: [torrent.id] }, function( response ) {
              updateTorrents( response.responseJSON.arguments.torrents );
              var meta = torrent["metadataPercentComplete"];
              // This confirms an incomplete magnet.
              if ( meta != null && meta < 1 ) {
                globals.magnets.push( torrent.id )
              }
            } ) );
          }
        }
      }
      else {
        newRows.push( torrent.id );
        row = renderRow( torrent, torrentColumns, rE( "tr", { id: torrent.id } ) );
        noRefresh ? row.show() : row.hide();
        torrent.renderNode = row;
        torrentBody.insert( row );
        row.observe( "dblclick", function( event ) {
          globals.currentTorrent = globals.torrentHash[ event.currentTarget.id ];
          filesClickHandler( event );
        } );
      }
    }
    else if ( row ) {
      row.show();
    }
  } );

  if ( !noRefresh && newRows.length > 0 ) {
    doRequest( newRequest( "torrent-get", { fields: Object.keys( torrentColumns ), ids: newRows }, function( response ) {
      globals.lastResponse = response;
      updateTorrents( response.responseJSON.arguments.torrents );
      filterTorrents();
    } ) );
  }
}

function renderTable( id, columnDefinitions, click ) {
   if ( globals.activeTableId != id || $( id ) ) {
     return null;
  }
  var table = {
    columns: rE( "colgroup" ),
    header: rE( "thead" ),
    body: rE( "tbody" ),
    footer: rE( "tfoot" )
  }
  table.table = rE( "table", { id: id } ).insert( table.columns ).insert( table.header ).insert( table.body ).insert( table.footer );
  if ( columnDefinitions ) {
    var columns = table.columns;
    var header = rE( "tr" );
    table.header.insert( header );
    for ( var k in columnDefinitions ) {
      if ( columnDefinitions[k].label ) {
        columns.insert( rE( "col", { "class": k } ) );
        var cell = rE( "th", { id: "h_" + k, "class": k } ).insert( columnDefinitions[k].label );
        if ( columnDefinitions[k].click || click ) {
          cell.observe( "click", columnDefinitions[k].click ? columnDefinitions[k].click : click );
        }
        header.insert( cell );
      }
    }
    updateOrder( columnDefinitions );
  }
  return table;
}

function renderRow( object, columnDefinitions, row )
{
  row = row || rE( "tr" );

  for ( var k in columnDefinitions ) {
    var render = columnDefinitions[k].render;
    if ( render == null || render != false ) {
      var cell = rE( "td", Object.extend( { "class": k }, columnDefinitions[k].attributes ), "" );
      updateElement( cell, render == null || render == true ? object[k] : render( object[k], object, k, cell ) );
      row.insert( cell );
    }
  }
  return row;
}

function updateElement( element, content ) {
  if ( content != element.innerHTML ) {
    element.update( content );
  }
}

function updateRow( object, columnDefinitions, row )
{
  for ( var k in columnDefinitions ) {
    var render = columnDefinitions[k].render;
    if ( render == null || render != false ) {
      var cell = row.down( "." + k );
      updateElement( cell, render == null || render == true ? object[k] : render( object[k], object, k, cell ) );
    }
  }
  return row;
}

function renderTorrentTable() {
  var torrentTable = renderTable( "torrentTable", torrentColumns, function( event ) {
    sortTorrents( this.id.substring( 2 ) );
  } );

  globals.body.insert( torrentTable.table );
  torrentTable.body.id = "torrentBody";

  torrentTable.table.observe( "click", function( event ) {
    var cell = event.target.nodeName == "TD" ? event.target : event.target.up( "td" );
    if ( cell ) {
      var row = cell.up( "tr" );
      var column = globals.columnHash[row.childElements().indexOf( cell )];
      var torrent = globals.torrentHash[row.id];
      if ( column && column.listHandler ) {
        column.listHandler( event, torrent );
      }
      else {
        torrent.toggleSelect();
      }
    }
  } );

  var row = rE( "tr" );
  torrentTable.header.insert( row );

  // th#filter is a single cell containing all column filters input elements.
  var f = rE( "th", { id: "filter" } );
  torrentTable.header.insert( rE( "tr" ).insert( f ) );

  var columnCount = 0;
  for ( var k in torrentColumns ) {
    var column = torrentColumns[k];
    if ( column.render ) {
      globals.columnHash[columnCount++] = column;
    }

    if ( column.filter ) {
      if ( column.filter.node ) {
        f.insert( column.filter.node );
      }
      else if ( column.filter.renderNode ) {
        f.insert( column.filter.node = column.filter.renderNode() );
      }
      else {
        continue;
      }

      var l = rLed().observe( "click", function( event ) {
        var column = torrentColumns[ this.up().id.substring( 2 ) ];
        this.set( column.filtered = !column.filtered );
        column.filtered ? column.filter.node.show() : column.filter.node.hide();
        event.stop();
      } );

      if ( column.render ) {
        $( "h_" + k ).insert( l );
      }
      else {
        // Put this filter led somewhere else
      }
    }
  }
  f.writeAttribute( "colSpan", columnCount );
}

function getFolderName( fileName, depth ) {
  var fileParts = fileName.name.split("/");
  fileParts.length = depth + 1;
  return fileParts.join("/");
}

function getSelectedFiles( files, id, depth ) {
  var folderName = getFolderName( files.find( function( file ) {
    return file.index == id;
  } ), depth );

  return  files.findAll( function( file ) {
    return folderName == getFolderName( file, depth );
  } ).pluck( "index" );
}

function setFilesPriority( id, files, priority ) {
  var request = newRequest( "torrent-set", { ids: [id] }, function( response ) {
    if ( response.responseJSON.result == "success" ) {
      files.each( function( fileIndex ) {
        $( "f_" + fileIndex ).down( ".led" ).set( priority );
      } );
    }
  } );

  ( priority == "none" ? ["files-unwanted"] : ["files-wanted", "priority-" + priority ] ).each( function( selector ) {
    request.parametersObject.arguments[ selector ] = files;
  } );

  doRequest( request );
}

function fileMenuClickHandler( event ) {
  var row = event.target.up("tr");

  var priorityPopup = $( "popupPriority" );

  priorityPopup.observe( "click", function( event ) {
    var torrent = globals.currentTorrent;

    var id = row.id.split("_");
    id[1] = parseInt( id[1] );
    var selected = id[0] == "f" ? [ id[1] ] : getSelectedFiles( torrent.files, id[1], parseInt( id[2] ) );
    var priority = event.target.nodeName == "LI" ? event.target.id : event.target.up("li").id;

    setFilesPriority( torrent.id, selected, priority );
  } );

  showPopup( priorityPopup, event );
}

function fileClickHandler( event ) {
  var row = event.target.up("tr");

  var id = row.id.split("_");
  id[1] = parseInt( id[1] );

  var selected = id[0] == "f" ? [ id[1] ] : null;

  if ( selected ) {
    setFilesPriority( globals.currentTorrent.id, selected, row.down( ".led" ).value ? "none" : "normal" );
  }
}

function rMulti( target, elementName, inserts, arguments ) {
  for ( var i = 0, len = inserts ? ( inserts.length ) : arguments ? ( arguments.length ) : 0; i < len; ++i ) {
    var element = rE( elementName, arguments ? Object.isString( arguments[i] ) ? { id: arguments[i] } : arguments[i] : null );
    if ( inserts && inserts[i] ) {
      element.insert( inserts[i] );
    }
    target.insert( element );
  }
  return target;
}

function changeRequest( request, method, arguments, onSuccess ) {
  var options = request.options;
  if ( method ) {
    options.parametersObject.method = method;
  }
  if ( arguments ) {
    for( var k in arguments ) {
      options.parametersObject.arguments[k] = arguments[k];
    }
  }
  options.parameters = Object.toJSON( options.parametersObject );
  if ( onSuccess ) {
    options.onSuccess = onSuccess;
  }
}

function rCell( attributes, content ) {
  return rE( "td", attributes, content );
}

function rFolder( base, fileParts, filePartIndex ) {
  var result = fileParts[filePartIndex] + "&sol;";
  if ( base ) {
    for ( var i = 0; i <= filePartIndex; ++i ) {
      base += fileParts[i] + "/";
    }
    result = rLink( base, result );
  }
  return result;
}

function renderFiles( torrent ) {
  var torrentDone = torrent.percentDone == 1;

  var folderLink = globals.shift.settings.folderLinkEnabled ? globals.shift.settings.folderLink : null;
  if ( !torrentDone && globals.shift.session["incomplete-dir-enabled"] ) {
    folderLink = globals.shift.settings.incompleteFolderLinkEnabled ? globals.shift.settings.incompleteFolderLink : null;
  }

  var fileLink = globals.shift.settings.fileLinkEnabled ? globals.shift.settings.fileLink : null;
  var incompleteFileLink = globals.shift.settings.incompleteFolderLinkEnabled ? globals.shift.settings.incompleteFolderLink : null;
  var extension = globals.shift.session["rename-partial-files"] ? ".part" : "";

  var currentNode = $("fileBody").down();
  var dummyNode =  currentNode == null ? rE( "tr" ) : null;

  if ( dummyNode ) {
    $("fileBody").insert( dummyNode );
    currentNode = dummyNode;
  }

  var lastFileParts = [];
  var row;

  torrent.files.each( function( file, index ) {
    file.index = file.index == null ? index : file.index;
    var fileParts = file.name.split( "/" );

    var fileStyle = fileParts.length > 1 ? "padding-left: " + ( fileParts.length * 24 - 24 ) + "px" : "";

    var folderNodes = [];
    for ( var i = 0, len = fileParts.length - 1; i < len; ++i ) {
      if ( fileParts[i] == lastFileParts[i] ) {
        continue;
      }
      var rowId = "d_" + file.index + "_" + i;
      row = $( rowId );
      if ( row ) {
        file.folderNodes.remove( row );
      }
      else {
        row = rE( "tr", { id: rowId } );
        row.insert(
          rCell( {}, rLed().observe( "click", fileMenuClickHandler ) ) ).insert(
          rCell( { colspan: 2 } ) ).insert(
          rCell( { "class": "name", style: "padding-left: " + i * 24 + "px" } ).insert( rFolder( folderLink, fileParts, i ) ).observe( "dblclick", fileClickHandler )
        );
      }
      folderNodes.push( row );
      currentNode.insert( { after: row } );
      currentNode = row;
    }
    file.folderNodes.invoke( "remove" );
    file.folderNodes = folderNodes;
    lastFileParts = fileParts;

    var fileDone = file.bytesCompleted == file.length;
    var fileName = fileParts.last();
    var base = fileDone ? fileLink : incompleteFileLink;

    if ( file.renderNode ) {
      if ( globals.shift.settingsChanged ) {
        file.renderNode.down( "td.name" ).update( base ? rLink( base + file.name + ( fileDone ?  "" : extension ), fileName ) : fileName );
      }
    }
    else {
      Object.extend( file, torrent.fileStats[file.index] );
      file.percentDone = file.length == 0 ? 1 : file.bytesCompleted / file.length;
      file.renderNode = rE( "tr", { id: "f_" + file.index } );
      file.renderNode.insert(
        rCell( {}, rLed( filePriorityKeys[ file.wanted ? ( 1 - file.priority ) : 3 ] ).observe( "click", fileMenuClickHandler ) ) ).insert(
        rCell( { "class": "percentDone" } , renderPercentage( file.percentDone ) ) ).insert(
        rCell( { "class": "length", title: file.length + "B" }, renderSize( file.length ) ) ).insert(
        rCell( { "class": "name", style: fileStyle }, base ? rLink( base + file.name + ( fileDone ?  "" : extension ), fileName ) : fileName ).observe( "dblclick", fileClickHandler )
      );
    }
    currentNode.insert( { after: file.renderNode } );
    currentNode = file.renderNode;
  } );

  globals.shift.settingsChanged = false;

  if ( dummyNode ) {
    dummyNode.remove();
  }
}

function renderFileTable( torrent ) {
  if ( $("fileTable" ) ) {
    torrent.files.each( function( file ) {
      var index = file.index;
      var row = $( "f_" + index );
      var fileStat = torrent.fileStats[ index ];

      if ( fileStat.bytesCompleted != file.bytesCompleted ) {
        file.percentDone = file.length == 0 ? 1 : fileStat.bytesCompleted / file.length
        updateElement( row.down( "td.percentDone" ), renderPercentage( file.percentDone ) );
      }
      if ( fileStat.wanted != file.wanted || fileStat.priority != file.priority ) {
        row.down( ".led" ).set( filePriorityKeys[ fileStat.wanted ? ( 1 - fileStat.priority ) : 3 ] );
      }
      Object.extend( file, fileStat );
    } );
  }
  else {
    globals.currentTorrent = torrent;
    var table = renderTable( "fileTable", fileColumns, function( event ) {
      for ( var i = 0, len = torrent.files.length; i < len; ++i ) {
        torrent.files[i].i = i;
      }
      var property = updateOrder( fileColumns, this.id.substring( 2 ) );
      var column = fileColumns[property];
      var o = column.order;

      if ( property == "name" ) {
        torrent.files.sortByProperty( o ? "name" : "index", true, o );
      }
      else {
        torrent.files.sortByProperty( property, o, column.isString );
      }
      renderFiles( torrent );
    } );
    table.body.id = "fileBody";
    globals.body.insert( table.table );

    for ( var i = 0, len = torrent.files.length; i < len; ++i ) {
      torrent.files[i].folderNodes = [];
    }
    renderFiles( torrent );
  }
  return;
}

function renderPeerTable( torrent ) {
  var peerTable = $("peerTable");

  if ( !peerTable ) {
    var table = renderTable( "peerTable", peerColumns, function( event ) {
      torrent.peers.sortByProperty( event.target.id.substring(2) );
    } );
    peerTable = table.table;
    globals.body.insert( table.table );
  }

  peerBody = peerTable.down( "tbody" );

  var currentPeers = torrent.peers.pluck( "address" );
  peerBody.childElements().each( function( row ) {
    if ( !currentPeers.include( row.id.substring( 2 ) ) ) {
      row.remove();
    }
  } );

  torrent.peers.sortByProperty();

  torrent.peers.each( function( peer ) {
    var id = "p_" + peer.address;
    var row = $( id );
    if ( row ) {
      updateRow( peer, peerColumns, row );
    }
    else {
      peerBody.insert( renderRow( peer, peerColumns, rE( "tr", { id: id } ) ) );
    }
  } );
  globals.oldPeers = torrent.peers;
}

function renderTrackerTable( torrent ) {
  var trackerTable = $("trackerTable");

  if ( !trackerTable ) {
    var table = renderTable( "trackerTable", trackerColumns );
    trackerTable = table.table;
    globals.body.insert( table.table );
  }

  trackerBody = trackerTable.down( "tbody" );

  var currentTrackers = torrent.trackerStats.pluck( "id" );
  trackerBody.childElements().each( function( row ) {
    if ( !currentTrackers.include( row.id.substring( 2 ) ) ) {
      row.remove();
    }
  } );

  torrent.trackerStats.each( function( tracker ) {
    if ( !$( "t_" + tracker.id ) ) {
      trackerBody.insert( renderRow( tracker, trackerColumns, rE( "tr", { id: "t_" + tracker.id } ) ) );
    }
  } );
  globals.oldTrackerStats = torrent.trackerStats;
}

function getChangedData( elements, idPrefix, fields ) {
  var data = {};
  for( var k in elements ) {
    var f = fields[k];
    if ( elements.hasOwnProperty( k ) && !( f && f.readOnly ) ) {
      var o = elements[k];
      var cell = $( idPrefix + k );
      var v = null;

      if ( f && f.locked ) {
        delete f.locked;
      }

      if ( fields[k] && fields[k].values ) {
        v = cell.down( "select" ).value;
      }
      else if ( Object.isBoolean( o ) ) {
        v = cell.down( "span.led" ).value;
      }
      else if ( Object.isNumber( o ) ) {
        v = parseInt( cell.down( "input" ).value );
      }
      else if ( Object.isString( o ) ) {
        v = cell.down( "input" ).value;
      }
      else {
        continue;
      }
      if ( v != null && v != elements[k] ) {
        data[k] = v;
      }
    }
  }
  return data;
}

function lock( fields, k ) {
  fields[k] = fields[k] || {};
  fields[k].locked = true;
}

function renderKeyValuePairs( target, elements, idPrefix, fields ) {
  Object.keys( elements ).sort().each( function( k ) {
    var f = fields[k];
    if ( f && f.ignore ) {
      return;
    }
    if ( elements.hasOwnProperty( k ) ) {
      var o = elements[k];
      var createInput = true;
      var row = rE( "tr" );
      var keyCell = rCell( {}, k );
      var ro = f && f.readOnly;
      var content = o;
      var valueCell = rCell( { id: idPrefix + k } );

      if ( f && f.render ) {
        content = f.render( o );
      }
      else if ( f && f.values ) {
        if ( !ro ) {
          content = rMulti( rE( "select", { "class": "styled" } ), "option", f.values ).observe( "focus", lock.curry( fields, k ) );
          content.value = o;
          createInput = false;
        }
      }
      else if ( Object.isBoolean( o ) ) {
        var content = rLed( o, ro ? { readonly: "readonly" } : {} );
        if ( !ro ) {
          content.observe( "click", function( event ) {
            lock( fields, k );
            content.toggle();
          } );
        }
        createInput = false;
      }
      else if ( !Object.isNumber( o ) && !Object.isString( o ) ) {
        return;
      }

      if ( ro ) {
        valueCell.writeAttribute( "readonly", "readonly" );
      }
      else if ( createInput ) {
        content = rInput( content ).observe( "focus", lock.curry( fields, k ) );
      }
      valueCell.insert( content );

      var a = f && f.action;
      if ( a == null || a( row, keyCell, valueCell, o ) ) {
        row.insert( keyCell ).insert( valueCell );
      }
      target.insert( row );
    }
  } );
}

function updateKeyValuePairs( elements, idPrefix, fields ) {
  Object.keys( elements ).sort().each( function( k ) {
    var f = fields[k];
    if ( f && ( f.ignore || f.locked ) ) {
      return;
    }
    if ( elements.hasOwnProperty( k ) ) {
      var o = elements[k];
      var ro = f && f.readOnly;
      var content = o;
      var valueCell = $( idPrefix + k );

      if ( f && f.render ) {
        content = f.render( o );
      }
      else if ( f && f.values ) {
        if ( !ro ) {
          valueCell.down( "select" ).value = o;
          return;
        }
      }
      else if ( Object.isBoolean( o ) ) {
        valueCell.down( "span.led" ).set( o );
        return;
      }
      else if ( !Object.isNumber( o ) && !Object.isString( o ) ) {
        return;
      }

      if ( ro ) {
        valueCell.update( content );
      }
      else {
        valueCell.down( "input" ).value = content;
      }
    }
  } );
}

function renderSessionTable() {
  var sessionTable = renderTable( "sessionTable", sessionColumns );
  if ( sessionTable == null ) {
    return;
  }
  globals.body.insert( sessionTable.table );
  renderKeyValuePairs( sessionTable.body, globals.shift.session, "s_", sessionFields );
  sessionTable.body.insert(
    rMulti( rE( "tr" ), "td", ["", rButton().observe( "click", function ( event ) {
      var data = getChangedData( globals.shift.session, "s_", sessionFields );
      if ( !Object.isEmpty( data ) ) {
        Object.extend( globals.shift.session, data );
        doRequest( newRequest( "session-set", data ) );
      }
    } ) ] )
  );
}

var shiftFields = {
}

function renderShiftTable() {
  var shiftTable = renderTable( "shiftTable", shiftColumns );
  if ( shiftTable == null ) {
    return;
  }
  globals.body.insert( shiftTable.table );
  renderKeyValuePairs( shiftTable.body, globals.shift.settings, "s_", shiftFields );
  shiftTable.body.insert(
    rMulti( rE( "tr" ), "td", ["", rButton().observe( "click", function( event ) {
      var data = getChangedData( globals.shift.settings, "s_", shiftFields );
      globals.shift.settingsChanged = !Object.isEmpty( data );
      if ( globals.shift.settingsChanged ) {
        Object.extend( globals.shift.settings, data );
        data = getChangedData( globals.shift.defaultSettings, "s_", shiftFields );
        var date = new Date();
        date.setTime( date.getTime() + ( 365 * 24 * 60 * 60 * 1000 ) );
        document.cookie = COOKIE_KEY + window.btoa( Object.toJSON( data ) ) + "; expires=" + date;
      }
    } ) ] )
  );
}

function renderDetailsTable( torrent ) {
  var detailsTable = renderTable( "detailsTable", detailsColumns );
  if ( detailsTable ) {
    globals.body.insert( detailsTable.table );
    renderKeyValuePairs( detailsTable.body, torrent, "d_", torrentFields );
    detailsTable.body.insert(
    rMulti( rE( "tr" ), "td", ["", rButton().observe( "click", function( event ) {
      wait();
      var data = getChangedData( torrent, "d_", torrentFields );
      doRequest( newRequest( "torrent-set", Object.extend( { ids: [ torrent.id ] }, data ), function( response ) {
        torrent.update( data );
      } ) );
    } ) ] )
    );
  }
  else {
    updateKeyValuePairs( torrent, "d_", torrentFields );
  }
}

function activateTable( id ) {
  if ( globals.activeTableId == id )
  {
    return false;
  }

  globals.oldTableId = globals.activeTableId;
  globals.activeTableId = id;
  return true;
}

function hideTable( id ) {
  var table = $( id );
  if ( table ) {
    id == "torrentTable" ? table.hide() : table.remove();
  }
}

function updateHandler( menu, tableId, fields, renderer, event ) {
  if ( !menuSelect( menu ) ) {
    return;
  }
  wait();
  activateTable( tableId );
  hideTable( globals.oldTableId );
  var torrent = globals.currentTorrent;
  changeRequest( globals.shift.torrentUpdater, "torrent-get", { ids: [ torrent.id ], fields: fields }, function( response ) {
    updateTorrents( response.responseJSON.arguments.torrents );
    renderer( torrent );
    done();
  } );
}

function torrentClickHandler( handler, event ) {
  Object.values( menu.torrentGroupMain ).invoke( "hide" );
  Object.values( menu.torrentGroupDetails ).invoke( "show" );
  var torrent = globals.currentTorrent;
  if ( torrent.files ) {
    handler( event )
  }
  else {
    doRequest( newRequest( "torrent-get", { ids: [ torrent.id ], fields: torrentFieldKeys }, function( response ) {
      updateTorrents( response.responseJSON.arguments.torrents );
      handler( event );
    } ) );
  }
}

function filesClickHandler( event ) {
  torrentClickHandler( updateHandler.curry(  "files", "fileTable",  [ "id", "fileStats", "sizeWhenDone" ], renderFileTable ), event );
}

function newMenu( label, click, attributes ) {
  return rE( "li", attributes ).insert( label ).observe( "click", click );
}

var menu = {
  torrent: newMenu( "Torrents", function() {
    if ( !activateTable( "torrentTable" ) ) {
      return;
    }

    changeRequest( globals.shift.torrentUpdater, "torrent-get", {
      fields: updateTorrentFields,
      ids: "recently-active"
    }, globals.shift.updateTorrents.onSuccess );

    hideTable( globals.oldTableId );
    $( "torrentTable" ).show();

    menuSelect( "torrent" );
    Object.values( menu.sessionGroupMain ).invoke( "hide" );
    Object.values( menu.torrentGroupDetails ).invoke( "hide" );
    Object.values( menu.torrentGroupMain ).invoke( "show" );
  }, { id: "menu_torrent" } ),
  torrentGroupMain: {
    add: newMenu( "Add", function() {
      var popup = $("popupAdd");
      popup.observe( "click", preventDefault );
      showPopup( popup );
    } ),
    startAll: newMenu( "Start all", function() {
      doRequest( newRequest( "torrent-start", {} ) );
    } ),
    stopAll: newMenu( "Stop All", function() {
      doRequest( newRequest( "torrent-stop", {} ) );
    } )
  },
  torrentGroupDetails: {
    files: newMenu( "Files", torrentClickHandler.curry( updateHandler.curry(  "files", "fileTable",  [ "id", "fileStats", "sizeWhenDone" ], renderFileTable ) ), { id: "menu_files" } ),
    peers: newMenu( "Peers", torrentClickHandler.curry( updateHandler.curry( "peers", "peerTable", [ "id", "peers" ], renderPeerTable ) ), { id: "menu_peers" } ),
    trackers: newMenu( "Trackers", torrentClickHandler.curry( updateHandler.curry( "trackers", "trackerTable",  [ "id", "trackerStats" ], renderTrackerTable ) ), { id: "menu_trackers" } ),
    details: newMenu( "Details", torrentClickHandler.curry( updateHandler.curry( "details", "detailsTable", torrentDetailsFieldKeys, renderDetailsTable ) ), { id: "menu_details" } )
  },
  session: newMenu( "Session", function( event ) {
    if ( !menuSelect( "session" ) || !activateTable( "sessionTable" ) ) {
      return;
    }
    doRequest( newRequest( "session-get", {}, function( response ) {
      globals.shift.session = response.responseJSON.arguments;
      hideTable( globals.oldTableId );
      renderSessionTable();
    } ) )
    Object.values( menu.torrentGroupMain ).invoke( "hide" );
    Object.values( menu.torrentGroupDetails ).invoke( "hide" );
    Object.values( menu.sessionGroupMain ).invoke( "show" );
  }, { id: "menu_session" } ),
  sessionGroupMain: {
    shift: newMenu( "Shift", function() {
      if ( !menuSelect( "shift" ) || !activateTable( "shiftTable" ) ) {
        return;
      }
      hideTable( globals.oldTableId );
      renderShiftTable();
    }, { id: "menu_shift" } ),
    blockList: newMenu( "Blocklist", function() {
      doRequest( newRequest( "blocklist-update" ) );
    } ),
    shutDown: newMenu( "Shut Down", function() {
      if ( confirm( "Are you sure you want to shut down Transmission?" ) ) {
        doRequest( newRequest( "session-close" ) )
      }
    } )
  },
  about: newMenu( "About", function( event ) {
    showPopup( $("popupAbout") );
  } )
}

var menuSelected = null;

// Returns true if a new menu item was selected.
function menuSelect( item ) {
  var menuId = "menu_" + item;
  if ( menuSelected ) {
    if ( menuSelected.id == menuId ) {
      return false;
    }
    else {
      menuSelected.removeClassName( "selected" );
    }
  }
  menuSelected = $( menuId );
  menuSelected.addClassName( "selected" );
  return true;
}

function group( g ) {
  return Object.values( g ).invoke( "addClassName", "sub" );
}

function initFileUploads() {
  var fakeFileUpload = rE('div');
  fakeFileUpload.className = 'fakefile';
  fakeFileUpload.appendChild( rE('input') );
  fakeFileUpload.appendChild( rE( "div", { class: "button" }, "Select" ) );

  var element = $("fileZapper");

  var clone = fakeFileUpload.cloneNode(true);
  element.parentNode.appendChild(clone);
  element.relatedElement = clone.getElementsByTagName('input')[0];
  element.onchange = element.onmouseout = function () {
    this.relatedElement.value = this.value;
  }
}

function selectFileLed( file ) {
  globals.uploadFile = file;
  globals.uFileLed.set( file );
  globals.uUrlLed.set( !file );
}

function renderPage() {
  globals.uFile = rInput( null, { type: "file", style: "display: none" } );
  globals.uFileLed = rLed().observe( "click", selectFileLed.curry( true ) );
  globals.uFileName = rInput( null, { readonly: "readonly" } );
  globals.uBrowse = rInput( null, { "class": "styled upload", type: "button", value: "Browse" } );
  globals.uUrlLed = rLed().observe( "click", selectFileLed.curry( false ) );
  globals.uUrl = rInput( null );
  globals.uDir = rInput( globals.shift.session["download-dir"] );

  globals.uPausedLed = rLed();
  globals.uPausedLed.observe( "click", globals.uPausedLed.toggle );

  globals.uUpload = rInput( null, { "class": "styled upload", type: "button", value: "Upload" } );
  selectFileLed( true );

  globals.body.insert( rE( "div", { id: "popups" } ).insert(
    rE( "div", { id: "popupAbout", "class": "popup" } ).hide().insert( rE( "h1", {}, "Shift / Transmission" ) )
    .insert( rE( "h2", {}, "By Killemov" )  ).insert( "Version: " + globals.shift.version + " / " + globals.shift.session.version )
    .insert( rE( "p", {}, "Shift is a minimalistic approach to maximum control of your Transmission." ) ).insert( rE( "p", {},
    "Shift is currently targeted at Mozilla Firefox 4+ with degraded and untested functionality for other or older browsers.<br>Shift was built on prototype.js. ( V1.7.1 - Hacked! )" )
    )
  ).insert(
    rE( "div", { id: "popupGeneral", "class": "popup" } ).hide().insert( rE( "ul")
    .insert( ["Select Visible", "Deselect Visible", "Select All", "Deselect All", "Reset"].collect( function( item ) {
      return rE( "li", { id: item.toLowerCase() } ).insert( item );
    } ) ) )
  ).insert(
    rE( "div", { id: "popupStatus", "class": "popup" } ).hide().insert( rE( "ul")
    .insert( ["Select", "Details", "Start", "Stop", "Announce", "Verify", "Remove", "Trash"].collect( function( item ) {
      return rE( "li", { id: item.toLowerCase() } ).insert( item );
    } ) ) )
  ).insert(
    rE( "div", { id: "popupPriority", "class": "popup" } ).hide().insert( rE( "ul" )
    .insert( filePriorityKeys.collect( function( item ) {
      return rE( "li", { id: item } ).insert( rLed( item ) );
    } ) ) )
  ).insert(
    rE( "div", { id: "popupAdd", "class": "popup" } ).hide().insert(
      rE( "h1", {}, "Add a torrent" ) ).insert( rInput( null, { type: "file", style: "display: none" } ) ).insert(
      rE("div").insert( [ globals.uFileLed, rSpan( { "class": "upload" }, "File" ), globals.uFileName, globals.uBrowse ] ) ).insert(
      rE("div").insert( [ globals.uUrlLed, rSpan( { "class": "upload" }, "Url" ), globals.uUrl ] ) ).insert(
      rE("div").insert( [ rSpan( { "class": "upload", id: "labelDir" }, "Dir" ), globals.uDir ] ) ).insert(
      rE("div").insert( [ globals.uPausedLed, rSpan( { id: "labelPaused" }, "Add paused" ), globals.uUpload ] ) )
  ) );

  globals.uFile.observe( "change", function( event ) {
    globals.uFileName.value = event.originalTarget.files[0].name;
    selectFileLed( true );
  } );

  globals.uUrl.observe( "change", selectFileLed.curry( false ) );
  globals.uUrl.observe( "keypress", selectFileLed.curry( false ) );

  var uBrowseHandler = function( event ) {
    globals.uFile.click();
    event.stop();
  };

  globals.uFileName.observe( "click", uBrowseHandler );
  globals.uBrowse.observe( "click", uBrowseHandler );

  globals.uUpload.observe( "click", function( event ) {
    if ( globals.uploadFile ) {
      if ( globals.uFileName.value.length > 0 ) {
        wait();
        processFile( globals.uFile.files[0], globals.uDir.value, globals.uPausedLed.value );
        $("popups").close();
        globals.uFileName.value = "";
      }
    }
    else {
      if ( globals.uUrl.value.length > 0 ) {
        wait();
        processURL( globals.uUrl.value, globals.uDir.value, globals.uPausedLed.value );
        $("popups").close();
        globals.uUrl.value = "";
      }
    }
  } )

  var clazz = { "class": "label" };

  globals.body.insert( rE( "div", { id: "stats" } )
    .insert( rSpan( clazz, "Dl/Ul: " ) ).insert( rSpan( { id: "downloadSpeed" }, "0Bs" ) ).insert( " / ")
    .insert( rSpan( { id: "uploadSpeed" }, "0Bs" ) ).insert( rE( "br" )).insert(rSpan( clazz ).insert( "Total: ") )
    .insert( rSpan( { id: "downloadedBytes" }, "0B" ) ).insert( " / ").insert( rSpan( { id: "uploadedBytes" }, "0B" ) )
    .insert( rE( "br" )).insert( rSpan( clazz, "Free: " ) ).insert( rSpan( { id: "download-dir-free-space" }, "0B" ) )
  );

  renderers["downloadSpeed"] = renderSpeed;
  renderers["uploadSpeed"] = renderSpeed;
  renderers["downloadedBytes"] = renderSize;
  renderers["uploadedBytes"] = renderSize;
  renderers["download-dir-free-space"] = renderSize;

  var menulist = rE( "ul", { id: "menu" } )
    .insert( menu.torrent ).insert( group( menu.torrentGroupMain ) )
    .insert( group( menu.torrentGroupDetails ).invoke( "hide" ) )
    .insert( menu.session ).insert( group( menu.sessionGroupMain ).invoke( "hide" ) )
    .insert( menu.about );
  globals.body.insert( menulist );
  menuSelect( "torrent" );
}

var fileRead = window.File && window.FileReader && window.FileList && window.Blob;

function processFile( file, target, paused ) {
  if ( file == null || file.size == 0 ) {
    return;
  }

  var dropId = "drop" + dropCount++;
  $( "filter" ).insert( rSpan( { id: dropId, "class": "drop" }, "Uploading " + file.name  ) );

  // Upload the file first to see if Transmission can handle it.
  var torrentReader = new FileReader();
  Event.observe( torrentReader, "load", function( event ) {
    // Reader adds some metadata that ends with "base64,".
    var search = "base64,"
    var index = event.target.result.indexOf( search );
    if ( index > -1 ) {
      var result = event.target.result.substring( index + search.length );
      doRequest( newRequest( "torrent-add", { "download-dir": target, "paused": paused, "metainfo": result }, function( response ) {
        $( dropId ).remove();
        // Transmisssion could not handle the file. Parse it for URL extraction.
        if ( response.responseJSON.result != "success" ) {
          var textReader = new FileReader();
          Event.observe( textReader, "load", function( event ) {
            var urls = textReader.result.match( torrentRegexp );
            if ( urls ) {
              urls.each( processURL );
            }
          } );
          textReader.readAsText( file );
        }
      } ) );
    }
  } );
  torrentReader.readAsDataURL( file );
}

function processURL( url, target, paused ) {
  if ( url == null || url.length == 0 ) {
    return
  }

  doRequest( newRequest( "torrent-add", { "download-dir": target, "paused": paused, "filename": url }, function( response ) {
    if ( response.responseJSON.result == "success" ) {
      if ( url.startsWith( "magnet:" ) ) {
        globals.magnets.push( response.responseJSON.arguments["torrent-added"].id );
      }
      updateTorrents( [ response.responseJSON.arguments["torrent-added"] ] );
    }
  } ) );
}

document.observe( "dom:loaded", function() {
  globals.html = $$("html")[0];
  globals.head = globals.html.down();
  globals.body = $$("body")[0];

  // This is the catch-all element for clicking outside popups or modal dialogs.
  globals.body.insert( rE( "div", { id: "outside" } ) );

  /**
   * Handle the following dropped items:
   * - torrent file
   * - url to torrent
   * - magnet link
   * - text file containing urls to torrents or magnet links
   */
  globals.html.observe( "dragenter", preventDefault );
  globals.html.observe( "dragover", preventDefault );
  globals.html.observe( "drop", function( event ) {
    event.stop();
    var files = event.dataTransfer.files;
    if ( files && files.length > 0 ) {
      for ( var i = 0, len = files.length; i < len; ++i ) {
        processFile( files[i] )
      }
    }
    else {
      processURL( event.dataTransfer.getData( "URL" ) )
    }
  } );

  doRequest( { url: "shift.json", evalJSON: "force", method: "get", onSuccess: function( response ) {
    globals.shift.defaultSettings = response.responseJSON;
    var cookies = document.cookie.split( ";" );
    var cookie = cookies.find( function( s ) {
      return s.startsWith( COOKIE_KEY );
    } );
    var data = cookie == null ? {} : window.atob( cookie.substring( COOKIE_KEY.length ) ).evalJSON();
    globals.shift.settings = Object.extend( Object.extend( {}, globals.shift.defaultSettings ), data );
  } } );

  // Get first time session data and initialize page.
  doRequest( newRequest( "session-get", {}, function( response ) {
    globals.lastResponse = response;
    globals.shift.session = response.responseJSON.arguments;
    document.title = "Shift " + globals.shift.version + " / Transmission " + globals.shift.session.version;
    renderPage();
    updateFields( globals.shift.session );

    // Get id and status for ALL torrents.
    doRequest( newRequest( "torrent-get", { fields: ["id","status"] }, function( response ) {
      updateTorrents( response.responseJSON.arguments.torrents );
      filterTorrents();

      // Get full update for visible torrents and start periodical updaters.
      doRequest( newRequest( "torrent-get", { fields: Object.keys( torrentColumns ), ids: globals.torrents.select( function( torrent ) { return torrent.display } ).pluck( "id" ) }, function( response ) {
        updateTorrents( response.responseJSON.arguments.torrents );
        filterTorrents();
        globals.activeTableId = "torrentTable";
        renderTorrentTable();
        sortTorrents();
        renderTorrents();

        globals.shift.torrentUpdater = doRequest( globals.shift.updateTorrents );
        globals.shift.statsUpdater = doRequest( globals.shift.updateStats );
        globals.shift.sessionUpdater = doRequest( globals.shift.updateSession );
      } ) );
    } ) );
  } ) );
} );
