/**
 * Shift: a Transmission web interface.
 *
 * © 2021 Killemov.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a
 * letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 */

try {
  console.assert( 1 );
}
catch( ex ) {
  var _alert = function( msg ) {
    alert( msg );
  }
  console = {
    "error": _alert,
    "exception": _alert
  }
  [ "assert", "clear", "count", "debug", "dir", "dirxml", "group", "groupCollapsed", "groupEnd", "info", "log", "memoryProfile",
    "memoryProfileEnd", "profile", "profileEnd", "table", "time", "timeEnd", "timeStamp", "trace", "warn" ].each( function( k ) {
      console[ k ] = function() {};
  } );
}

function preventBubbling( e ) {
  if( e ) {
    e.stopPropagation();
  }
}

function preventDefault( e ) {
  if( e ) {
    e.stop();
  }
}

function createId( prefix, label ) {
  return prefix + label.toLowerCase().replace( /\s/g, "_" ).underscore();
}

function rE( tag, attributes, content ) {
  return new Element( tag, attributes ).insert( content );
}

function rA( href, text, attributes ) {
  return rE( "a", Object.extend( { href: href, target: "_blank" }, attributes ), undefined === text ? unescape( href ) : text );
}

function rB( attributes ) {
  attributes = Object.extend( { "class": "styled apply", type: "button", value: "Apply" }, attributes );
  var value = attributes.value;
  delete attributes.value;
  return rE( "button", attributes, value );
}

var rC = rE.curry( "td" );
var rD = rE.curry( "div" );
function rI( value, attributes ) {
  return rE( "input", Object.extend( { "class": "styled", type: "text", value: value }, attributes ) )
    .observe( "keydown", preventBubbling )
    .observe( "focus", handleFocus );
}

function rM( label, click, attributes ) {
  attributes = Object.extend( { id: createId( "menu_", label ) }, attributes );
  return rE( "li", attributes ).insert( label ).observe( "click", click );
}
var rR = rE.curry( "tr" );
var rS = rE.curry( "span" );
var rT = rE.curry( "textarea", { "class": "styled" } );

Object.extend( Object, {
  copyNestedProperties: function( source, target, keys, nestedKeys ) {
    keys.each( function( k ) {
      if( !Object.prototype.hasOwnProperty.call( source, k ) ) {
        return;
      }
      if( nestedKeys ) {
        Object.copyNestedProperties( source[ k ], target[ k ], nestedKeys );
      }
      else {
        target[ k ] = source[ k ];
      }
    } );
  },
  isBoolean: function( o ) {
    return "boolean" === typeof o;
  },
  isEmpty: function( o ) {
    for( var k in o ) {
      if( Object.prototype.hasOwnProperty.call( o, k ) ) {
        return false;
      }
    }
    return true;
  },
  select: function( o, iterator ) {
    var result = {};
    for( var k in o ) {
      if( iterator.call( iterator, o[ k ], k ) ) {
        result[ k ] = o[ k ];
      }
    }
    return result;
  }
} );

Object.extend( Number.prototype, {
  limit: function( min, max ) {
     return Math.min( Math.max( min, this ), max );
  }
} );

Object.extend( Array.prototype, {
  concatUnique: function( element ) {
    if( Object.isArray( element ) ) {
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

  insert: function( i ) {
    this.length = i > this.length ? i : this.length;
    i = i < 0 ? this.length : i;

    this.splice.apply( this, [ i, 0 ].concat( Array.slice( arguments, 1 ) ) );
    return this;
  },

  isEmpty: function() {
     return 0 === this.length;
  },

  pushUnique: function( element ) {
    if( !this.include( element ) ) {
      this.push( element )
    }
    return this;
  },

  remove: function( element ) {
    var i = this.indexOf( element );
    if( i >= 0 ) {
        this.splice( i, 1 );
    }
    return this;
  },

  setLength: function( length ) {
    this.length = length;
    return this;
  },

  sortByProperty: function( property, order, isString ) {
    var _prepare = function( s ) {
      return s ? s.replace( nowordRegexp, " " ) : s;
    }

    // Counter unstable Array.sort with additional index. ( a.i == null ? 0 : a.i - b.i )
    this.sort( isString ? function( a, b ) {
      var aa = _prepare( a[ property ] );
      var bb = _prepare( b[ property ] );
      return aa == bb ? ( undefined === a.i ? 0 : a.i - b.i ) : undefined === bb ? -1 : bb.localeCompare( aa, { sensitivity: "base" } ) * ( order ? -1 : 1 );
    } : function( a, b ) {
      var aa = a[ property ];
      var bb = b[ property ];
      return aa == bb ? ( undefined === a.i ? 0 : a.i - b.i ) : undefined === bb || ( order ? aa < bb : bb < aa ) ? -1 : 1;
    } );
    return this;
  }
} );

Object.extend( String.prototype, {
  includes: function( s ) {
     return this.indexOf( s ) > -1;
  }
} );

Object.extend( Element.prototype, {
  trigger: function( t ) {
    if( document.createEvent ) {
      var e = document.createEvent( "HTMLEvents" );
      e.initEvent( t, true, true );
      return this.dispatchEvent( e );
    }
    if( this.fireEvent ) {
      return this.fireEvent( "on" + t );
    }
  }
} );

Object.extend( Event.prototype, {
  toString: function() {
    return "@" + this.timeStamp + ": " + this.currentTarget.nodeName + " " + this.target.nodeName + "." + this.type;
  }
} );

function copyToClipboard( o ) {
  document.observe( "copy", function( e ) {
    e.clipboardData.setData('text/plain', JSON.stringify( o, null, 2) );
    e.preventDefault();
    document.stopObserving( "copy" );
  } );
  document.execCommand( "copy" );
}

function handleFocus( e ) {
  e.stop();
  var target = e.target;
  target.focus();
  target.setSelectionRange( target.value.length, target.value.length );
}

function isEmpty( s ) {
  return undefined === s || null === s || s.length === 0 || Object.isEmpty( s );
}

// riffwave by Pedro Ladaria <pedro.ladaria at Gmail dot com>
var FastBase64 = {
  chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
  encLookup: [],

  init: function() {
    for( var i = 0; i < 4096; ++i ) {
      this.encLookup[ i ] = this.chars[ i >> 6 ] + this.chars[ i & 0x3F ];
    }
  },

  encode: function( src ) {
    var len = src.length;
    var dst = "";
    var i = 0;
    while( len > 2 ) {
      n = src[ i ] << 16 | src[ i + 1 ] << 8 | src[ i + 2 ];
      dst+= this.encLookup[ n >> 12 ] + this.encLookup[ n & 0xFFF ];
      len-= 3;
      i+= 3;
    }
    if( len > 0 ) {
      var n1 = ( src[ i ] & 0xFC ) >> 2;
      var n2 = ( src[ i ] & 0x03 ) << 4;
      if( len > 1 ) n2 |= ( src[ ++i ] & 0xF0 ) >> 4;
      dst += this.chars[ n1 ];
      dst += this.chars[ n2 ];
      if( 2 == len ) {
        var n3 = ( src[ i++ ] & 0x0F ) << 2;
        n3 |= ( src[ i ] & 0xC0 ) >> 6;
        dst += this.chars[ n3 ];
      }
      if( 1 == len ) {
        dst += '=';
      }
      dst += '=';
    }
    return dst;
  } // end Encode
}

FastBase64.init();

function riffwave( data ) {
  this.data = [];    // Array containing audio samples
  this.wav = [];     // Array containing the generated wave file
  this.dataURI = ""; // http://en.wikipedia.org/wiki/Data_URI_scheme

  this.header = {                           // OFFS SIZE NOTES
    chunkId:       [ 0x52,0x49,0x46,0x46 ], //  0   4  "RIFF" = 0x52494646
    chunkSize:     0,                       //  4   4  36 + SubChunk2Size = 4+(8+SubChunk1Size)+(8+SubChunk2Size)
    format:        [ 0x57,0x41,0x56,0x45 ], //  8   4  "WAVE" = 0x57415645
    subChunk1Id:   [ 0x66,0x6d,0x74,0x20 ], // 12   4  "fmt " = 0x666d7420
    subChunk1Size: 16,                      // 16   4  16 for PCM
    audioFormat:   1,                       // 20   2  PCM = 1
    numChannels:   1,                       // 22   2  Mono = 1, Stereo = 2...
    sampleRate:    8000,                    // 24   4  8000, 44100...
    byteRate:      0,                       // 28   4  SampleRate*NumChannels*BitsPerSample/8
    blockAlign:    0,                       // 32   2  NumChannels*BitsPerSample/8
    bitsPerSample: 8,                       // 34   2  8 bits = 8, 16 bits = 16
    subChunk2Id:   [ 0x64,0x61,0x74,0x61 ], // 36   4  "data" = 0x64617461
    subChunk2Size: 0                        // 40   4  data size = NumSamples*NumChannels*BitsPerSample/8
  };

  function u32ToArray( i ) {
    return [ i & 0xFF, i >> 8 & 0xFF, i >> 16 & 0xFF, i >> 24 & 0xFF ];
  }

  function u16ToArray( i ) {
    return [ i & 0xFF, i >> 8 & 0xFF ];
  }

  function split16bitArray( data ) {
    var r = [];
    var j = 0;
    for( var i = 0, len = data.length; i < len; ++i ) {
      r[ j++ ] = data[ i ] & 0xFF;
      r[ j++ ] = data[ i ] >> 8 & 0xFF;
    }
    return r;
  }

  this.make = function( data ) {
    this.data = data;
    this.header.blockAlign = this.header.numChannels * this.header.bitsPerSample >> 3;
    this.header.byteRate = this.header.blockAlign * this.sampleRate;
    this.header.subChunk2Size = this.data.length * this.header.bitsPerSample >> 3;
    this.header.chunkSize = 36 + this.header.subChunk2Size;

    this.wav = this.header.chunkId.concat(
      u32ToArray( this.header.chunkSize ),
      this.header.format,
      this.header.subChunk1Id,
      u32ToArray( this.header.subChunk1Size ),
      u16ToArray( this.header.audioFormat ),
      u16ToArray( this.header.numChannels ),
      u32ToArray( this.header.sampleRate ),
      u32ToArray( this.header.byteRate ),
      u16ToArray( this.header.blockAlign ),
      u16ToArray( this.header.bitsPerSample ),
      this.header.subChunk2Id,
      u32ToArray( this.header.subChunk2Size ),
      16 == this.header.bitsPerSample ? split16bitArray( this.data ) : this.data
    );
    this.dataURI = "data:audio/wav;base64," + FastBase64.encode( this.wav );
  };

  if( Array.isArray( data ) ) {
    this.make( data );
  }
};

var COOKIE_KEY = "shift.settings=";
var HEADER_TRANSMISSION = "X-Transmission-Session-Id";
var DAY_MS = 24 * 60 * 60 * 1000;

function newRequest( method, args, onSuccess, properties ) {
  var request = {
    parametersObject: {
      method: method ? method : "",
      arguments: args ? args : {}
    }
  }
  if( onSuccess ) {
    request.onSuccess = onSuccess;
  }
  if( properties ) {
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

function success( response ) {
  return "success" == response.responseJSON.result;
}

var globals = {
  torrentStatus: {
    "-1": {
      label: "All",
      columns: [ "menu", "queuePosition", "status", "percentDone", "rateDownload", "rateUpload", "sizeWhenDone", "name" ],
      fields: [ "id", "status", "percentDone", "rateDownload", "rateUpload", "eta", "uploadedEver" ],
      keyCode: 65
    },
    0: {
      label: "Stopped",
      columns: [ "menu", "queuePosition", "status", "errorString", "percentDone", "sizeWhenDone", "name" ],
      fields: [ "id", "status", "error" ],
      keyCode: 83,
      onChange: function() {
        changeRequest( globals.shift.torrentUpdater, "torrent-get", {
          ids: globals.torrents.select( function( torrent ) {
              return torrent.status == globals.torrentStatusCurrent;
            } ).pluck( "id" )
        }, function( response ) {
          setDefaultTorrentRequest();
          globals.shift.updateTorrents.onSuccess( response );
        } )
      }
    },
    1: {
      label: "Check waiting",
      columns: [ "menu", "queuePosition", "status", "percentDone", "corruptEver", "sizeWhenDone", "name" ],
      fields: [ "id", "status", "percentDone", "corruptEver" ],
      keyCode: 67
    },
    2: {
      label: "Checking",
      columns: [ "menu", "queuePosition", "status", "percentDone", "recheckProgress", "corruptEver", "sizeWhenDone", "name" ],
      fields: [ "id", "status", "percentDone", "recheckProgress", "corruptEver", "sizeWhenDone" ],
      keyCode: 67
    },
    3: {
      label: "Download waiting",
      columns: [ "menu", "queuePosition", "status", "percentDone", "sizeWhenDone", "name" ],
      fields: [ "id", "status", "percentDone" ],
      keyCode: 68
    },
    4: {
      label: "Downloading",
      columns: [ "menu", "queuePosition", "status", "percentDone", "rateDownload", "rateUpload", "sizeWhenDone", "name" ],
      fields: [ "id", "status", "percentDone", "rateDownload", "rateUpload", "uploadedEver", "eta" ],
      keyCode: 68
    },
    5: {
      label: "Seed waiting",
      columns: [ "menu", "queuePosition", "status", "percentDone", "sizeWhenDone", "name" ],
      fields: [ "id", "status", "percentDone" ],
      keyCode: 85
    },
    6: {
      label: "Seeding",
      columns: [ "menu", "queuePosition", "status", "rateUpload", "uploadedEver", "uploadRatio", "sizeWhenDone", "name" ],
      fields: [ "id", "status", "rateUpload", "uploadedEver", "uploadRatio" ],
      keyCode: 85
    }
  },
  torrentStatusDefault: 4,
  hashIndex: 0,
  headerState: 0,
  magnets: [],
  torrents: [],
  removed: [],
  torrentHash: {},
  rpcUrl: "../rpc",
  requestHeaders: [ HEADER_TRANSMISSION, "" ],

  shift: {
    settings: {},
    version: "1.0",
    updateTorrents: newPeriodicalUpdater( "torrent-get", 2, function( response ) {
      var args = getArguments( response );

      if( args.removed && args.removed.length > 0 ) {
        getQueuePositions( args.removed );
      }
      if( args.torrents ) {
        updateTorrents( response );
        filterTorrents();
        if( "torrentTable" == globals.activeTableId ) {
          if( globals.torrentStatusChanged ) {
            setTorrentsColumnsVisible( globals.torrentStatus[ globals.torrentStatusCurrent ].columns );
          }
          sortTorrents();
          renderTorrents( true );
        }
      }
    }, {}, "recently-active" ),

    updateStats: newPeriodicalUpdater( "session-stats", 5, function( response ) {
      updateFields( globals.shift.sessionStats = getArguments( response ) );
      renderTitle();
    } ),

    updateSession: newPeriodicalUpdater( "session-get", 60, function( response ) {
      updateFields( globals.shift.session = getArguments( response ) );
    } )
  },
  staticFields: [ "name", "percentDone", "queuePosition", "sizeWhenDone" ]
}
globals.torrentStatusCurrent = globals.torrentStatusDefault;
globals.updateFields = globals.torrentStatus[ globals.torrentStatusCurrent ].fields;

var comparators = {
  "<": function( x, y ) { return x < y },
  "<=": function( x, y ) { return x <= y },
  "==": function( x, y ) { return x == y },
  ">=": function( x, y ) { return x >= y },
  ">": function( x, y ) { return x > y }
}
var defaultOptions = normalizeOptions( Object.keys( comparators ) );

var filePriority = { "high": { label: "+" }, "normal": { label: " " }, "low": { label: "-" }, "none": { label: "" } };
var filePriorityKeys = Object.keys( filePriority );
var uploadStatus = { "loading": { label: "&gt;" }, "loaded": { label: "*" }, "uploading": { label: "^" }, "added": { label: "+" }, "duplicate": { label: "!" } };
var uploadStatusKeys =  Object.keys( uploadStatus );
var fileMenuItems = [ "Rename" ];
var nowordRegexp = /\\W/ig;
var torrentRegexp = /(\b(https?|ftp|magnet):\/?\/?[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|])/ig;
var trackerRegexp = /(\b(https?|udp):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|])/ig;
var dropCount = 0;

var sessionFields = {
  "blocklist-size": { readOnly: true },
  "config-dir": { readOnly: true },
  "download-dir-free-space": { readOnly: true, render: renderSize },
  "encryption": { values: normalizeOptions( [ "required", "preferred", "tolerated" ] ) },
  // actions return true if handling should continue.
  "peer-port": { action: function( row, keyCell, valueCell, o ) {
    var l = rLed( false, { id: "port-is-open", title: "Checking", readonly: true } );
    keyCell.insert( l );
    doRequest( "port-test", {}, function( response ) {
      updateFields( getArguments( response ) );
    } );

    return true;
  } },
  "rpc-version": { readOnly: true },
  "rpc-version-minimum": { readOnly: true },
  "units": { ignore: true },
  "version": { readOnly: true }
}

var torrentActionLabels = [ "Select", "Details", "Check", "Start", "Start Now", "Stop", "Reannounce", "Relocate", "Recycle", "Remove", "Trash" ];
var torrentActions = {};

torrentActionLabels.concat( [ "add", "get", "set", "Rename" ] ).each( function( action ) {
  var label = action;
  action = action.toLowerCase();
  torrentActions[ action ] = {
     label: label,
     method: "torrent-" + function( a ) {
       switch( a ) {
          case "check": return "verify";
          case "relocate": return "set-location";
          case "rename": return "rename-path";
          default: return a.replace( " ", "-" );
       }
    } ( action ) };
} );
torrentActions[ "trash" ].method = torrentActions[ "remove" ].method;

var torrentFields = {
  "activityDate": { render: renderDateTime },
  "addedDate": { render: renderDateTime },
  "bandwidthPriority": {
    edit: true,
    values: normalizeOptions( { "-1": "Low", "0": "Normal", "1": "High" } ).sortByProperty( "value" )
  },
  "comment": {
    render: function( comment ) {
      return comment.replace( torrentRegexp, "<a href=\"$1\" target=\"_blank\">$1</a>" );
    },
    sss: true },
  "corruptEver": { render: renderSize },
  "creator": { sss: true },
  "dateCreated": { render: renderDateTime },
  "desiredAvailable": { render: renderSize },
  "doneDate": { render: renderDateTime },
  "downloadDir": { edit: true },
  "downloadedEver": { render: renderSize },
  "downloadLimit": { edit: true },
  "downloadLimited": { edit: true },
  "error": {},
  "errorString": {},
  "eta": {},
  "etaIdle": {},
  "files": { ignore: true, sss: true },
  "fileStats": { ignore: true },
  "hashString": { sss: true },
  "haveUnchecked": { render: renderSize },
  "haveValid": { render: renderSize },
  "honorsSessionLimits": { edit: true },
  "id": { ignore: true },
  "index": { ignore: true },
  "isFinished": {},
  "isPrivate": {},
  "isStalled": {},
  "leftUntilDone": { render: renderSize },
  "location": { edit: true },
  "magnetLink": { render: function( link ) { return rA( link ) }, sss: true },
  "manualAnnounceTime": {},
  "maxConnectedPeers": {},
  "metadataPercentComplete": { render: renderPercentage },
  "name": { sss: true },
  "node": { ignore: true },
  "peer-limit": { edit: true },
  "peers": { ignore: true },
  "peersConnected": {},
  "peersFrom": { ignore: true },
  "peersGettingFromUs": {},
  "peersSendingToUs": {},
  "percentDone": { render: renderPercentage },
  "pieces": { render: renderPieces },
  "pieceCount": {},
  "pieceSize": { render: renderSize },
  "priorities": { ignore: true },
  "queuePosition": { edit: true },
  "rateDownload": { render: renderSpeed },
  "rateUpload": { render: renderSpeed },
  "recheckProgress": { render: renderPercentage },
  "secondsDownloading": {},
  "secondsSeeding": {},
  "seedIdleLimit": { edit: true },
  "seedIdleMode": { edit: true },
  "seedRatioLimit": { edit: true },
  "seedRatioMode": { edit: true },
  "sizeWhenDone": { render: renderSize },
  "startDate": { render: renderDateTime },
  "status": { render: renderStatus },
  "torrentFile": {
    render: function( file ) {
      file = file.substring( file.lastIndexOf( "/" ) + 1 );
      return globals.shift.settings.torrentLinkEnabled ? rA( globals.shift.settings.torrentLink + file , file ) : file;
    },
    sss: true
  },
  "totalSize": { render: renderSize },
  "trackers": { ignore: true },
  "trackerAdd": { ignore: true, edit: true },
  "trackerRemove": { ignore: true, edit: true },
  "trackerReplace": { ignore: true, edit: true },
  "trackerStats": { ignore: true },
  "uploadedEver": { render: renderSize },
  "uploadLimit": { edit: true },
  "uploadLimited": { edit: true },
  "uploadRatio": { render: renderPercentage },
  "wanted": { ignore: true },
  "webseeds": { ignore: true },
  "webseedsSendingToUs": {}
};

var torrentFieldKeys = Object.keys( torrentFields );

var torrentDetailsUpdateKeys = Object.keys( Object.select( torrentFields, function( value ) {
  value.readOnly = value.readOnly || !value.edit;
  return !value.ignore;
} ) ).without(
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
).pushUnique( "id" );

function showDone() {
  globals.html.style.cursor = "auto";
}

function showWait() {
  globals.html.style.cursor = "progress";
}

function getQueuePositions( removed ) {
  if( globals.version < 2.4 ) {
    if( removed ) {
      removed.each( removeTorrentById );
    }
    return;
  }
  doTorrentGet( [ "id", "queuePosition" ], undefined, function( response ) {
    if( removed ) {
      removed.each( removeTorrentById );
    }
    updateTorrents( response );
    filterTorrents();
    sortTorrents();
    renderTorrents( true );
  } );
}

function postTorrentRemove( action, response ) {
  if( !success( response ) ) {
    sendNotification( 1, "Torrent removal error." );
  }
}

function getTorrents( ids ) {
  return ids.collect( function( id ) { return globals.torrentHash[ id ]; } );
}

function recycleTorrents( torrents ) {
  var t = torrents.shift();
  if( undefined === t ) {
    return;
  }
  var req = new XMLHttpRequest();
  req.open( "GET", globals.shift.settings.torrentLink + getFilePart( t.torrentFile ) );
  req.responseType = "arraybuffer";

  req.onload = function( e ) {
    var next = function( e ) {
      if( req.status != 200 ) {
        sendNotification( 1, "Recycling error. Status " + req.status + ": " + req.statusText + ".", getBody( t ) );
        return true;
      }
      if( !req.response ) {
        sendNotification( 1, "Recycling error. No response data.", getBody( t ) );
        return true;
      }

      var s = String.fromCharCode.apply( null, new Uint8Array( req.response ) );
      if( !s.startsWith( "d8:announce" ) && !s.startsWith( "d13:announce-list" ) ) {
        sendNotification( 1, "Recycling error. File is not a torrent.", getBody( t ) );
        return true;
      }

      globals.removed.concatUnique( t.id );
      doRequest( "torrent-remove", { ids: [ t.id ] }, function( response ) {
        if( !success( response ) ) {
          sendNotification( 1, "Recycling error. Could not remove torrent.", getBody( t ) );
          s = null;
          recycleTorrents( torrents );
          return;
        }
        doRequest( "torrent-add", {
          "download-dir": globals.shift.session[ "download-dir" ],
          "metainfo": window.btoa( s ),
          "dummy": function() {
            s = null;
            return undefined;
          }()
        },
        function( response ) {
          if( !success( response ) ) {
            sendNotification( 1, "Recycling error. Could not add torrent.", getBody( t ) );
          }
          recycleTorrents( torrents );
        } );
      } );
      return false;
    }
    if( next( e ) ) {
      req.response = null;
      recycleTorrents( torrents );
    }
  }
  req.send( null );
}

function handleTorrentActionClick( e ) {
  var action = e.target.id;

  closePopup();

  if( !torrentActions[ action ] ) {
    return;
  }

  showWait();

  if( "details" == action ) {
    $( "menu_details" ).click();
    return;
  }

  var selected = getSelected();
  var selectedMagnetIds = [];
  var preRequest = function( request ) { return request };
  var postRequest = preRequest;
  var postResponse = null;

  var args = {
    ids: selected.pluck( "id" )
  }

  var d = globals.dialogs[ action ];
  switch( action ) {
    case "recycle":
      doTorrentGet( [ "id", "torrentFile" ], args.ids, function( response ) {
        recycleTorrents( updateTorrents( response ) );
      } );
      return;

    case "relocate":
      args.location = d.target.value;
      args.move = d.move.value;
      postResponse = function( response ) {
        doTorrentGet( [ "id", "downloadDir" ], args.ids, function( response ) {
          var update = getArguments( response ).torrents;
          var oldPaths = {};
          var ts = getTorrents( update.pluck( "id" ) ).each( function( torrent ) {
            oldPaths[ torrent.id ] = torrent.downloadDir;
          } );
          updateTorrents( response );
          ts = ts.partition( function( torrent ) {
             return torrent.downloadDir === args.location;
          } );

          if( ts[ 0 ].length > 0 ) {
            var b = {};
            if( ts[ 0 ].length == 1 ) {
              b = getBody( ts[ 0 ][ 0 ], "\nRelocated to:\n\"" + args.location + "\"" );
            }
            else {
              b.body = "Relocated\n" + ts[ 0 ].collect( function( torrent ) {
                return "\"" + oldPaths[ torrent.id ] + torrent.name + "\"";
              } ).join( "\n" ) + "\nto\n\"" + args.location + "\"";
            }
            sendNotification( 2, "Relocation successful.", b );
          }

          if( ts[ 1 ].length > 0 ) {
            var b = {};
            if( ts[ 1 ].length == 1 ) {
              b = getBody( ts[ 1 ][ 0 ], "\nCould not relocate to:\n\"" + args.location + "\"" );
            }
            else {
              b.body = "Could not relocate\n" + ts[ 1 ].collect( function( torrent ) {
                return "\"" + torrent.downloadDir + torrent.name + "\"";
              } ).join( "\n" ) + "\nto\n\"" + args.location + "\"";
            }
            sendNotification( 1, "Relocation error.", b );
          }
        } );
      }
      break;

    case "rename":
      var rename = {
         path: getTargetPath(),
         name: d.fileName.value
      }
      if( -1 == globals.pathDepth ) {
        rename.node = globals.currentFile.node.down( "td.name" );
      }

      renameFiles( [ rename ] );
      return;

    case "trash":
      var partitioned = selected.partition( isMagnet );
      args.ids = partitioned[ 1 ].pluck( "id" );
      selectedMagnetIds = partitioned[ 0 ].pluck( "id" );

      if( args.ids.length > 0 ) {
        args[ "delete-local-data" ] = true;
        if( selectedMagnetIds.length > 0 ) {
          postResponse = function( response ) {
            doRequest( torrentActions[ action ].method, { ids: selectedMagnetIds }, postTorrentRemove ).curry( action );
            globals.removed.concatUnique( selectedMagnetIds );
          }
        }
      }
      else {
        args.ids = selectedMagnetIds;
        selectedMagnetIds = [];
      }
    case "remove":
      postRequest = function( request ) {
        globals.removed.concatUnique( args.ids );
        return request
      }
      postResponse = postResponse || postTorrentRemove.curry( action );
  }

  selected.invoke( "deselect" );
  postResponse = postResponse || function( response ) {
    setTimeout( getErrorData.curry( args.ids ), 1000 );
  }

  // If the array of ids is empty, Transmission assumes ALL.
  if( args.ids.length > 0 ) {
    var request = preRequest( newRequest( torrentActions[ action ].method, args, postResponse ) );
    request = postRequest( request );
    doRequest( request );
  }
}

function handleTorrentMenuClick( e ) {
  $( "popupTorrent" ).stopObserving( "click" ).hide();
  globals.action = e.target.id;

  if( !torrentActions[ globals.action ] ) {
    return;
  }

  var popup = false;
  var selected = getSelected();
  var d = globals.dialogs;
  var input = null;
  d.additional.update();

  switch( globals.action ) {
    case "select":
      globals.currentTorrent.toggleSelect();
      return;

    case "relocate":
      popup = true;
      d.additional.insert( d.relocate.insert );
      input = d.relocate.target;
      break;

    case "remove":
      popup = globals.shift.settings.confirmRemove;
      d.additional.insert( [ d.remove.trash.set( false ), "Trash" ] );
      break;

    case "trash":
      popup = globals.shift.settings.confirmTrash;
      d.additional.insert( [ d.remove.trash.set( true ), "Trash" ] );
      break;
  }
  globals.selected = selected;
  if( popup ) {
    closePopup( e )
    var l = torrentActions[ globals.action ].label;
    var p = showPopup( "popupDialog" );
    p.down( "h1" ).update( l );
    p.down( "span" ).update( globals.action );
    d.torrents.update( "\"" + selected.pluck( "name" ).join( "\",<br>\n\"" ) + "\"" );
    d.action.update( l ).setAttribute( "id", globals.action );
    if( input ) {
      input.focus();
    }
    return;
  }
  handleTorrentActionClick( e );
}

function selectTorrents( action ) {
  var select = "select visible" == action;
  var visible = select || "deselect visible" == action;
  select = select || "select all" == action;
  globals.torrents.each( function( torrent ) {
    torrent.set( !visible || visible && torrent.isDisplayed() ? select : torrent.isSelected() );
  } );
}

function storeSelection() {
  globals.selectedIds = getSelected().pluck( "id" );
}

function restoreSelection() {
  globals.torrents.each( function( torrent ) {
    torrent.set( globals.selectedIds.include( torrent.id ) );
  } );
}

var torrentColumns = {
  "menu": {
    label: rLed().observe( "click", function( e ) {
      showPopup( "popupGeneral", function( e ) {
        var action = e.target.id;
        switch( action ) {
          case "store selection":
            storeSelection();
            break;
          case "restore selection":
            restoreSelection();
            break;
          default:
            selectTorrents( action );
            // TODO: Set every filter to default settings
            break;
        }
      }, e );
    } ),
    render: function() {
      return rLed();
    },
    listHandler: function( e, torrent ) {
      globals.currentTorrent = torrent;
      [ $( "recycle" ) ].invoke( globals.shift.settings.torrentLinkEnabled && torrent.error == 3 ? "show" : "hide" );
      showPopup( "popupTorrent", handleTorrentMenuClick, e );
    }
  },

  "queuePosition": {
    label: "Q",
    listHandler: function( e, torrent ) {
      globals.currentTorrent = torrent;
      showPopup( "popupQueue", function( e ) {
        var action = e.target.id;
        doRequest( "queue-move-" + action, { ids: filterDisplayed( getSelected() ).pluck( "id" ) }, getQueuePositions.curry( null ) );
      }, e, function( popup, e ) {
        return e.shiftKey;
      } );
    }
  },

  "status": {
    filter: {
      active: true,
      visible: true,
      value: globals.torrentStatusCurrent,
      renderNode: renderStatusFilter,
      match: function( torrent ) {
        return undefined === torrent.status || -1 == this.value || this.value == torrent.status
      }
    }
  },

  "errorString": {
    label: "Error"
  },

  "recheckProgress": {
    label: "Checked"
  },

  "corruptEver": {
    label: "Corrupt"
  },

  "percentDone": {
    label: "Done",
    render: renderPercentDone,
    defaultOrder: false,
    filter: {
      active: true,
      comparatorLabel: "<=",
      comparator: comparators[ "<=" ],
      value: 1.0,
      renderNode: renderPercentDoneFilter,
      match: function( torrent ) {
        return undefined === torrent.percentDone || this.comparator( torrent.percentDone, this.value );
      }
    }
  },

  "rateDownload": {
    label: "Down"
  },

  "rateUpload": {
    label: "Up", render: renderRateUpload
  },

  "uploadedEver": {
    label: "Uploaded", render: renderSizeCell
  },

  "uploadRatio": {
    label: "Karma", render: renderUploadRatio
  },

  "sizeWhenDone": {
    label: "Size",
    render: renderSizeCell,
    filter: {
      active: true,
      comparatorLabel: ">=",
      comparator: comparators[ ">=" ],
      value: 0,
      renderNode: renderSizeFilter,
      match: function( torrent ) {
        return undefined === torrent.sizeWhenDone || this.comparator( torrent.sizeWhenDone, this.value );
      }
    }
  },

  "name": {
    render: renderName,
    isString: true,
    filter: {
      active: true,
      value: "",
      renderNode: renderNameFilter,
      match: function( torrent ) {
        return undefined === torrent.name || ( this.isRegExp ? this.value.test( torrent.name ) : torrent.name.toLowerCase().include( this.value ) );
      }
    }
  }
}

globals.torrentColumnHash = Object.values( torrentColumns );

Object.copyNestedProperties( torrentFields, torrentColumns, Object.keys( torrentColumns ), [ "sss" ] );

var filters = Object.values( torrentColumns ).pluck( "filter" ).compact();

function filterTorrents() {
  return globals.torrents.select( function( torrent ) {
    return torrent._display = filters.all( function( filter ) { return !filter.active || filter.match( this ) }, torrent );
  } );
}

function filterDisplayed( torrents ) {
   return torrents.filter( function( torrent ) {
     return torrent.isDisplayed();
  } );
}

function filterSelected( torrents ) {
  return torrents.filter( function( torrent ) {
    return torrent.isSelected();
  } );
}

function getSelected() {
  var selected = filterDisplayed( filterSelected( globals.torrents ) );
  return selected.isEmpty() ? [ globals.currentTorrent ] : selected;
}

var fileColumns = {
  "priority": { label: rLed().observe( "click", function( e ) {
    e.stop();
    showPopup( "popupFiles", function( e ) {
      $( "popupFiles" ).stopObserving( "click" ).hide();
      globals.action = e.target.id;
      switch( globals.action ) {
        case "rename":
          showPopup( "popupBatchRename" );
          globals.dialogs.batchrename.search.focus();
      }
    }, e );
  } ) },
  "filePercentDone": { label: "Done" },
  "length": { label: "Size" },
  "name": { defaultOrder: false, sss: true }
}

var peerColumns = {
  "menu": { label: rLed(), render: rLed },
  "address": { label: "Peer", defaultOrder: false, sss: true },
  "port": {},
  "rateToClient": { label: "Down", render: renderSpeed },
  "rateToPeer": { label: "Up", render: renderSpeed },
  "progress": { label: "Has", render: renderPercentage },
  "flagStr": { label: "Flags", render: renderFlags },
  "clientName": { label: "Client" }
}

var peerFlags = {
  "D": "Currently downloading (interested, unchoked)",
  "d": "Your client wants to download, but peer doesn't want to send (interested, choked)",
  "E": "Peer is using Protocol Encryption (all traffic)",
  "e": "Peer is using Protocol Encryption (handshake only)",
  "F": "Peer was involved in a hashfailed piece (not necessarily a bad peer, just involved)",
  "H": "Peer was obtained through DHT",
  "h": "Peer connection established via UDP hole-punching",
  "I": "Peer is an incoming connection (peer initiated connection, not you)",
  "K": "Peer unchoked your client, but your client is not interested",
  "L": "Peer is local (discovered via network broadcast, or in reserved local IP ranges)",
  "O": "Optimistic unchoke (was choked and is now getting a \"second-chance\")",
  "P": "Peer is using uTP (UDP-based transport, instead of the default TCP)",
  "S": "Peer is snubbed (unchoked, but request timed out)",
  "T": "Peer is using uTP (UDP-based transport, instead of the default TCP)",
  "U": "Currently uploading (interested, unchoked)",
  "u": "Peer wants your client to upload, but your client doesn't want to (interested, choked)",
  "X": "Peer was included in peerlists obtained through Peer Exchange (PEX)",
  "?": "Your client unchoked the peer but the peer is not interested"
}

var trackerColumns = {
  "menu": {
    label: rLed(),
    render: rLed,
    listHandler: function( e, tracker ) {
      globals.currentTracker = tracker;
      showPopup( "popupTracker", function( e ) {
        globals.action = e.target.id;
        switch( globals.action ) {
          case "remove":
            doRequest( "torrent-set", { ids: [ globals.currentTorrent.id ], trackerRemove: [ globals.currentTracker ] } );
        }
      }, e );
    } },
  "announce": { label: "Tracker", defaultOrder: false, sss: true },
  "seederCount": { label: "Seeds" },
  "leecherCount": { label: "Leech" },
  "lastAnnouncePeerCount": { label: "Peers" },
  "lastAnnounceTime": { label: "Announced", render: renderDateTimeShort },
  "nextAnnounceTime": { label: "Next", render: renderDateTimeShort },
  "lastScrapeTime": { label: "Scraped", render: renderDateTimeShort },
  "nextScrapeTime": { label: "Next", render: renderDateTimeShort }
}

var webseedColumns = {
  "webseeds": { label: "Webseeds" }
}

globals.trackerColumnHash = Object.values( trackerColumns ).select( function( column ) {
  return column.render;
} );

var detailsColumns = {
  "key": {},
  "value": {}
}

var peersFromColumns = detailsColumns;
var sessionColumns = detailsColumns;
var shiftColumns = detailsColumns;

var Torrent = Class.create( {
  initialize: function( torrent ) {
    this._selected = false;
    this._display = false;
    this.update( torrent );
  },
  isDisplayed: function() {
    return this._display;
  },
  isMagnet: function() {
    return ( undefined === this.metadataPercentComplete || 1.0 > this.metadataPercentComplete ) && 0.0 == this.percentDone && 0.0 == this.sizeWhenDone;
  },
  isSelected: function() {
    return this._selected;
  },
  select: function() {
    return this.set( true );
  },
  deselect: function() {
    return this.set( false );
  },
  toggleSelect: function( select ) {
    return this.set( undefined === select ? !this._selected : select );
  },
  set: function( selected ) {
    if( this._selected != selected ) {
      this._selected = selected;
      if( this.node ) {
        this.node.toggleClassName( "selected", this._selected );
        this.node.down( ".led" ).set( selected );
      }
    }
    return this;
  },
  update: function( torrent ) {
    this._dirty = this._dirty || [];
    for( var k in torrent ) {
      var o = this[ k ];
      var v = torrent[ k ];
      if( this[ k ] != v ) {
        switch( k ) {
          case "id":
            this[ k ] = v;
            continue;

          case "error":
            this.errorString = null;
            break;

          case "status":
            switch( globals.torrentStatus[ v ].label ) {
              case "Seed waiting":
              case "Seeding":
                if( undefined !== this[ k ] && "Downloading" == globals.torrentStatus[ this[ k ] ].label ) {
                  this.done();
                }
            }
            break;
        }
        this[ k ] = v;
        this._dirty.pushUnique( "hashString" == k ? "name" : k );
      }
    }
    return this;
  },
  done: function() {
    sendNotification( 2, "Torrent download complete.", getBody( this ) );
    playDoneSound();
    return this;
  }
} );

function rLed( k, attributes ) {
  return Object.extend( rS( Object.extend( { "class": "led" }, attributes ) ), {
    value: false,
    set: function( k ) {
      var found = false;
      if( Object.isBoolean( k ) ) {
        k = k ? "normal" : "none";
      }
      k = k ? k : "none";
      this.value = k != "none";
      for( p in filePriority ) {
        this.toggleClassName( p, k == p );
        found |= k == p;
      }
      if( found ) {
         return this.update( filePriority[ k ].label );
      }
      for( p in uploadStatus ) {
        this.toggleClassName( p, k == p );
        found |= k == p;
      }
      if( found ) {
         return this.update( uploadStatus[ k ].label );
      }
      return this.update( k );
    },
    toggle: function() {
      this.set( !this.value );
    },
    makeToggle: function() {
      return this.observe( "click", this.toggle );
    }
  } ).set( k );
}

function $S(className) {
  var sheets = document.styleSheets;
  if( sheets.length < 1 ) {
    return null;
  }

  for( var i = 0, slen = sheets.length; i < slen; ++i ) {
    var rules = sheets[ i ].cssRules;

    for( var j = 0, rlen = rules.length; j < rlen; ++j ) {
      if( rules[ j ].selectorText == className ) {
        return rules[ j ].style;
      }
    }
  }
  return null;
}

var nameClass = $S( "div.name" );

function showPopup( popup, handler, e, keepOpen ) {
  popup = $( popup );
  var popups = $( "popups" );
  var outside = $( "outside" );
  var elements = [ outside, popups, popup ];

  popups.close = function( e ) {
    if( keepOpen && keepOpen( popup, e ) ) {
      return;
    }
    elements.invoke( "hide" ).invoke( "stopObserving", "click" );
    delete popups.close;
  };

  popup.observe( "click", preventBubbling );
  outside.observe( "click", popups.close );

  elements.each( function( e ) { e.style.display = "block" } );

  if( handler ) {
     popup.observe( "click", handler );
  }

  if( e ) {
    popup.style.left = e.pointerX() + "px";
    popup.style.top = Math.min( e.pointerY() - globals.html.scrollTop, window.innerHeight - popup.offsetHeight - 8 ) + "px";
    popup.observe( "click", closePopup );
  }
  else
  {
    popup.style.left = window.innerWidth / 2 - popup.offsetWidth / 2 + "px";
    popup.style.top = window.innerHeight / 2 - popup.offsetHeight / 2 + "px";
  }

  return popup;
}

function closePopup( e ) {
  var popups = $( "popups" );
  if( popups.close ) {
    popups.close( e );
  }
}

function getTorrentFileNames( torrent ) {
  torrent = torrent || globals.currentTorrent;
  doTorrentGet( [ "id", "files", "name" ], [ torrent.id ], function( response ) {
    if( success( response ) ) {
      updateTorrents( response );
      $( "fileBody" ).update();
      renderFiles( torrent );
    }
  } );
}

function renameFiles( renames ) {
  var args = renames.shift();
  if( undefined === args ) {
    getTorrentFileNames();
    return;
  }

  if( getFilePart( args.path ) == args.name ) {
    renameFiles( renames );
    return;
  }

  args.ids = globals.currentTorrent.id;
  var node = args.node;
  delete args.node;

  doRequest( "torrent-rename-path", args, function( response ) {
    var args = getArguments( response );
    if( success( response ) ) {
      if( node ) {
        node.update( args.name );
      }
    }
    else {
      sendNotification( 1, "Renaming error.", { body: "Could not rename\n\"" + getFilePart( args.path ) + "\nto\n\"" + args.name + "\"" } );
    }
    renameFiles( renames );
  } );
}

function renderDateTime( seconds ) {
  return seconds > 0 ? new Date( 1000 * seconds ).toJSON().substr( 0, 19 ).replace( "T", " " ) : "-";
}

function renderDateTimeShort( seconds ) {
  if( seconds > 0 ) {
    var s = renderDateTime( seconds );
    seconds *= 1000;
    var now = new Date().getTime()
    return seconds < now - DAY_MS || seconds > now + DAY_MS ? s.substr( 0, 10 ) : s.substr( 11, 8 )
  }
  return "-";
}

function renderFlags( flags, peer, attribute, cell ) {
  if( cell ) {
     cell.title = flags.toArray().collect( function( flag ) { return flag + " = " + peerFlags[ flag ] } ).join( "\n" );
  }
  return flags;
}

var pctClassNames = [ "pct0", "pct25", "pct50", "pct75", "pct100" ];

function setPercentageClass( element, percentage, multiplier ) {
  multiplier = typeof multiplier === "undefined" ? 1.0 : multiplier;
  percentage *= multiplier;
  percentage = Math.max( 0.0, Math.min( 1.0, percentage ) );
  for( var i = 0, len = pctClassNames.length; i < len; ++i ) {
    element.toggleClassName( pctClassNames[ i ], i == Math.floor( percentage * ( len - 1 ) ) );
  }
}

function renderPercentDone( percentage, torrent, attribute, cell ) {
  if( cell && torrent.eta > -1 ) {
    cell.title = renderInterval( torrent.eta );
  }
  if( isNaN( percentage ) ) {
    return "";
  }
  if( cell ) {
    setPercentageClass( cell, percentage );
  }
  return renderPercentage( percentage );
}

function renderPieces( pieces, cell ) {
  var canvas = cell.down( "canvas.pieces" );
  var w = cell.getWidth();
  var h = cell.getHeight();

  if( !canvas ) {
    canvas = rE( "canvas", { "class": "pieces" } ).hide();
    canvas.height = h;
    canvas.width = w;
    globals.percentDone = null;
    // workaround for getComputedStyle being made "browser consistent"
    globals.body.insert( canvas );
    globals.piecesColor = canvas.getStyle( "color" );
    canvas.remove();
    canvas.show();
  }

  if( !globals.currentTorrent.pieceCount || w == canvas.width && globals.percentDone == globals.currentTorrent.percentDone ) {
    return canvas;
  }
  canvas.width = w;
  globals.percentDone = globals.currentTorrent.percentDone;

  var ppp = globals.currentTorrent.pieceCount / w; // pieceCount per pixel

  var ctx = canvas.getContext( "2d" );
  ctx.strokeStyle = globals.piecesColor;
  ctx.clearRect( 0, 0, w, h );
  pieces = window.atob( pieces );

  var bitIndex = 0.0;
  var sb, eb, db;
  var b, c;
  var j = 0;
  for( var i = 0, len = pieces.length; i < len; ++i ) {
    b = b << 8 | pieces.charCodeAt( i );
    bitIndex += 8.0;
    sb = Math.round( bitIndex );
    while( bitIndex > ppp ) {
      bitIndex -= ppp;
      eb = Math.round( bitIndex );
      db = sb - eb;

      c = b >> eb;
      c <<= 32 - db;
      c = c - ( c >> 1 & 0x55555555 );
      c = ( c & 0x33333333 ) + ( c >> 2 & 0x33333333 );
      c = ( c + ( c >> 4 ) & 0x0F0F0F0F ) * 0x01010101 >> 24;

      ctx.globalAlpha = c / db;
      ctx.beginPath();
      ctx.moveTo( j, 0 );
      ctx.lineTo( j++, h );
      ctx.stroke();

      sb = eb;
    }
  }
  return canvas;
}

function renderUploadRatio( percentage, torrent, ignore, cell ) {
  if( isNaN( percentage ) ) {
    return "";
  }
  if( cell ) {
    setPercentageClass( cell, percentage, 0.25 );
  }
  return renderPercentage( percentage );
}

function renderInterval( seconds ) {
  return seconds < 300 ? seconds + "s" : Math.floor( seconds / 60 ) + "m";
}

function renderName( name, torrent, ignore, cell ) {
  return ( torrent.isMagnet() ? "magnet#" + torrent.hashString + ": " : "" ) + name;
}

function renderPercentage( percentage, decimals ) {
  decimals = Object.isNumber( decimals ) ? decimals : 2;
  return ( percentage * 100.0 ).toFixed( decimals ) + "%";
}

function renderRateUpload( rateUpload, torrent, ignore, cell ) {
  if( cell ) {
    cell.title = renderSize( torrent.uploadedEver );
  }
  return isNaN( rateUpload ) ? "" : renderSpeed( rateUpload );
}

function renderSize( size, decimals ) {
  decimals = Object.isNumber( decimals ) ? decimals : 2;
  return size < 1024 ? size + " B" :
    size < 1048576 ? ( size / 1024 ).toFixed( decimals ) + " KB" :
    size < 1073741824 ? ( size / 1048576 ).toFixed( decimals ) + " MB" :
    ( size / 1073741824 ).toFixed( decimals ) + " GB"
}

function renderSizeCell( size, torrent, ignore, cell ) {
  if( size > 1024 && cell ) {
    cell.title = size + " B";
  }
  return renderSize( size );
}

function renderSpeed( size ) {
  return renderSize( size, 0 ) + "s";
}

function renderStatus( status ) {
  return globals.torrentStatus[ status ].label;
}

function normalizeOptions( options ) {
  var normalized = [];
  if( Object.isArray( options ) ) {
    for( var i = 0, len = options.length; i < len; ++i ) {
      normalized.push( { value: options[ i ], text: options[ i ] } );
    }
  }
  else {
    for( var k in options ) {
      var i = parseInt( k );
      k = isNaN( i ) ? k : i;
      normalized.push( Object.isFunction( options[ k ] ) ? { value: options[ k ], text: k } : { value: k, text: options[ k ] } );
    }
  }
  return normalized;
}

function renderFilter( label ) {
  var f = rD( { "class": "filter"} ).hide();
  f.insert( rE( "label", null, label + ":" ) );
  f.insert( rS( { "class" : "filterInput" } ) );
  return f;
}

function renderSelect( options ) {
  var select = rE( "select", options.select );
  if( options.options ) {
    for( var i = 0, len = options.options.length; i < len; ++i ) {
      var o = options.options[ i ];
      select.insert( rE( "option", o ).update( o.text ? o.text : o.value ) );
    }
  }
  if( options.select ) {
    select.value = options.select.value;
  }
  select.observe( "keydown", preventBubbling );
  return select;
}

function renderStatusFilter() {
  var f = renderFilter( "Status" );
  f.down( "span.filterInput" ).insert(
    renderSelect( { select: { id: "statusSelect", value: globals.torrentStatusCurrent, "class": "styled" },
    options: Object.keys( globals.torrentStatus ).collect( function( k ) {
      return { value: k, text: globals.torrentStatus[ k ].label };
    } ) } ).observe( "change", function( e ) {
      torrentColumns.status.filter.value = this.value;
      filterTorrents();
      globals.torrentStatusChanged = true;
      globals.torrentStatusCurrent = this.value;
      $( "torrentBody" ).select( "tr" ).findAll( Element.visible ).invoke( "toggleClassName", "active", false );
      globals.currentIndex = -1;
      globals.updateFields = globals.torrentStatus[ globals.torrentStatusCurrent ].fields;
      if( globals.torrentStatus[ globals.torrentStatusCurrent ].onChange ) {
        globals.torrentStatus[ globals.torrentStatusCurrent ].onChange();
      }
      else {
        setDefaultTorrentRequest();
      }
    } )
  );
  return f;
}

function normalizePercentage( value ) {
  value = parseFloat( value );
  return isNaN( value ) || value > 100.00 ? 100.00 : value < 0.00 ? 0.00 : value / 100.00;
}

function normalizeInteger( value ) {
  value = parseInt( value );
  return isNaN( value ) || value < 0 ? 0 : value;
}

function renderPercentDoneFilter() {
  var filter = torrentColumns.percentDone.filter;
  var select = renderSelect( { select: { "class": "styled", value: filter.comparatorLabel }, options: defaultOptions } );
  var input = rI( renderPercentage( filter.value ), { "class": "styled number" } );

  var _handler = function( e ) {
    filter.comparator = comparators[ select.value ];
    filter.value = normalizePercentage( input.value );
    input.value = renderPercentage( filter.value );
    filterTorrents();
  };

  select.observe( "change", _handler );
  input.observe( "change", _handler );
  input.observe( "blur", _handler );

  var f = renderFilter( "Done" );
  f.down( "span.filterInput" ).insert( select ).insert( input );
  return f;
}

function renderSizeFilter() {
  var filter = torrentColumns.sizeWhenDone.filter;
  var select = renderSelect( { select: { "class": "styled", value: filter.comparatorLabel }, options: defaultOptions } );
  var input = rI( filter.value, { "class": "styled number" } );

  var _handler = function( e ) {
    filter.comparator = comparators[ select.value ];
    filter.value = normalizeInteger( input.value );
    input.value = filter.value;
    filterTorrents();
  };

  select.observe( "change", _handler );
  input.observe( "change", _handler );
  input.observe( "blur", _handler );

  var f = renderFilter( "Size" );
  f.down( "span.filterInput" ).insert( select ).insert( input );
  return f;
}

var noMatchRegExp = new RegExp( "\0" );

function renderNameFilter() {
  var filter = torrentColumns.name.filter;
  var input = rI( filter.value, { id: "doneInput" } );
  var regExpLed = rLed().makeToggle();

  var _handler = function( e ) {
    filter.value = input.value.toLowerCase();
    if( filter.isRegExp = regExpLed.value ) {
      try {
        filter.value = new RegExp( input.value, "i" );
      }
      catch( ex ) {
        filter.value = noMatchRegExp;
      }
    }
    filterTorrents();
  };

  input.observe( "change", _handler );
  input.observe( "blur", _handler );
  regExpLed.observe( "click", _handler );

  var f = renderFilter( "Name" );
  f.down( "span.filterInput" ).insert( input ).insert( " RegExp: " ).insert( regExpLed );
  return f;
}

function removeTorrentById( id ) {
  globals.removed.pushUnique( id );

  var t = globals.torrentHash[ id ];
  if( t ) {
    t.node.remove();
    globals.torrents.remove( t );
    sendNotification( 3, "Torrent removed.", getBody( t ) );
  }
  delete globals.torrentHash[ id ];
}

function onFailure( response ) {
  globals.lastResponse = response;
  if( response.status === 409 ) {
    // All requests use a reference to this array.
    globals.requestHeaders[ 1 ] = response.getHeader( HEADER_TRANSMISSION );
    return true;
  }
  if( response.status >= 500 ) {
    window.location.reload( true );
  }
  return false;
}

function doRequest( method, args, onSuccess, properties ) {
  showWait();
  var requestBase = Object.isString( method ) ? newRequest( method, args, onSuccess, properties ) :  method;
  requestBase.parameters = requestBase.parameters ? requestBase.parameters : Object.toJSON( requestBase.parametersObject );

  var request = Object.extend( {
    url: globals.rpcUrl,
    method: "post",
    requestHeaders: globals.requestHeaders,
    onSuccess: function( response ) {
      globals.lastResponse = response;
    },
    onFailure: function( response ) {
      if( onFailure( response ) ) {
        doRequest( requestBase );
      }
    },
    onComplete: function( response ) {
      showDone();
    }
  }, requestBase );

  return request.frequency && request.frequency > 0 ?
    new Ajax.PeriodicalUpdater( "items", request.url, request ) :
    new Ajax.Request( request.url, request );
};

function doTorrentGet( fields, ids, onSuccess ) {
  doRequest( "torrent-get", { fields: fields, ids: ids }, onSuccess );
};

var renderers = {
  "downloadSpeed": renderSpeed,
  "uploadSpeed": renderSpeed,
  "downloadedBytes": renderSize,
  "uploadedBytes": renderSize,
  "download-dir-free-space": renderSize
}

var updaters = {
  "port-is-open": function( element, value ) {
    element.set( value ).writeAttribute( "title", value ? "Open" : "Closed" )
  }
}

function updateFields( object ) {
  for( var k in object ) {
    if( object.hasOwnProperty( k ) ) {
      var o = object[ k ];
      var element = $( k );

      if( updaters[ k ] ) {
        return updaters[ k ]( element, o );
      }

      if( Object.isString( o ) || Object.isNumber( o ) || Object.isBoolean( o ) ) {
        var renderer = renderers[ k ];

        if( element ) {
          updateElement( element, renderer ? renderer( o ) : o );
        }
        else if( renderer ) {
          renderer( o );
        }
      }
      else if( !Object.isFunction( o ) && !Object.isArray( o ) ) {
        updateFields( o );
      }
    }
  }
}

function getErrorData( ids ) {
  if( ids.isEmpty() ) {
    return;
  }
  doTorrentGet( [ "id", "error", "errorString" ], ids, function( response ) {
    updateTorrents( response ).each( function( torrent ) {
      sendNotification( 2, "Torrent error.", { body: "\"" + torrent.name + "\":\n" + torrent.errorString } );
    } );
    filterTorrents();
  } );
}

function getFieldData( ids ) {
  if( ids.isEmpty() ) {
    return;
  }
  doTorrentGet( globals.staticFields.concat( globals.updateFields ), ids, function( response ) {
    updateTorrents( response );
    filterTorrents();
  } );
}

function getMagnetData( ids ) {
  if( ids.isEmpty() ) {
    return;
  }
  doTorrentGet( [ "id", "hashString", "metadataPercentComplete" ], ids, updateTorrents );
}

function createTorrent( torrent ) {
  var t = new Torrent( torrent );
  globals.torrents.push( t );
  globals.torrentHash[ t.id ] = t;
  return t;
}

function updateTorrents( response ) {
  var torrents = [];
  var ids = [];  // Ids of torrents to be updated
  var eids = []; // Ids of torrents with errors
  var mids = []; // Ids of magnets for special handling

  getArguments( response ).torrents.each( function( torrent ) {
    if( globals.removed.include( torrent.id ) ) {
      return;
    }

    var t = globals.torrentHash[ torrent.id ];
    if( t ) {
      t.update( torrent );
      if( t.error !== 0 && isEmpty( t.errorString ) ) {
        eids.push( t.id )
      }
    }
    else {
      t = createTorrent( torrent );
    }
    torrents.push( t );

    if( globals.magnets.include( t.id ) ) {
      if( !t.isMagnet() ) {
        t._dirty.pushUnique( "name" );
        ids.push( t.id );
        globals.magnets.remove( t.id );
      }
    }
    else {
      if( t.isMagnet() ) {
        mids.push( t.id );
      }
    }
  } );

  globals.magnets.concatUnique( mids );

  getFieldData( ids );
  getMagnetData( mids );
  getErrorData( eids );

  return torrents;
}

function updateOrder( columnsObject, property ) {
  var noReverse = undefined === property;

  if( !property ) {
    for( var k in columnsObject ) {
      if( columnsObject[ k ].order != null ) {
        property = k;
        break;
      }
    }
  }

  if( !property ) {
    for( var k in columnsObject ) {
      if( columnsObject[ k ].defaultOrder != null ) {
        columnsObject[ k ].order = columnsObject[ k ].defaultOrder;
        return k;
      }
    }
    return null;
  }

  for( var k in columnsObject ) {
    if( k == property ) {
      columnsObject[ k ].order = undefined === columnsObject[ k ].order ? false : noReverse ? columnsObject[ k ].order : !columnsObject[ k ].order;
    }
    else {
      delete columnsObject[ k ].order;
    }
  }
  return property;
}

function sortTorrents( property, reverse ) {
  var torrents = globals.torrents;
  if( torrents.isEmpty() ) {
    return;
  }

  property = updateOrder( torrentColumns, property );

  for( var i = 0, len = torrents.length; i < len; ++i ) {
    torrents[ i ].i = i;
  }

  var column = torrentColumns[ property ];

  torrents.sortByProperty( property, column.order, column.isString );

  var setSortClass = function( element ) {
    element.removeClassName( "asc" ).removeClassName( "desc" );
    if( element.className.includes( property ) ) {
        element.addClassName( column.order ? "asc" : "desc" );
    }
  };
  $$( "#torrentTable col" ).each( setSortClass );
  $$( "#torrentTable th" ).each( setSortClass );

  globals.shift.newOrderIds = globals.torrents.pluck( "id" ).join( "" );
  var orderChanged = globals.shift.orderIds != globals.shift.newOrderIds;
  globals.shift.orderIds = globals.shift.newOrderIds;
  var currentNode = $( "torrentBody" ).down();

  var process = orderChanged && currentNode;
  for( var i = 0, len = torrents.length; i < len; ++i ) {
    var torrent = torrents[ i ];
    if( process && torrent.node ) {
      if( torrent.i != i ) {
        currentNode.insert( { after: torrent.node } );
      }
      currentNode = torrent.node;
    }
    delete torrent.i;
  }
}

function isMagnet( torrent ) {
  return torrent.isMagnet();
}

function renderTorrents( refresh ) {
  var torrentBody = $( "torrentBody" );

  if( null === torrentBody ) {
    return;
  }

  var ids = [];  // Ids of torrents to be updated
  globals.torrents.each( function( torrent ) {
    var row = torrent.node;

    if( !torrent.isDisplayed() || globals.removed.include( torrent.id ) ) {
      if( row ) {
        row.hide();
      }
      return;
    }

    if( row ) {
      for( var i = 0, len = torrent._dirty.length; i < len; ++i ) {
        var k = torrent._dirty[ i ];
        var c = torrentColumns[ k ];
        if( !c ) {
          continue;
        }
        var render = c.render || torrentFields[ k ].render;
        if( false !== render ) {
          var content = globals.shift.settings.screenshotMode && torrentFields[ k ].sss ? k.capitalize() + " " + torrent.id : torrent[ k ];
          var cell = row.down( "." + k );
          updateElement( cell, undefined === render || true === render ? content : render( content, torrent, k, cell ) );
        }
      }
      torrent._dirty = [];
      row.style.display = "";
      row.show();
    }
    else {
      ids.push( torrent.id );
      row = renderRow( torrent, torrentColumns, rR( { id: torrent.id } ) );
      refresh ? row.hide() : row.show();
      torrent.node = row;
      torrentBody.insert( row );
      row.observe( "dblclick", function( e ) {
        globals.currentTorrent = globals.torrentHash[ e.currentTarget.id ];
        $( "menu_files" ).click();
      } );
    }
  } );

  if( refresh ) {
    getFieldData( ids );
  }
}

function getTable( id, target, columnDefinitions, renderer, click ) {
  var table = $( id );
  if( table ) {
    return table;
  }
  var t = {
    columns: rE( "colgroup" ),
    header: rE( "thead" ),
    body: rE( "tbody" ),
    footer: rE( "tfoot" )
  }
  t.table = rE( "table", { id: id } ).insert( Object.values( t ) );
  if( columnDefinitions ) {
    var header = rR();
    t.header.insert( header );
    for( var k in columnDefinitions ) {
      var c = columnDefinitions[ k ]
      t.columns.insert( rE( "col", { "class": k } ) );
      var cell = rE( "th", { id: "h_" + k, "class": k } ).insert( c.label || k.capitalize() );
      if( c.click || click ) {
        cell.observe( "click", c.click ? c.click : click );
      }
      header.insert( cell );
    }
    updateOrder( columnDefinitions );
  }
  if( target ) {
    target.insert( t.table );
  }
  if( renderer ) {
    renderer( t );
  }
  return t.table;
}

function renderRow( object, columnDefinitions, row ) {
  row = row || rR();

  for( var k in columnDefinitions ) {
    var render = columnDefinitions[ k ].render;
    if( undefined === render || false !== render ) {
      var cell = rC( Object.extend( { "class": k }, columnDefinitions[ k ].attributes ), "" );
      var content = globals.shift.settings.screenshotMode && columnDefinitions[ k ].sss ? k.capitalize() : object[ k ];
      updateElement( cell, undefined === render || true === render ? content : render( content, object, k, cell ) );
      row.insert( cell );
    }
  }
  return row;
}

function updateElement( element, content ) {
  if( content != element.innerHTML || content === 0 ) {
    element.update( content );
  }
}

function updateRow( object, columnDefinitions, row ) {
  for( var k in columnDefinitions ) {
    var render = columnDefinitions[ k ].render;
    if( undefined === render || false !== render ) {
      var cell = row.down( "." + k );
      var content = globals.shift.settings.screenshotMode && columnDefinitions[ k ].sss ? k.capitalize() : object[ k ];
      updateElement( cell, undefined === render || true === render ? content : render( content, object, k, cell ) );
    }
  }
  return row;
}

function showTorrentTable() {
  if( showContent( "torrentTable" ) ) {
    centerVertically( globals.currentTorrent ? globals.currentTorrent.node : null );
    return;
  }

  var torrentTable = getTable( "torrentTable", globals.content, torrentColumns, function( t ) {
    t.body.id = "torrentBody";

    Object.keys( torrentColumns ).each( function( k ) {
      var style = $S( "." + k );
      if( !style ) {
        var sheet = document.styleSheets[ 0 ];
        sheet.insertRule( "." + k + " {}", 0 );
        var rules = sheet.rules || sheet.cssRules;
        style = rules[ 0 ].style;
      }
      torrentColumns[ k ].style = style;
    } );

    t.table.observe( "click", function( e ) {
      var cell = e.findElement( "td" );
      if( cell ) {
        var row = cell.up( "tr" );
        var column = globals.torrentColumnHash[ row.childElements().indexOf( cell ) ];
        var torrent = globals.currentTorrent = globals.torrentHash[ row.id ];

        var rows = $( "torrentBody" ).select( "tr" ).findAll( Element.visible );
        rows.invoke( "toggleClassName", "active", false );
        row.toggleClassName( "active", true );
        globals.currentIndex = rows.indexOf( row );

        if( column && column.listHandler ) {
          column.listHandler( e, torrent );
        }
        else {
          torrent.toggleSelect();
        }
      }
    } ).observe( "mousedown", function( e ) {
      t.mousedown = 1;
    } ).observe( "mousemove", function( e ) {
      if( t.mousedown ) {
        if( t.mousedown > 3 ) {
          var cell = e.findElement( "td" );
          if( cell ) {
            var row = cell.up( "tr" );
            var torrent = globals.torrentHash[ row.id ];
            torrent.select();
          }
        }
        t.mousedown++;
      }
    } ).observe( "mouseup", function( e ) {
      t.mousedown = 0;
    } );

    var c = rD( { id: "filterContainer" } ).hide();
    var h = rE( "th", { id: "filterContainerCell" } ).insert( c );
    t.header.insert( rR().insert( h ) );

    var _show = function() {
      [ c, h ].invoke( $A( c.children ).select( Element.visible ).length ? "show" : "hide" );
    }

    for( var k in torrentColumns ) {
      var column = torrentColumns[ k ];
      var f = column.filter;
      if( f ) {
        if( f.node ) {
          c.insert( f.node );
        }
        else if( f.renderNode ) {
          c.insert( f.node = f.renderNode() );
        }
        else {
          continue;
        }

        var l = rLed( f.visible ).observe( "click", function( e ) {
          var f = torrentColumns[ this.up().id.substring( 2 ) ].filter;
          this.set( f.visible = !f.visible );
          f.visible ? f.node.show() : f.node.hide();
          _show()
          e.stop();
        } );

        if( f.visible ) {
          f.node.show();
        }

        $( "h_" + k ).insert( l );
      }
    }
    h.writeAttribute( "colSpan", globals.torrentColumnHash.length );
    _show()
  },
  function( e ) {
    sortTorrents( this.id.substring( 2 ) );
  } );
  centerVertically( globals.currentTorrent ? globals.currentTorrent.node : null );
}

function setTorrentsColumnsVisible( columns ) {
  for( var c in torrentColumns ) {
    torrentColumns[ c ].style.display = columns.include( c ) ? "" : "none";
  }
  $( "filterContainerCell" ).colSpan = columns.length;
}

function getPathPart( file, depth ) {
  return file.name.split( "/" ).setLength( depth + 1 ).join( "/" );
}

function getBasePart( name ) {
  return name.substring( 0, name.lastIndexOf( "/" ) + 1 );
}

function getFilePart( name ) {
  return name.substring( name.lastIndexOf( "/" ) + 1 );
}

function getTargetPath( file, depth ) {
  file = file || globals.currentFile;
  depth = depth || globals.pathDepth;
  return -1 == depth ? file.name : getPathPart( file, depth );
}

function getEditableFileName() {
  return getFilePart( getTargetPath() );
}

function getSelectedFiles( files, id, depth ) {
  var path = getPathPart( files.find( function( file ) {
    return file.index == id;
  } ), depth );

  return files.findAll( function( file ) {
    return path == getPathPart( file, depth );
  } ).pluck( "index" );
}

function setFilesPriority( id, files, priority ) {
  var request = newRequest( "torrent-set", { ids: [ id ] }, function( response ) {
    if( success( response ) ) {
      files.each( function( fileIndex ) {
        $( "f_" + fileIndex ).down( ".led" ).set( priority );
      } );
    }
  } );

  ( "none" == priority ? [ "files-unwanted" ] : [ "files-wanted", "priority-" + priority ] ).each( function( selector ) {
    request.parametersObject.arguments[ selector ] = files;
  } );

  doRequest( request );
}

function handleFileMenuClick( e ) {
  var row = e.findElement( "tr" );
  var id = row.id.split( "_" );
  showPopup( "popupFile", function( e ) {
    var torrent = globals.currentTorrent;
    globals.action = e.findElement( "li" ).id;
    var isFile = "f" == id[ 0 ] ;
    id[ 1 ] = parseInt( id[ 1 ] );

    var d = globals.dialogs[ globals.action ];
    switch( globals.action ) {
      case "rename":
        e.currentTarget.stopObserving( "click" ).hide();
        globals.currentFile = torrent.files.find( function( file ) {
          return file.index == id[ 1 ];
        } );
        globals.pathDepth = isFile ? -1 : parseInt( id[ 2 ] );
        d.fileName.value = getFilePart( getTargetPath() );
        showPopup( "popupRename" );
        d.fileName.focus();
        break;
      default:
        var selected = isFile ? [ id[ 1 ] ] : getSelectedFiles( torrent.files, id[ 1 ], parseInt( id[ 2 ] ) );
        setFilesPriority( torrent.id, selected, globals.action );
    }
  }, e );
}

function handleFileClick( e ) {
  var row = e.findElement( "tr" );

  var id = row.id.split( "_" );
  id[ 1 ] = parseInt( id[ 1 ] );

  var selected = "f" == id[ 0 ] ? [ id[ 1 ] ] : null;

  if( selected ) {
    setFilesPriority( globals.currentTorrent.id, selected, row.down( ".led" ).value ? "none" : "normal" );
  }
}

function rMulti( target, elementName, inserts, args ) {
  for( var i = 0, len = inserts ? inserts.length : args ? args.length : 0; i < len; ++i ) {
    var element = rE( elementName, args ? Object.isString( args[ i ] ) ? { id: args[ i ] } : args[ i ] : null );
    if( inserts && inserts[ i ] ) {
      element.insert( inserts[ i ] );
    }
    target.insert( element );
  }
  return target;
}

function changeRequest( request, method, args, onSuccess ) {
  var options = request.options;
  if( method ) {
    options.parametersObject.method = method;
  }
  if( args ) {
    for( var k in args ) {
      options.parametersObject.arguments[ k ] = args[ k ];
    }
  }
  options.parameters = Object.toJSON( options.parametersObject );
  if( onSuccess ) {
    options.onSuccess = onSuccess;
  }
}

function setDefaultTorrentRequest() {
  changeRequest( globals.shift.torrentUpdater, "torrent-get", {
    fields: globals.updateFields,
    ids: "recently-active"
  }, globals.shift.updateTorrents.onSuccess );
}

function playDoneSound() {
  if( globals.shift.settings.soundEnabled ) {
    var s = globals.shift.doneSound;
    s.volume = globals.shift.settings.soundVolume;
    s.play();
  }
}

function prettify( o ) {
  return $H( o ).toArray().collect( function( a ) { return a.join( " = " ) } ).join( "\n" );
}

function sendNotification( level, title, options ) {
  if( "Notification" in window ) {
    sendNotification = function( level, title, options ) {
      if( Notification.permission !== "granted" ) {
        return;
      }
      options = options || {};
      options.icon = options.icon || globals.icon;
      if( globals.shift.settings.notificationLevel >= level ) {
        var notification = new Notification( title, options );
      }
    };
  } else if( "mozNotification" in navigator ) { // Gecko < 22
    sendNotification = function( level, title, options ) {
      if( Notification.permission !== "granted" ) {
        return;
      }
      options = options || {};
      options.icon = options.icon || globals.icon;
      if( globals.shift.settings.notificationLevel >= level ) {
        var notification = navigator.mozNotification.createNotification( title, options.body, options.icon );
        notification.show();
      }
    };
  } else {
    sendNotification = function( level, title, options ) {
    };
  }
  sendNotification( level, title, options );
};

function rFolder( base, fileParts, filePartIndex, index ) {
  var result = globals.shift.settings.screenshotMode ? "Folder " + index : fileParts[ filePartIndex ] + "&sol;";
  if( base ) {
    for( var i = 0; i <= filePartIndex; ++i ) {
      base += globals.shift.settings.screenshotMode ? "Folder " + index : fileParts[ i ] + "/";
    }
    result = rA( base, result );
  }
  return result;
}

function renderFiles( torrent ) {
  var torrentDone = 1 == torrent.percentDone;

  var folderLink = globals.shift.settings.folderLinkEnabled ? globals.shift.settings.folderLink : null;
  if( !torrentDone && globals.shift.session[ "incomplete-dir-enabled" ] ) {
    folderLink = globals.shift.settings.incompleteFolderLinkEnabled ? globals.shift.settings.incompleteFolderLink : null;
  }

  var fileLink = globals.shift.settings.fileLinkEnabled ? globals.shift.settings.fileLink : null;
  var incompleteFileLink = globals.shift.settings.incompleteFolderLinkEnabled ? globals.shift.settings.incompleteFolderLink : null;
  var extension = globals.shift.session[ "rename-partial-files" ] ? ".part" : "";

  var currentNode = $( "fileBody" ).down();
  var dummyNode = null == currentNode ? rR() : null;

  if( dummyNode ) {
    $( "fileBody" ).insert( dummyNode );
    currentNode = dummyNode;
  }

  var lastFileParts = [];
  var row;

  torrent.files.each( function( file, index ) {
    file.index = undefined === file.index ? index : file.index;
    var fileParts = file.name.split( "/" );

    var fileStyle = fileParts.length > 1 ? "padding-left: " + ( fileParts.length * 24 - 24 ) + "px" : "";

    var folderNodes = [];
    for( var i = 0, len = fileParts.length - 1; i < len; ++i ) {
      if( fileParts[ i ] == lastFileParts[ i ] ) {
        continue;
      }
      var rowId = "d_" + file.index + "_" + i;
      row = $( rowId );
      if( row && file.folderNodes ) {
        file.folderNodes.remove( row );
      }
      else {
        row = rR( { id: rowId } )
          .insert( rC( {}, rLed().observe( "click", handleFileMenuClick ) ) )
          .insert( rC( { colspan: 2 } ) )
          .insert( rC( { "class": "name", style: "padding-left: " + i * 24 + "px" } )
            .insert( rFolder( folderLink, fileParts, i, index ) )
            .observe( "dblclick", handleFileClick ) );
      }
      folderNodes.push( row );
      currentNode.insert( { after: row } );
      currentNode = row;
    }
    if( file.folderNodes ) {
      file.folderNodes.invoke( "remove" );
    }
    file.folderNodes = folderNodes;
    lastFileParts = fileParts;

    var fileDone = file.bytesCompleted == file.length;
    var fileName = globals.shift.settings.screenshotMode ? "File " + index : fileParts.last();
    var base = fileDone ? fileLink : incompleteFileLink;

    if( file.node ) {
      if( globals.shift.settingsChanged ) {
        file.node.down( "td.name" ).update( base ? rA( base + file.name + ( fileDone ?  "" : extension ), fileName ) : fileName );
      }
    }
    else {
      Object.extend( file, torrent.fileStats[ file.index ] );
      file.filePercentDone = file.length == 0 ? 1 : file.bytesCompleted / file.length;
      file.node = rR( { id: "f_" + file.index } );
      var cell = rC( { "class": "filePercentDone" } , renderPercentage( file.filePercentDone ) );
      setPercentageClass( cell, file.filePercentDone );
      file.node
        .insert( rC( {}, rLed( filePriorityKeys[ file.wanted ? 1 - file.priority : 3 ] ).observe( "click", handleFileMenuClick ) ) )
        .insert( cell )
        .insert( rC( { "class": "length", title: file.length + " B" }, renderSize( file.length ) ) )
        .insert( rC( { "class": "name", style: fileStyle }, base ? rA( base + file.name + ( fileDone ?  "" : extension ), fileName ) : fileName ).observe( "dblclick", handleFileClick ) );
    }
    currentNode.insert( { after: file.node } );
    currentNode = file.node;
  } );

  globals.shift.settingsChanged = false;

  if( dummyNode ) {
    dummyNode.remove();
  }
}

function showFiles( torrent ) {
  var fileTable = getTable( "fileTable", globals.content, fileColumns, function( t ) {
    t.table.addClassName( "torrent" );
    t.body.id = "fileBody";
    if( torrent.pieces ) {
      var cell = rE( "th", { id: "filePieces", colspan: "4", style: "height: 2em; padding: 0;" } );
      t.header.insert( { top: rR().insert( cell ) } );
      cell.insert( renderPieces( torrent.pieces, cell ) );
    }
    for( var i = 0, len = torrent.files.length; i < len; ++i ) {
      torrent.files[ i ].folderNodes = [];
    }
    renderFiles( torrent );
  },
  function( e ) {
    for( var i = 0, len = torrent.files.length; i < len; ++i ) {
      torrent.files[ i ].i = i;
    }
    var property = updateOrder( fileColumns, this.id.substring( 2 ) );
    var column = fileColumns[ property ];
    var o = column.order;

    if( property == "name" ) {
      torrent.files.sortByProperty( o ? "name" : "index", true, o );
    }
    else {
      torrent.files.sortByProperty( property, o, column.isString );
    }
    renderFiles( torrent );
  } );

  if( torrent.pieces ) {
    renderPieces( torrent.pieces, $( "filePieces" ) );
  }
  torrent.files.each( function( file ) {
    var index = file.index;
    var row = $( "f_" + index );
    var fileStat = torrent.fileStats[ index ];
    if( fileStat.bytesCompleted != file.bytesCompleted ) {
      file.filePercentDone = file.length == 0 ? 1 : fileStat.bytesCompleted / file.length
      var cell = row.down( "td.filePercentDone" );
      setPercentageClass( cell, file.filePercentDone );
      updateElement( cell, renderPercentage( file.filePercentDone ) );
    }
    if( fileStat.wanted != file.wanted || fileStat.priority != file.priority ) {
      row.down( ".led" ).set( filePriorityKeys[ fileStat.wanted ? 1 - fileStat.priority : 3 ] );
    }
    Object.extend( file, fileStat );
  } );
}

function showPeers( torrent ) {
  var peersDiv = $( "peersDiv" );
  if( !peersDiv ) {
    peersDiv = rD( { id: "peersDiv" } );
    peersDiv.addClassName( "torrent" );
    globals.content.insert( peersDiv );
  }

  var peersFromTable = getTable( "peersFromTable", peersDiv, peersFromColumns, function( t ) {
    renderKeyValuePairs( t.body, torrent.peersFrom, null, false );
    t.table.addClassName( "peersFrom keyvalue" );
  } );
  updateKeyValuePairs( peersFromTable.down( "tbody" ), torrent.peersFrom );

  var peerTable = getTable( "peerTable", peersDiv, peerColumns, function( t ) {
    renderKeyValuePairs( t.body, torrent.peersFrom );
  },
  function( e ) {
    torrent.peers.sortByProperty( e.target.id.substring(2) );
  } );

  var peerBody = peerTable.down( "tbody" );
  var currentPeers = torrent.peers.pluck( "address" );
  peerBody.childElements().each( function( row ) {
    if( !currentPeers.include( row.id.substring( 2 ) ) ) {
      row.remove();
    }
  } );

  torrent.peers.sortByProperty().each( function( peer ) {
    var id = "p_" + peer.address;
    var row = $( id );
    if( row ) {
      updateRow( peer, peerColumns, row );
    }
    else {
      peerBody.insert( renderRow( peer, peerColumns, rR( { id: id } ) ) );
    }
  } );
  globals.oldPeers = torrent.peers;
}

function showTrackers( torrent ) {
  var trackerDiv = $( "trackerDiv" );
  if( !trackerDiv ) {
    trackerDiv = rD( { id: "trackerDiv" } );
    trackerDiv.addClassName( "torrent" );
    globals.content.insert( trackerDiv );
  }

  var trackerTable = getTable( "trackerTable", trackerDiv, trackerColumns, function( t ) {
    t.body.observe( "click", function( e ) {
      var cell = e.findElement( "td" );
      if( cell ) {
        var row = cell.up( "tr" );
        var id = parseInt( row.id.split( "_" )[ 1 ] );
        var column = globals.trackerColumnHash[ row.childElements().indexOf( cell ) ];
        if( column && column.listHandler ) {
          column.listHandler( e, id );
        }
      }
    } );

    var trackerArea = rT();
    var trackerLed = rLed().observe( "click", function( e ) {
      showPopup( "popupTrackerAdd", function( e ) {
        globals.action = e.target.id;
        switch( globals.action ) {
          case "add":
            var trackers = trackerArea.value.match( trackerRegexp );
            addTrackersToTorrents( [ torrent.id ], trackers );
        }
      }, e );
    } );
    t.footer.insert( rR().insert( rC().insert( trackerLed ) ).insert( rC().insert( trackerArea ) ) );
  } );

  var webseedTable = getTable( "webseedTable", trackerDiv, webseedColumns, function( t ) {
    torrent.webseeds.each( function( webseed ) {
      t.body.insert( rR().insert( rD().insert( webseed ) ) );
    } )
  } );

  trackerBody = trackerTable.down( "tbody" );
  var currentTrackers = torrent.trackerStats.pluck( "id" );
  trackerBody.childElements().each( function( row ) {
    if( !currentTrackers.include( row.id.substring( 2 ) ) ) {
      row.remove();
    }
  } );
  torrent.trackerStats.each( function( tracker ) {
    if( !$( "t_" + tracker.id ) ) {
      trackerBody.insert( renderRow( tracker, trackerColumns, rR( { id: "t_" + tracker.id } ) ) );
    }
  } );
  globals.oldTrackerStats = torrent.trackerStats;
}

function showDetails( torrent ) {
  var detailsTable = getTable( "detailsTable", globals.content, detailsColumns, function( t ) {
    t.table.addClassName( "torrent keyvalue" );
    renderKeyValuePairs( t.body, torrent, "d_", torrentFields );
    var downloadDir = t.table.down( "#d_downloadDir" );
    var moveLed = rLed( true );
    if( downloadDir ) {
       moveLed.setAttribute( "id", "d_move" );
       moveLed.setAttribute( "title", "Move" );
       moveLed.makeToggle();
       downloadDir.insert( { top: moveLed } );
    }

    var clipboardLed = rLed().makeToggle().addClassName( "clipboard" );
    t.body.insert(
      rR().insert( rC() ).insert( rC().insert( rB().observe( "click", function( e ) {
        showWait();
        var data = getKeyValuePairs( torrent, "d_", torrentFields );
        if( clipboardLed.value ) {
          var t = Object.extend( Object.clone( torrent ), data );
          [ "dirty", "display", "id", "node", "selected" ].each( function( a ) { delete t[ a ] } );
          copyToClipboard( t );
        }
        if( !Object.isEmpty( data ) ) {
          if( data.hasOwnProperty( "downloadDir" ) ) {
            data[ "location" ] = data[ "downloadDir" ];
            delete data[ "downloadDir" ];
            doRequest( "torrent-set-location", { ids: [ torrent.id ], location: data[ "location" ], move: moveLed.value } );
          }
          doRequest( "torrent-set", Object.extend( { ids: [ torrent.id ] }, data ), function( response ) {
            var m = { body: prettify( data ) };
            if( success( response ) ) {
              sendNotification( 3, "Torrent settings changed.", m );
              if( data.hasOwnProperty( "location" ) ) {
                data[ "downloadDir" ] = data[ "location" ];
                delete data[ "location" ];
              }
              torrent.update( data );
            }
            else {
              sendNotification( 1, "Failed changing torrent settings.", m );
            }
          } );
        }
      } ) ).insert( clipboardLed ).insert( "Copy to clipboard" ) )
    );
  } );
  updateKeyValuePairs( torrent, "d_", torrentFields );
}

function getKeyValuePairs( elements, idPrefix, fields ) {
  var data = {};
  for( var k in elements ) {
    var f = fields[ k ];
    if( elements.hasOwnProperty( k ) && !( f && f.readOnly ) ) {
      var o = elements[ k ];
      var cell = $( idPrefix + k );
      var v = null;

      if( f && f.locked ) {
        delete f.locked;
      }

      if( f && f.getValue ) {
        v = f.getValue( cell );
      }
      else if( fields[ k ] && fields[ k ].values ) {
        v = fields[ k ].values[ cell.down( "select" ).selectedIndex ].value;
      }
      else if( Object.isArray( o ) ) {
        v = Array.apply( null, cell.down( "select" ).options ).sort( function( a, b ) { return a.selected < b.selected } ).pluck( "value" );
      }
      else if( Object.isBoolean( o ) ) {
        v = cell.down( "span.led" ).value;
      }
      else if( Object.isNumber( o ) ) {
        v = parseInt( cell.down( "input" ).value );
      }
      else if( Object.isString( o ) ) {
        v = cell.down( "input" ).value;
      }
      else {
        continue;
      }
      if( v != null && v != elements[ k ] ) {
        data[ k ] = v;
      }
    }
  }
  return data;
}

function lock( fields, k ) {
  fields[ k ] = fields[ k ] || {};
  fields[ k ].locked = true;
}

function renderKeyValuePairs( target, elements, idPrefix, fields ) {
  idPrefix = idPrefix || "";
  Object.keys( elements ).sort().each( function( k ) {
    var f = fields ? fields[ k ] : false === fields ? false : null;
    if( k[ 0 ] === '_' || f && f.ignore ) {
      return;
    }
    if( elements.hasOwnProperty( k ) ) {
      var o = elements[ k ];
      var createInput = false !== f;
      var row = rR();
      var keyCell = rC( {}, k );
      var ro = f && f.readOnly;
      var content = globals.shift.settings.screenshotMode && f && f.sss ? k.capitalize() : o;
      var valueCell = rC( { id: idPrefix + k } );

      var a = f && f.action;
      if( null == a || false === a || a( row, keyCell, valueCell, content ) ) {
        row.insert( keyCell ).insert( valueCell );
      }
      target.insert( row );

      if( f && f.render ) {
        content = f.render( content, valueCell );
      }
      else if( f && f.values ) {
        if( !ro ) {
          content = renderSelect( { select: { "class": "styled" }, options: f.values } ).observe( "focus", lock.curry( fields, k ) );
          content.value = o;
          createInput = false;
        }
      }
      else if( Object.isArray( o ) ) {
        var content = renderSelect( { select: { "class": "styled", value: o[ 0 ] }, options: normalizeOptions( o ) } );
        createInput = false;
      }
      else if( Object.isBoolean( o ) ) {
        var content = rLed( o, ro ? { readonly: "readonly" } : {} );
        if( !ro ) {
          content.observe( "click", function( e ) {
            lock( fields, k );
            content.toggle();
          } );
        }
        createInput = false;
      }
      else if( !Object.isNumber( o ) && !Object.isString( o ) ) {
        return;
      }

      if( ro ) {
        valueCell.writeAttribute( "readonly", "readonly" );
      }
      else if( f && f.renderAdvanced ) {
        content = f.renderAdvanced( content );
      }
      else if( createInput ) {
        content = rI( content ).observe( "focus", lock.curry( fields, k ) );
      }
      valueCell.insert( content );
    }
  } );
}

function updateKeyValuePairs( elements, idPrefix, fields ) {
  Object.keys( elements ).sort().each( function( k ) {
    var f = fields ? fields[ k ] : false === fields ? false : null;
    if( k[ 0 ] === '_' || f && ( f.ignore || f.locked ) ) {
      return;
    }
    if( elements.hasOwnProperty( k ) ) {
      var o = elements[ k ];
      var ro = false === f || f && f.readOnly;
      var content = globals.shift.settings.screenshotMode && f && f.sss ? k.capitalize() : o;
      var valueCell = $( idPrefix + k );

      if( f && f.render ) {
        content = f.render( content, valueCell );
      }
      else if( f && f.values ) {
        if( !ro ) {
          valueCell.down( "select" ).value = o;
          return;
        }
      }
      else if( Object.isBoolean( o ) ) {
        valueCell.down( "span.led" ).set( o );
        return;
      }
      else if( !Object.isNumber( o ) && !Object.isString( o ) ) {
        return;
      }

      if( ro ) {
        valueCell.update( content );
      }
      else {
        valueCell.down( "input" ).value = content;
      }
    }
  } );
}

function showSessionTable() {
  if( showContent( "sessionTable" ) ) {
    return;
  }

  doRequest( "session-get", {}, function( response ) {
    globals.shift.session = getArguments( response );
    var sessionTable = getTable( "sessionTable", globals.content, sessionColumns, function( t ) {
      var clipboardLed = rLed().makeToggle().addClassName( "clipboard" );

      t.table.addClassName( "keyvalue" );
      renderKeyValuePairs( t.body, globals.shift.session, "s_", sessionFields );
      t.body.insert(
        rR().insert( rC() ).insert( rC().insert( rB().observe( "click", function( e ) {
          var data = getKeyValuePairs( globals.shift.session, "s_", sessionFields );
          if( clipboardLed.value ) {
            copyToClipboard( globals.shift.session );
          }
          if( !Object.isEmpty( data ) ) {
            Object.extend( globals.shift.session, data );
            doRequest( "session-set", data,  function( response ) {
              var m = { body: prettify( data ) };
              if( success( response ) ) {
                sendNotification( 3, "Session settings changed.", m );
              }
              else {
                sendNotification( 1, "Changed session settings Failed.", m );
              }
            } );
          }
        } ) ).insert( clipboardLed ).insert( "Copy to clipboard" ) )
      );
    } );
  } );
}

var shiftFields = {
  "minSeeders": {
  },
  "trackers": {
    getValue: function( cell ) {
      return cell.down( "textarea" ).value;
    },
    renderAdvanced: rT,
    update: function( cell, value ) {
    }
  }
}

function stopSeeding() {
  var minSeeders = $( "s_minSeeders" ).down( "input" ).value;
  var status = globals.version < 2.4 ? 8 : 6;
  var seedingTorrents = globals.torrents.filter( function( torrent ) {
    return torrent.status == status;
  } );
  doTorrentGet( [ "id", "trackerStats" ], seedingTorrents.pluck( "id" ), function( response ) {
    var stopTorrents = getArguments( response ).torrents.filter( function( torrent ) {
      var stats = torrent.trackerStats;
      for( var i = 0, len = stats.length; i < len; ++i ) {
         if( stats[ i ].seederCount >= minSeeders ) {
            return true;
         }
      }
      return false;
    } );
    doRequest( "torrent-stop", { ids: stopTorrents.pluck( "id" ) }, updateTorrents )
  } );
  return;
}

function addTrackersToTorrents( ids, trackers ) {
  var request = newRequest( "torrent-set", { ids: ids, trackerAdd: trackers }, function( response ) {
    var enableTrackerButton = function() {
      var e = $( "tracker" )
      if( e ) {
        e.enable();
      }
    }

    if( success( response ) ) {
      enableTrackerButton();
    }
    else { // Any torrent has all trackers means iterate all torrents.
      ids = ids.length ? ids : globals.torrents.pluck( "id" );
      globals.torrentIndex = 0;
      request.onSuccess = function( response ) {
        if( globals.torrentIndex < ids.length ) {
          request.parameters = null;
          request.parametersObject.arguments.ids = ids[ globals.torrentIndex++ ];
          doRequest( request );
        }
        else {
          enableTrackerButton();
        }
      }
      request.onSuccess( response );
    }
  } );
  doRequest( request );
}

function queueTorrentsByDate() {
  if( globals.torrents.length < 2 ) {
    return;
  }

  showWait();
  doTorrentGet( [ "id", "addedDate" ], undefined, function( response ) {
    updateTorrents( response );
    globals.torrents.sortByProperty( "addedDate" );
    if( undefined === globals.torrents[ 0 ].queuePosition ) {
      globals.torrents[ 0 ].queuePosition = 0;
    }
    var minQueuePosition = globals.torrents[ 0 ].queuePosition;
    var batchIds = [];
    var ids = [ globals.torrents[ 0 ].id ];
    for( var i = 1, len = globals.torrents.length; i < len; ++i ) {
      if( minQueuePosition < globals.torrents[ i ].queuePosition ) {
        batchIds.push( ids );
        ids = [];
      }
      minQueuePosition = globals.torrents[ i ].queuePosition;
      ids.push( globals.torrents[ i ].id );
    }
    batchIds.push( ids );

    var _setTopQueuePosition = function( ids ) {
      doRequest( "queue-move-top", { ids: ids }, function( response ) {
        if( batchIds.length > 0 ) {
          _setTopQueuePosition( batchIds.shift() );
        }
        else {
          getQueuePositions( null );
          showDone();
        }
      } );
    }

    if( batchIds.length > 0 ) {
      _setTopQueuePosition( batchIds.shift() );
    }
    else {
      showDone();
    }
  } );
}

function setStylesheet( name ) {
  var sheet = $$( "link[rel=stylesheet]" )[ 1 ];
  sheet.href = sheet.baseURI + name;
}

function showShiftTable() {
  if( showContent( "shiftTable" ) ) {
    return;
  }

  var shiftTable = getTable( "shiftTable", globals.content, shiftColumns, function( t ) {
    var clipboardLed = rLed().makeToggle().addClassName( "clipboard" );

    t.table.addClassName( "keyvalue" );
    renderKeyValuePairs( t.body, globals.shift.settings, "s_", shiftFields );
    t.body.down( "td#s_minSeeders" ).insert( rB( { value: "Stop seeding" } ).observe( "click", stopSeeding ) );
    var trackerButton = rB( { value: "Add to all torrents", id: "tracker" } );
    trackerButton.observe( "click", function( e ) {
      trackerButton.disable();
      var trackers = t.body.down( "td#s_trackers" ).down( "textarea" ).value.match( trackerRegexp );
      addTrackersToTorrents( [], trackers );
    } );
    t.body.down( "td#s_trackers" ).insert( trackerButton );
    if( globals.version >= 2.4 ) {
      t.body.insert( rR().insert( rC().insert( "Set queue positions" ) ).insert( rC().insert(
        rB( { value: "Date" } ).observe( "click", queueTorrentsByDate )
      ) ) );
    }
    t.body.insert(
      rR().insert( rC() ).insert( rC().insert( rB().observe( "click", function( e ) {
        var data = getKeyValuePairs( globals.shift.settings, "s_", shiftFields );
        globals.shift.settingsChanged = !Object.isEmpty( data );
        if( globals.shift.settingsChanged ) {
          var date = new Date();
          Object.extend( globals.shift.settings, data );
          data = getKeyValuePairs( globals.shift.defaultSettings, "s_", shiftFields );
          if( data.styleSheet ) {
            setStylesheet( data.styleSheet[ 0 ] );
          }
          if( clipboardLed.value ) {
            copyToClipboard( globals.shift.settings );
          }
          date.setTime( date.getTime() + 365 * DAY_MS );
          document.cookie = COOKIE_KEY + window.btoa( Object.toJSON( data ) ) + "; expires=" + date;
          if( globals.shift.settings.notificationLevel > 0 ) {
            if( data.notificationLevel > 0 && Notification.permission !== "granted" ) {
              Notification.requestPermission( f );
            }
            sendNotification( 3, "Shift settings Changed.", { body: prettify( data ) } );
          }
          renderDoneSound();
        }
        playDoneSound();
      } ) ).insert( clipboardLed ).insert( "Copy to clipboard" ) )
    );
  } );
}

function showContent( content ) {
  var result = false;
  if( content ) {
    content = $( content );
  }
  if( content ) {
     result = content.visible();
     content.show();
  }
  globals.content.childElements().without( content ).invoke( "hide" );
  return result;
}

function handleUpdate( menu, tableId, fields, renderer ) {
  if( !menuSelect( menu ) ) {
    return;
  }
  showWait();
  if( !showContent( tableId ) ) {
    var torrent = globals.currentTorrent;
    changeRequest( globals.shift.torrentUpdater, "torrent-get", { fields: fields, ids: [ torrent.id ] }, function( response ) {
      updateTorrents( response );
      renderer( torrent );
      showDone();
    } );
  };
}

function handleTorrentClick( handler ) {
  globals.menu.main.invoke( "hide" );
  globals.menu.torrent.invoke( "show" );
  var torrent = globals.currentTorrent;
  if( globals.oldTorrent != torrent ) {
      globals.oldTorrent = torrent;
      globals.content.select( ".torrent" ).invoke( "remove" );
  }
  if( torrent.files ) {
    handler()
  }
  else {
    doTorrentGet( torrentFieldKeys, [ torrent.id ], function( response ) {
      updateTorrents( response );
      handler();
    } );
  }
}

function handleAddClick( e ) {
  closePopup();
  var d = globals.dialogs.add;
  if( d.addFile ) {
    if( d.fileName.value.length > 0 ) {
      showWait();
      processFiles( Array.from( d.file.files ), d.dir.value, d.pausedLed.value );
      d.fileName.value = "";
    }
  }
  else {
    if( d.url.value.length > 0 ) {
      showWait();
      processURLs( [ d.url.value ], d.dir.value, d.pausedLed.value );
      d.url.value = "";
    }
  }
}

var menuSelected = null;

// Returns true if a new menu item was selected.
function menuSelect( item ) {
  var menuId = createId( "menu_", item );
  if( menuSelected ) {
    if( menuSelected.id == menuId ) {
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

function selectFileLed( file ) {
  var d = globals.dialogs.add;
  d.addFile = file;
  d.fileLed.set( file );
  d.urlLed.set( !file );
}

var selectFileLedTrue = selectFileLed.curry( true );
var selectFileLedFalse = selectFileLed.curry( false );

function renderPopup( id ) {
  return rD( { id: id, "class": "popup" } ).hide();
}

function renderDialogPopup( id ) {
  return renderPopup( id ).addClassName( "dialog" );
}

function renderMenuItems( items, render ) {
  return items.collect( function( item ) {
    return rE( "li", { id: item.toLowerCase() } ).insert( render ? render( item ) : item );
  } );
}

function renderMenuPopup( id, items, render ) {
  return renderPopup( id ).insert( rE( "ul" ).insert( renderMenuItems( items, render ) ) );
}

function getFileSearcher( search, isRegExp ) {
  return isRegExp ? function( file ) {
    return getFilePart( file.name ).match( search );
  } : function( file ) {
    return getFilePart( file.name ).indexOf( search ) !== -1;
  }
}

function previewSearchReplace( e ) {
  var d = globals.dialogs.batchrename;
  var search = d.search.value || "";
  var isRegExp = d.isRegExp.value;
  search = isRegExp ? new RegExp( search ) : search;
  var replace = d.replace.value || "";
  if( isRegExp && 0 === replace.length ) {
    for( var i = 1, len = ( new RegExp( ( d.search.value || "" ) + "|" ) ).exec( "" ).length; i < len; ++i ) {
       replace += "$" + i;
    }
    d.replace.value = replace;
  }
  var file = globals.currentTorrent.files.find( getFileSearcher( search, isRegExp ) );
  var fileName = file ? getFilePart( file.name ) : "";
  d.search_preview.update( fileName );
  d.replace_preview.update( fileName.replace( search, replace ) );
}

function renderPage() {
  var rCancel = function( style, text ) {
    return rB( { "class": "styled " + style, type: "button", value: text || "Cancel" } ).observe( "click", closePopup );
  }

  var d = {
    additional: rD( { "class": "additional" } ),
    torrents: rD( { "class": "torrents" } ),
    cancel: rCancel( "cancel" ),
    action: rB( { "class": "styled action", type: "button", value: "Action" } )
      .observe( "click", handleTorrentActionClick ),
    add: {
      file: rI( null, { type: "file", multiple: "multiple" } ).hide(),
      fileLed: rLed().observe( "click", selectFileLedTrue ),
      fileName: rI( null, { readonly: "readonly" } ),
      browse: rB( { "class": "styled add", type: "button", value: "Browse" } ),
      urlLed: rLed().observe( "click", selectFileLedFalse ),
      url: rI( null ).observe( "change", selectFileLedFalse ).observe( "keypress", selectFileLedFalse ),
      dir: rI( globals.shift.session[ "download-dir" ] ),
      pausedLed: rLed().makeToggle(),
      add: rB( { "class": "styled add", type: "button", value: "Add" } ).observe( "click", handleAddClick )
    },
    relocate: {
      target: rI( globals.shift.session[ "download-dir" ], { "class": "styled relocate", size: 64 } ),
      move: rLed( true ).makeToggle(),
    },
    remove: {
      trash: rLed( true )
    },
    batchrename: {
      search: rI( null, { size: 64 } ).observe( "change", previewSearchReplace ),
      search_preview: rS(),
      isRegExp: rLed( false, { title: "Regular Expression" } ).makeToggle().observe( "click", previewSearchReplace ),
      replace: rI( null, { size: 64 } ).observe( "change", previewSearchReplace ),
      replace_preview: rS(),
      rename: rB( { "class": "styled rename", id: "batchrename", type: "button", value: "Rename" } ).observe( "click", function( e ) {
        closePopup();
        var search = d.batchrename.search.value || "";
        search = d.batchrename.isRegExp.value ? new RegExp( search ) : search;
        var replace = d.batchrename.replace.value || "";
        var files = globals.currentTorrent.files.findAll( getFileSearcher( search, d.batchrename.isRegExp.value ) );
        renameFiles( files.collect( function( f ) {
          return {
            path: f.name,
            name: getFilePart( f.name ).replace( search, replace ),
            node: f.node.down( "td.name" )
          }
        } ) );
      } )
    },
    rename: {
      fileName: rI( null, { size: 64 } ),
      rename: rB( { "class": "styled rename", id: "rename", type: "button", value: "Rename" } ).observe( "click", handleTorrentActionClick )
    },
    upload: {
       close: rCancel( "upload", "Close" ),
       clear: rB( { "class": "styled upload", type: "button", value: "Clear" } ).observe( "click", function( e ) {
         var t = e.target;
         var u = $( "uploads" );
         u.select( "div.drop" ).each( function( drop ){
           drop.select( "div" ).each( function( div ){
             if( div.down( "span.led" ).hasClassName( "duplicate" ) ) {
               div.remove();
             }
           } );
           if( drop.empty() ) {
             drop.remove();
           }
        } );
        if( u.empty() ) {
          closePopup( e );
        }
      } )
    }
  }
  var _handler = function( e ) {
    globals.dialogs.add.file.click();
    e.stop();
  };
  d.add.fileName.observe( "click", _handler );
  d.add.browse.observe( "click", _handler );
  d.add.file.observe( "change", function( e ) {
    globals.dialogs.add.fileName.value = $A( e.currentTarget.files ).pluck( "name" ).join( ";" );
    selectFileLedTrue();
  } );

  d.relocate.insert = [ "To ", d.relocate.target, "<br/>", d.relocate.move, " Move" ];
  d.remove.insert =  Object.values( d.remove );
  d.rename.insert =  Object.values( d.rename );

  globals.dialogs = d;
  selectFileLedTrue();

  var popups = rD( { id: "popups" } ).insert(
    renderDialogPopup( "popupAbout" )
      .insert(
        "<h1>Shift / Transmission</h1><h2>By Killemov</h2>Version: " +
        globals.shift.version + " / " + globals.shift.session.version +
        "<p>Shift is a minimalistic approach to maximum control of your Transmission.</p>" +
        "<p>Shift is currently targeted at Mozilla Firefox 4+<br>" +
        "with degraded and untested functionality for other or older browsers.<br><br>" +
        "Shift is built on prototype.js. ( V" + Prototype.Version + " - Hacked! )</p>" )
      .insert( rD().insert( $( "license" ).show() ).insert( rCancel( "about", "Close" ) ) )
  ).insert(
    renderDialogPopup( "popupAdd" )
      .insert( rE( "h1", {}, "Add a torrent" ) )
      .insert( rI( null, { type: "file", multiple: "multiple" } ).hide() )
      .insert( rD().insert( [ d.add.fileLed, rS( { "class": "add" }, "File" ), d.add.fileName, d.add.browse ] ) )
      .insert( rD().insert( [ d.add.urlLed, rS( { "class": "add" }, "Url" ), d.add.url ] ) )
      .insert( rD().insert( [ rS( { "class": "add", id: "labelDir" }, "Dir" ), d.add.dir ] ) )
      .insert( rD().insert( [ d.add.pausedLed, rS( { id: "labelPaused" }, "Add paused" ) ] ) )
      .insert( rD().insert( [ rCancel( "add" ), d.add.add ] ) )
  ).insert(
    renderDialogPopup( "popupBatchRename" )
      .insert( rE( "h1", {}, "Batch Rename" ) )
      .insert( rD().insert( [ rS( { "class": "rename" }, "Search" ), d.batchrename.search, d.batchrename.isRegExp ] ) )
      .insert( rD().insert( [ rS( { "class": "rename" }, "Example" ), d.batchrename.search_preview ] ) )
      .insert( rD().insert( [ rS( { "class": "rename" }, "Replace" ), d.batchrename.replace ] ) )
      .insert( rD().insert( [ rS( { "class": "rename" }, "Example" ), d.batchrename.replace_preview ] ) )
      .insert( rD().insert( [ rCancel( "rename" ), d.batchrename.rename ] ) )
  ).insert(
    renderDialogPopup( "popupDialog" )
      .insert( rE( "h1" ) )
      .insert( "Are you sure you want to <span></span> the following torrent(s)" )
      .insert( d.torrents )
      .insert( d.additional )
      .insert( rD().insert( d.cancel ).insert( d.action ) )
  ).insert(
    renderDialogPopup( "popupUpload" )
      .insert( rE( "h1", {}, "Uploading" ) )
      .insert( rD( { id: "uploads" } ) )
      .insert( rD().insert( [ d.upload.close, d.upload.clear ] ) )
  ).insert(
    renderMenuPopup( "popupFile", filePriorityKeys, function( item ) {
      return rLed( item );
    } )
  ).insert(
    renderMenuPopup( "popupFiles", [ "Rename" ] )
  ).insert(
    renderMenuPopup( "popupGeneral", [ "Select Visible", "Deselect Visible", "Select All", "Deselect All", "Store Selection", "Restore Selection", "Reset" ] )
  ).insert(
    renderMenuPopup( "popupQueue", [ "Top", "Up", "Down", "Bottom" ] )
  ).insert(
    renderDialogPopup( "popupRename" )
      .insert( rE( "h1", {}, "Rename" ) )
      .insert( rD().insert( [ rS( { "class": "rename" }, "Name" ), d.rename.fileName ] ) )
      .insert( rD().insert( [ rCancel( "rename" ), d.rename.rename ] ) )
  ).insert(
    renderMenuPopup( "popupTorrent", torrentActionLabels )
  ).insert(
    renderMenuPopup( "popupTracker", [ "Remove" ] )
  ).insert(
    renderMenuPopup( "popupTrackerAdd", [ "Add" ] )
  );

  $( "outside" ).insert( popups );
  $( "popupFile" ).down( "ul" ).insert( renderMenuItems( fileMenuItems ) );
  $( "popupTorrent" ).down( "li#remove" ).insert( { before: rD( { class: "menuSpacer" } ) } );

  globals.popups = {
    "popups": popups
  };

  popups.select( ".popup" ).each( function( popup ) {
    globals.popups[ popup.id ] = popup;
  } );

  var header = rD( { id: "header" } );
  header
    .insert( rD( { id: "stats" } )
    .insert( rS( { "class": "label" }, "Dl/Ul: " ) )
    .insert( rS( { id: "downloadSpeed" }, "0Bs" ) ).insert( " / " )
    .insert( rS( { id: "uploadSpeed" }, "0Bs" ) ).insert( rE( "br" ) )
    .insert( rS( { "class": "label" }, "Total: " ) )
    .insert( rS( { id: "downloadedBytes" }, "0B" ) ).insert( " / " )
    .insert( rS( { id: "uploadedBytes" }, "0B" ) ).insert( rE( "br" ) )
    .insert( rS( { "class": "label" }, "Free: " ) )
    .insert( rS( { id: "download-dir-free-space" }, "0B" ) )
    .observe( "dblclick", function( e ) {
      var f = $( "filterContainer" );
      globals.headerState++;
      globals.headerState %= 3;
      switch( globals.headerState ) {
        case 1:
          globals.body.removeClassName( "normal" ).addClassName( "fixed" );
        break;
        case 2:
          globals.body.removeClassName( "fixed" ).addClassName( "box" );
          header.insert( f );
          this.observe( "selectstart", preventDefault );
          this.observe( "mousedown", function( e ) {
            var xs = e.pageX - header.offsetLeft;
            var ys = e.pageY - header.offsetTop;
            this.observe( "mousemove", function( e ) {
              header.style.left = e.pageX - xs + "px";
              header.style.top = e.pageY - ys + "px";
            } );
            this.observe( "mouseup", function( e ) {
              this.stopObserving( "mousemove" );
              this.stopObserving( "mouseup" );
            } );
          } );
        break;
        default:
          this.stopObserving( "mousedown" );
          this.stopObserving( "selectstart" );
          globals.body.removeClassName( "box" ).addClassName( "normal" );
          header.style.left = "";
          header.style.top = "";
          $( "filterContainerCell" ).insert( f );
      }
    } )
  );

  globals.menu = {
    main: [
      rM( "Add", function() {
        showPopup( "popupAdd" );
      } ),
      rM( "Start all", doRequest.curry( "torrent-start" ) ),
      rM( "Stop All", doRequest.curry( "torrent-stop" ) )
    ],
    torrent: [
      [ "Files", "fileTable", [ "id", "fileStats", "percentDone", "pieces", "sizeWhenDone" ], showFiles ],
      [ "Peers", "peersDiv", [ "id", "peers", "peersFrom" ], showPeers ],
      [ "Trackers", "trackerDiv", [ "id", "trackerStats" ], showTrackers ],
      [ "Details", "detailsTable", torrentDetailsUpdateKeys, showDetails ]
    ].collect( function( a ) { return rM( a[ 0 ], handleTorrentClick.curry( handleUpdate.curry( a[ 0 ], a[ 1 ], a[ 2 ], a[ 3 ] ) ) ) } ),
    session: [
      rM( "Shift", function() {
        if( menuSelect( "shift" ) ) {
          showShiftTable();
        }
      } ),
      rM( "Blocklist", doRequest.curry( "blocklist-update" ) ),
      rM( "Shut Down", function() {
        if( confirm( "Are you sure you want to shut down Transmission?" ) ) {
          doRequest( "session-close" );
        }
      } )
    ]
  };

  Object.values( globals.menu ).each( function( group ) {
    group.invoke( "addClassName", "sub" ).invoke( "hide" );
  } );

  header.insert( rE( "ul", { id: "menu" } )
    .insert( rM( "Torrents", function() {
      if( menuSelect( "torrents" ) ) {
        showTorrentTable();
        setDefaultTorrentRequest();
      }
      globals.menu.session.invoke( "hide" );
      globals.menu.torrent.invoke( "hide" );
      globals.menu.main.invoke( "show" );
    } ) )
    .insert( globals.menu.main )
    .insert( globals.menu.torrent )
    .insert( rM( "Session", function() {
      if( menuSelect( "session" ) ) {
        showSessionTable();
      }
      globals.menu.main.invoke( "hide" );
      globals.menu.torrent.invoke( "hide" );
      globals.menu.session.invoke( "show" );
    } ) )
    .insert( globals.menu.session )
    .insert( rM( "About", function( e ) {
      showPopup( "popupAbout" );
    } ) )
  );

  globals.body.insert( header );

  globals.content = rD( { id: "content" } );
  globals.body.insert( globals.content );

  globals.menu.main.invoke( "show" );
  menuSelect( "torrents" );
}

function getBody( torrent, s ) {
  s = s || "";
  return { body: ( torrent.hashString ? torrent.hashString + "\n" : "" ) + torrent.name + s };
}

function keepProcessing( response ) {
  if( !success( response ) ) {
    return false;
  }

  var args = getArguments( response )
  var t = args[ "torrent-duplicate" ];
  if( t ) {
    sendNotification( 2, "Duplicate torrent added.", getBody( t ) );
    return false;
  }
  t = args[ "torrent-added" ];
  if( t ) {
    sendNotification( 3, "Torrent added.", getBody( t ) );
  }
  return true;
}

function loadFile( file, onSuccess ) {
  if( "loaded" === file.status ) {
    if( onSuccess ) {
      onSuccess( {
        target: {
          result: file.result,
          file: file
        }
      } )
    }
  }
  else {
    file.update( "loading" );
    var r = new FileReader();
    r.file = file;

    Event.observe( r, "load", function( e ) {
      e.target.file.update( "loaded" );
      e.target.file.result = e.target.result;
      if( onSuccess ) {
        onSuccess( e )
      }
    } );
    r.readAsDataURL( file );
  }
}

function processFiles( files, target, paused ) {
  if( !files.length ) {
    return;
  }

  for( var i = files.length - 1; i >= 0; --i ) {
    var file = files[ i ];
    if( "added" === file.status ) {
       file.node.file = null;
       file.node.remove();
       files.splice( i, 1 );
    }
  }

  var dropId = "drop" + dropCount++;

  var update = function( status ) {
    this.status = status;
    this.node.down( "span" ).set( status );
  }

  var u = $( "uploads" );
  var removables = u.select( "div.drop" ).filter( Element.empty );
  var loadHandler = function( e ) {
    // Reader adds some metadata that ends with "base64,".
    var search = "base64,"
    var index = e.target.result.indexOf( search );
    if( index > -1 ) {
      var result = e.target.result.substring( index + search.length );
      e.target.file.update( "uploading" );
      // Upload the file first to see if Transmission can handle it.
      doRequest( "torrent-add", { "download-dir": target, "paused": paused, "metainfo": result }, function( response ) {
        $( dropId ).remove();
        $A( u.children ).select( Element.visible ).length ? u.show() : u.hide();

        if( success( response ) ) {
          e.target.file.update( keepProcessing( response ) ? "added" : "duplicate" )
        }
        else {
          // Transmisssion could not handle the file. Parse it for URL extraction.
          var textReader = new FileReader();
          Event.observe( textReader, "load", function( e ) {
            processURLs( textReader.result.match( torrentRegexp ), target, paused );
          } );
          textReader.readAsText( e.target.file );
          e.target.file.update( "processing" );
        }
        processFiles( files, target, paused );
      } );
    }
  }

  var drops = rD( { id: dropId, "class": "drop" } );
  u.insert( drops );

  for( var i = 0, l = files.length; i < l; ++i ) {
    var file = files[ i ];
    file.update = file.update || update.bind( file );
    file.node = file.node || rD().insert( rLed( false ) ).insert( file.name );
    file.node.file = file;
    drops.insert( file.node );
  }
  u.show();
  showPopup( "popupUpload" );

  var first = true;
  for( var i = 0, l = files.length; i < l; ++i ) {
    var file = files[ i ];
    if( undefined === file.status ) {
      loadFile( file, first ? loadHandler : undefined );
      first = false;
      continue;
    }

    if( "loaded" === file.status ) {
      if( first ) {
        first = false;
        loadFile( file, loadHandler );
      }
    }
  }
}

function processURLs( urls, target, paused ) {
  var url = urls.shift();
  if( undefined === url ) {
    return;
  }

  url = decodeURIComponent( url ).replace( new RegExp( "&amp;", "g" ), "&" );
  doRequest( "torrent-add", { "download-dir": target, "paused": paused, "filename": url }, function( response ) {
    if( window.location.href.indexOf( "uri=" ) > 0 ) {
      window.history.back();
    }
    if( keepProcessing( response ) ) {
      var args = getArguments( response );
      var added = args[ "torrent-added" ];
      args.torrents = [ added ];
      if( url.startsWith( "magnet:" ) ) {
        globals.magnets.push( added.id );
      }
      updateTorrents( response );
    }
    processURLs( urls, target, paused );
  } );
}

function renderDoneSound() {
  var s = globals.shift;
  if( s.doneSound ) {
    s.doneSound.pause();
    s.doneSound.currentTime = 0;
  }
  var soundDone = s.settings.soundDone;
  if( isEmpty( soundDone ) ) {
    var audioWave = [];
    for( var i = 0; i < 1024; ++i ) {
      audioWave[ i ] = 128 + Math.round( 127 * Math.sin( i / 1.8 ) );
    }
    soundDone = new riffwave( audioWave ).dataURI;
  }
  s.doneSound = new Audio( soundDone );
  s.doneSound.setAttribute( "id", "doneSound" );
}

function renderTitle() {
  var s = globals.shift;
  if( s.settings.showSpeedTitle && s.sessionStats ) {
    document.title = "Down: " + renderers[ "downloadSpeed" ]( s.sessionStats.downloadSpeed ) + " / Up: " + renderers[ "uploadSpeed" ]( s.sessionStats.uploadSpeed );
  }
  else {
    document.title = "Shift " + s.version + " / Transmission " + s.session.version;
  }
}

function centerVertically( e ) {
  if( !e ) {
    return;
  }
  var clientHeight = document.viewport.getHeight();
  var clientBottom = document.viewport.getScrollOffsets().top + clientHeight;
  var h = e.getHeight();
  var t = e.cumulativeOffset().top;

  if( t < clientBottom || clientBottom < t + h ) {
    window.scrollTo( 0, t + h / 2 - clientHeight / 2 );
  }
}

function handleKeyDown( e ) {
  if( e.ctrlKey || [ "INPUT", "TEXTAREA" ].include( e.target.tagName ) ) {
    return true;
  }
  var kc = e.keyCode;

  switch( globals.activeTableId ) {
  case "torrentTable":
    globals.currentIndex |= 0;
    if( Object.keys( globals.torrentStatusKeyHash ).include( kc ) ) {
      preventDefault( e );
      globals.hashIndex = ( globals.hashIndex + 1 ) % globals.torrentStatusKeyHash[ kc ].length;
      $( "statusSelect" ).setValue( globals.torrentStatusKeyHash[ kc ][ globals.hashIndex ] ).dispatchEvent( new Event( "change" ) );
    }
    else if( 32 == kc ) { // space
      preventDefault( e );
      globals.select = globals.currentTorrent.toggleSelect().isSelected();
    }
    else if( 219 == kc ) { // [
      preventDefault( e );
      storeSelection();
    }
    else if( 220 == kc ) { // \
      preventDefault( e );
      selectTorrents( "select visible" );
    }
    else if( 221 == kc ) { // ]
      preventDefault( e );
      restoreSelection();
    }
    else if( 38 == kc || 40 == kc ) { // up, down
      preventDefault( e );
      var rows = $( "torrentBody" ).select( "tr" ).findAll( Element.visible );
      if( rows.length > 0 ) {
        rows.invoke( "toggleClassName", "active", false );
        globals.currentIndex += 38 == kc ? -1 : 1;
        globals.currentIndex = globals.currentIndex.limit( 0, rows.length - 1 );
        var row = rows[ globals.currentIndex ];
        row.toggleClassName( "active", true );
        globals.currentTorrent = globals.torrentHash[ row.id ];
        if( undefined !== globals.select ) {
          globals.currentTorrent.toggleSelect( globals.select );
        }
        centerVertically( row );
      }
    }
    else if( 46 == kc ) { // delete
      preventDefault( e );
      handleTorrentMenuClick( { target: { id: e.shiftKey ? "trash" : "remove" } } );
    }
    else if( 48 <= kc && kc <= 57 ) { // 0..9
      preventDefault( e );
      var headers = $( "torrentTable" ).select( "th" ).select( Element.visible ).select( function( column ) {
        return column.id.startsWith( "h_" ) && "h_menu" != column.id;
      } );
      var i = ( kc - 39 ) % 10; // 1..9,0
      sortTorrents( headers[ i.limit( 0, headers.length - 1 ) ].id.substring( 2 ) );
    }
    break;
  }

  switch( kc ) {
    case 13: // enter
      var button;
      preventDefault( e );
      if( $( "popups" ).visible() ) {
        if( $( "popupAdd" ).visible() ) {
          globals.dialogs.add.add.click();
          break;
        }
      }
      else if( button = globals.body.select( "button.apply" ).find( Element.visible ) ) {
        button.click();
        break;
      }
      else {
        showPopup( "popupAdd" );
        break;
      }
    case 27: // esc
      closePopup( e )
    break;
    case 191: // /
      if( e.shiftKey ) { // ?
        if( $( "popupAbout" ).visible() ) {
          closePopup();
        }
        else {
          preventDefault( e );
          $( "menu_about" ).click();
        }
      }
    break;
  }
  return true;
}

function handleKeyUp( e ) {
  var kc = e.keyCode;
  if( undefined !== globals.select && 32 == kc ) { // space
    delete globals.select;
  }
  if( 9 == kc ) { // tab
    document.activeElement.trigger( "focus" );
  }
}

function registerMagnetHandler() {
  if( globals.shift.settings.registerMagnetHandler ) {
    if( navigator.isProtocolHandlerRegistered ) {
      if( navigator.isProtocolHandlerRegistered( "magnet" ) ) {
        return;
      }
    }
    if( navigator.registerProtocolHandler ) {
      navigator.registerProtocolHandler( "magnet", window.location.href + "?uri=%s", "Shift Transmission Magnet Handler" );
    }
  }
  else {
    if( navigator.registerProtocolHandler ) {
      navigator.unregisterProtocolHandler( "magnet" );
    }
  }
}

document.observe( "dom:loaded", function() {
  globals.html = document.documentElement;
  globals.head = globals.html.down( "head" );
  globals.icon = globals.head.down( "link" ).href;
  globals.body = globals.html.down( "body" );
  globals.body.addClassName( "normal" );

  var s = window.location.href;
  var i = s.indexOf( "uri=" );
  if( i > 0 ) {
    globals.body.update( "Uploading ..." );
    processURLs( decodeURIComponent( s.substring( i + 4 ) ).match( torrentRegexp ) );
    return;
  }

  // This is the catch-all element for clicking outside popups or modal dialogs.
  globals.body.insert( rD( { id: "outside" } ) );

  /**
   * Handle the following dropped items:
   * - torrent file
   * - url to torrent
   * - magnet link
   * - text file containing urls to torrents or magnet links
   */
  globals.html.observe( "dragenter", preventDefault );
  globals.html.observe( "dragover", preventDefault );
  globals.html.observe( "drop", function( e ) {
    e.stop();
    var files = Array.from( e.dataTransfer.files );
    if( files.length > 0 ) {
      processFiles( files );
    }
    else {
      processURLs( [ e.dataTransfer.getData( "URL" ) ] );
    }
  } );

  doRequest( { url: "shift.json", evalJSON: "force", method: "get", onSuccess: function( response ) {
    globals.shift.defaultSettings = response.responseJSON;
    var cookies = document.cookie.split( ";" );
    var cookie = cookies.find( function( s ) {
      return s.startsWith( COOKIE_KEY );
    } );
    var data = undefined === cookie ? {} : window.atob( cookie.substring( COOKIE_KEY.length ) ).evalJSON();
    globals.shift.settings = Object.extend( Object.extend( {}, globals.shift.defaultSettings ), data );
    setStylesheet( globals.shift.settings.styleSheet[ 0 ] );
    renderDoneSound();
    registerMagnetHandler();
  } } );

  // Get first time session data and initialize page.
  doRequest( "session-get", {}, function( response ) {
    globals.shift.session = getArguments( response );
    globals.version = parseFloat( globals.shift.session.version );
    if( globals.version < 2.84 ) {
      fileMenuItems.remove( "Rename" );
    }
    if( globals.version < 2.7 ) {
      torrentActionLabels.remove( "Relocate" );
    }
    if( globals.version < 2.4 ) {
      torrentActionLabels.remove( "Start Now" );
      globals.torrentStatus = {
        "-1": globals.torrentStatus[ "-1" ],
        1: globals.torrentStatus[ 1 ],
        2: globals.torrentStatus[ 2 ],
        4: globals.torrentStatus[ 4 ],
        8: globals.torrentStatus[ 6 ],
        16: globals.torrentStatus[ 0 ]
      }
      delete torrentColumns.queuePosition;
      Object.values( globals.torrentStatus ).pluck( "columns" ).each( function( columns ) {
        columns.remove( "queuePosition" );
      } );
      globals.staticFields.remove( "queuePosition" );
    }
    var h = {};
    for( var k in globals.torrentStatus ) {
      var kc = globals.torrentStatus[ k ].keyCode;
      if( kc ) {
        var a = h[ kc ] || [];
        a.push( k );
        h[ kc ] = a;
      }
    }
    globals.torrentStatusKeyHash = h;
    renderTitle();
    renderPage();
    updateFields( globals.shift.session );

    doTorrentGet( [ "id", "status" ], undefined, function( response ) {
      getArguments( response ).torrents.each( createTorrent );
      filterTorrents();

      // Get full update for visible torrents and start periodical updaters.
      doTorrentGet( globals.staticFields.concat( globals.updateFields ), filterDisplayed( globals.torrents ).pluck( "id" ), function( response ) {
        updateTorrents( response );
        filterTorrents();
        globals.activeTableId = "torrentTable";
        showTorrentTable();
        setTorrentsColumnsVisible( globals.torrentStatus[ globals.torrentStatusCurrent ].columns );
        sortTorrents();
        renderTorrents();

        globals.shift.updateTorrents.parametersObject.arguments.fields = globals.updateFields;
        globals.shift.torrentUpdater = doRequest( globals.shift.updateTorrents );
        globals.shift.statsUpdater = doRequest( globals.shift.updateStats );
        globals.shift.sessionUpdater = doRequest( globals.shift.updateSession );

        Event.observe( document, "keydown", handleKeyDown );
        Event.observe( document, "keyup", handleKeyUp );
      } );
    } );
  } );
} );
