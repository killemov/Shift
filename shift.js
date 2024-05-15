/**
 * Shift: a Transmission web interface.
 *
 * © 2024 Killemov.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a
 * letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 */

const nop = Function.prototype;

try {
  console.assert( 1 );
}
catch( ex ) {
  const _alert = function( msg ) {
    alert( msg );
  }
  console = {
    "error": _alert,
    "exception": _alert
  }
  [ "assert", "clear", "count", "debug", "dir", "dirxml", "group", "groupCollapsed", "groupEnd", "info", "log", "memoryProfile",
    "memoryProfileEnd", "profile", "profileEnd", "table", "time", "timeEnd", "timeStamp", "trace", "warn" ].each( function( k ) {
      console[ k ] = nop;
  } );
}

const COOKIE_KEY = "shift.settings=";
const DAY_MS = 24 * 60 * 60 * 1000;
const HEADER_TRANSMISSION = "X-Transmission-Session-Id";
const UNITS = [ "B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB" ];

const cssMapRexExp = /\.|%[0-9a-z]{2}/gi;
const magnetNameRegExp = /&dn=(.*?)&?/;
const noMatchRegExp = /\0/;
const noWordRegExp = /\\W/ig;
const templateRegExp = /\$\{.*?\}/g;
const torrentRegExp = /(\b(https?|ftp|magnet):\/?\/?[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|])/ig;
const trackerRegExp = /(\b(https?|udp):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|])/ig;

Object.extend( Object, {
  copyNestedProperties: function( o, target, keys, nestedKeys ) {
    keys.each( function( k ) {
      if( !Object.prototype.hasOwnProperty.call( o, k ) ) {
        return;
      }
      if( nestedKeys ) {
        Object.copyNestedProperties( o[ k ], target[ k ], nestedKeys );
      }
      else {
        target[ k ] = o[ k ];
      }
    } );
    return target;
  },
  diff: function( o, c ) {
    const result = {}
    for( var k in o ) {
      if( !c.hasOwnProperty( k ) || JSON.stringify( o[ k ] ) !== JSON.stringify( c[ k ] ) ) {
        result[ k ] = o[ k ];
      }
    }
    return result;
  },
  filter: function( o, iterator ) {
    const result = {};
    for( var k in o ) {
      if( iterator.call( iterator, o[ k ], k ) ) {
        result[ k ] = o[ k ];
      }
    }
    return result;
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
  sort: function( o ) {
    const result = {};
    Object.keys( o ).sort().each( function( k ) {
      result[ k ] = o[ k ];
    } );
    return result;
  },
  without: function() {
    const keys = Array.prototype.slice.call( arguments ).flatten();
    var o = keys.shift();
    o && keys.each( function( k ) {
      if( -1 === k.indexOf( "." ) ) {
        delete o[ k ];
      }
      else {
        k = k.split( "." );
        const p = o[ k.shift() ];
        p && Object.without( p, k );
      }
    } );
    return o;
  }
} );

Object.extend( Number.prototype, {
  limit: function( min, max ) {
    return Math.min( Math.max( min, this ), max );
  }
} );

Object.extend( Array.prototype, {
  concatUnique: function( e ) {
    if( 1 < arguments.length ) {
      e = Array.prototype.slice.call( arguments );
    }
    return this.pushUnique( e );
  },
  insert: function( i ) {
    this.length = i > this.length ? i : this.length;
    i = i < 0 ? this.length : i;

    this.splice.apply( this, [ i, 0 ].concat( Array.slice( arguments, 1 ) ) );
    return this;
  },
  hideAll: Enumerable.invoke.curry( "hide" ),
  isEmpty: function() {
    return 0 === this.length;
  },
  includes: Array.prototype.includes || Array.prototype.include,
  partitionBy: function( property ) {
    const result = [];
    const indexMap = [];
    for( var i = 0, len = this.length; i < len; ++i ) {
      const o = this[ i ];
      const k = Object.isFunction( property ) ? property( o ) : o[ property ];
      indexMap.pushUnique( k );
      const index = indexMap.indexOf( k );
      result[ index ] ? result[ index ].push( o ) : result.push( [ o ] );
    }
    return result;
  },
  pushUnique: function( e ) {
    if( 1 < arguments.length ) {
      e = Array.prototype.slice.call( arguments );
    }
    if( Object.isArray( e ) ) {
      for( var i = 0, len = e.length; i < len; ++i ) {
        this.pushUnique( e[ i ] );
      }
      return this;
    }

    if( !this.includes( e ) ) {
      this.push( e )
    }
    return this;
  },
  remove: function( e ) {
    if( Array.isArray( e ) ) {
      for( var i = 0, len = e.length; i < len; ++i ) {
         this.remove( e[ i ] );
      }
      return this;
    }

    var result = undefined;
    const f = Object.isFunction( e );
    const j = this.indexOf( f ? this.find( e ) : e )
    if( -1 !== j ) {
       result = this.splice( j, 1 )[ 0 ];
    }
    return f ? result : this;
  },
  setLength: function( length ) {
    this.length = length;
    return this;
  },
  shiftEach: function( fn, last ) { // _next / 2nd parameter must be called within fn.
    const self = this;
    const _next = function() {
      const item = self.shift();
      if( undefined === item ) {
        last && last();
      }
      else {
        fn && fn( item, _next );
      }
    }
    _next();
  },
  showAll: Enumerable.invoke.curry( "show" ),
  sortByProperty: function( property, order, isString ) {
    const _prepare = function( s ) {
      return s ? s.replace( noWordRegExp, " " ) : s;
    }

    this.sort( isString ? function( a, b ) { // Counter unstable Array.sort with additional index. ( a._i == null ? 0 : a._i - b._i )
      const aa = _prepare( a[ property ] );
      const bb = _prepare( b[ property ] );
      return aa == bb ? ( undefined === a._i ? 0 : a._i - b._i ) : undefined === bb ? -1 : bb.localeCompare( aa, { sensitivity: "base" } ) * ( order ? -1 : 1 );
    } : function( a, b ) {
      const aa = a[ property ];
      const bb = b[ property ];
      return aa == bb ? ( undefined === a._i ? 0 : a._i - b._i ) : undefined === bb || ( order ? aa < bb : bb < aa ) ? -1 : 1;
    } );
    return this;
  },
  squeak: function( e ) { // Like push but returns element instead of length.
    this.push( e );
    return e;
  },
  withoutArray( a ) {
    return this.slice().remove( a );
  }
} );

Object.extend( String.prototype, {
  includes: String.prototype.includes || function( s ) {
    return -1 !== this.indexOf( s );
  },
  replaceAll: String.prototype.replaceAll || function( s, r ) {
    return this.replace( s instanceof RegExp ? s : new RegExp( s, "g" ), r );
  },
  substringTo: function( s ) {
    const i = this.indexOf( s );
    return -1 === i ? this : this.substring( 0, i );
  },
  toCSS: function() {
    return encodeURIComponent( this ).toLowerCase().replace( /\.|%[0-9a-z]{2}/gi, '_' );
  }
} );

Object.extend( Element.prototype, {
  change: function() {
    return this.trigger( "change" );
  },
  getComputedStyle: function( s ) {
    const body = document.body;
    const connected = this.isConnected || body.compareDocumentPosition( this ) & Node.DOCUMENT_POSITION_CONTAINS;
    !connected && body.appendChild( this );
    const result = window.getComputedStyle( this ).getPropertyValue( s );
    !connected && body.removeChild( this );
    return result;
  },
  trigger: function( t ) {
    if( Event === Event.prototype.constructor ) {
      return this.dispatchEvent( new Event( t ) );
    }
    if( document.createEvent ) {
      const e = document.createEvent( "HTMLEvents" );
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

function $S( selector ) {
  const sheets = document.styleSheets;
  if( sheets.length < 1 ) {
    return null;
  }

  for( var i = 0, slen = sheets.length; i < slen; ++i ) {
    const rules = sheets[ i ].cssRules;

    for( var j = 0, rlen = rules.length; j < rlen; ++j ) {
      if( rules[ j ].selectorText === selector ) {
        return rules[ j ].style;
      }
    }
  }
  return null;
}

function createId( prefix, label ) {
  return prefix + label.toLowerCase().replace( /\s/g, "_" ).underscore();
}

function rE( tag, attributes, content ) {
  attributes = Object.isString( attributes ) ? { class: attributes } : attributes;
  if( attributes && attributes.style && !Object.isString( attributes.style ) ) {
    attributes.style = Object.entries( attributes.style ).invoke( "join", ": " ).join( "; " );
  }
  return new Element( tag, attributes || {} ).insert( content );
}

function rA( href, text, attributes ) {
  return rE( "a", Object.extend( { href: href, target: "_blank" }, attributes ), undefined === text ? unescape( href ) : text );
}

function rB( attributes ) {
  attributes = Object.isString( attributes ) ? { value: attributes } : attributes;
  attributes = Object.extend( { "class": "apply", type: "button", value: "Apply" }, attributes );
  const value = attributes.value;
  delete attributes.value;
  return rE( "button", attributes, value ).addClassName( "styled" );
}

const rC = rE.curry( "td" );
const rD = rE.curry( "div" );
function rI( value, attributes ) {
  value = undefined === value ? "" : value;
  return rE( "input", Object.extend( { "class": "styled", type: "text", value: value }, attributes ) )
  .observe( "keydown", preventBubbling )
  .observe( "focus", function( e ) {
    e.stop();
    const target = e.target;
    target.focus();
    const l = target.value.length;
    target.setSelectionRange( l, l );
  } );
}

const rL = rE.curry( "label" );
function rM( label, click, attributes ) {
  attributes = Object.extend( { id: createId( "menu_", label ) }, attributes );
  return rE( "li", attributes ).insert( label ).observe( "click", click );
}
const rR = rE.curry( "tr" );
const rS = rE.curry( "span" );
const rT = rE.curry( "textarea" );

function rLed( v, attributes ) {
  return Object.defineProperty( Object.extend( rE( "led", attributes ), {
    _value: false,
    setValue: function( v ) {
      this.value = v
      return this;
    },
    toggle: function() {
      return this.setValue( !this._value );
    },
    makeToggle: function() {
      return this.observe( "click", this.toggle );
    },
    _radioHandler: function( e ) {
    },
    _radio: function( e ) {
      for( var i = 0, l = this._radios.length; i < l; ++i ) {
        const r = this._radios[ i ];
        r.value = r === e.target;
        this._index = r === e.target ? i : ( this._index || 0 );
      }
      this._radioHandler( e );
    },
    _makeRadio: function( e ) {
      return e.observe( "click", this._radio.bind( this ) );
    },
    addRadio: function( radio ) {
      this._radios = this._radios || [ this._makeRadio( this ) ];
      this._radios.pushUnique( this._makeRadio( radio ) );
      return this;
    },
    getRadio: function() {
      return this._radios[ this._index ];
    },
    setRadioHandler: function( handler ) {
      this._radioHandler = handler;
      return this;
    }
  } ), "value", {
    get() {
      return this._value;
    },
    set( v ) {
      var found = false;
      if( Object.isBoolean( v ) ) {
        v = v ? "normal" : "none";
      }
      v = v ? v : "none";
      this._value = v != "none";
      for( var p in filePriority ) {
        this.toggleClassName( p, v == p );
        found |= v == p;
      }
      if( found ) {
         return this.update( filePriority[ v ].label );
      }
      for( p in uploadStatus ) {
        this.toggleClassName( p, v == p );
        found |= v == p;
      }
      if( found ) {
        return this.update( uploadStatus[ v ].label );
      }
      this.update( v );
    }
  } ).setValue( v );
}

function getTableElements() {
  return {
    columns: rE( "colgroup" ),
    header: rE( "thead" ),
    body: rE( "tbody" ),
    footer: rE( "tfoot" )
  }
}

function rTable( id, t ) {
  return rE( "table", { id: id } ).insert( Object.values( t || getTableElements() ) );
}

function normalizeOptions( options ) {
  const _vt = function( v, t ) {
    return { value: v, text: t };
  }
  const normalized = [];
  if( Object.isArray( options ) ) {
    for( var i = 0, len = options.length; i < len; ++i ) {
      normalized.push( _vt( options[ i ], options[ i ] ) );
    }
  }
  else {
    for( var k in options ) {
      const i = +k;
      k = isNaN( i ) ? k : i;
      normalized.push( Object.isFunction( options[ k ] ) ? _vt( options[ k ], k ) : _vt( k, options[ k ] ) );
    }
  }
  return normalized;
}

function renderSelect( options ) {
  if( Object.isArray( options ) ) {
    options = { options: normalizeOptions( options ) }
  }
  const select = rE( "select", options.select ).addClassName( "styled" );
  if( options.options ) {
    for( var i = 0, len = options.options.length; i < len; ++i ) {
      const o = options.options[ i ];
      select.insert( rE( "option", o ).update( o.text ? o.text : o.value ) );
    }
  }
  if( options.select && options.select.value ) {
    select.value = options.select.value;
  }
  select.selectedIndex = -1 === select.selectedIndex ? 0 : select.selectedIndex;

  select.observe( "keydown", preventBubbling );
  return select;
}

function renderPathSelect( path, cell ) {
  var div = cell && cell.down( "div.pathselect" );
  if( div ) {
    div.down().value = path;
    return div;
  }
  const l = "\u2026";
  const paths = [].concatUnique( globals.shift.settings.paths );
  const dir = globals.shift.session[ "download-dir" ];
  paths.concatUnique( dir, path || dir );
  paths.push( l );
  const select = renderSelect( paths );
  const input = rI( "" );
  div = rD( "pathselect styled" ).update( select );
  div.value = input.value = select.value = path || select.value;
  const _change = function() {
    if( l === this.value ) {
      div.update( input );
      input.observe( "blur", _blur );
      input.value = div.value;
      input.focus();
    }
    else {
      div.value = input.value = this.value;
    }
  }
  select.observe( "change", _change );
  const _blur = function() {
    if( 0 === this.value.trim().length ) {
      div.update( select );
      select.observe( "change", _change );
      select.value = div.value;
      select.focus();
    }
    else {
      div.value = this.value;
    }
  }
  input.observe( "blur", _blur );
  return div;
}

function isEmpty( s ) {
  return undefined === s || null === s || 0 === s.length || Object.isEmpty( s );
}

function copyToClipboard( s ) {
  document.observe( "copy", function( e ) {
    e.clipboardData.setData( "text/plain", s );
    e.preventDefault();
    document.stopObserving( "copy" );
  } );
  document.execCommand( "copy" );
}

function copyObjectToClipboard( o ) {
  copyToClipboard( JSON.stringify( Object.sort( o ), null, 2 ) );
}

function cookiefy( data ) {
  const date = new Date();
  date.setTime( date.getTime() + 365 * DAY_MS );
  document.cookie = COOKIE_KEY + window.btoa( Object.toJSON( data ) ) + "; expires=" + date + "; SameSite=strict";
  return data;
}

function persistPath( path ) {
  const settings = globals.shift.settings;
  const len = settings.paths.length;
  settings.paths.pushUnique( path );
  settings.paths.length !== len && settings.pathsPersistent && cookiefy( settings );
  return path;
}

// riffwave by Pedro Ladaria <pedro.ladaria at Gmail dot com>
const FastBase64 = {
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
      var n = src[ i ] << 16 | src[ i + 1 ] << 8 | src[ i + 2 ];
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
  }

  if( Array.isArray( data ) ) {
    this.make( data );
  }
}

function newRequest( method, args, onSuccess, properties ) {
  const request = {
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
  if( isEmpty( request.parametersObject.arguments.ids ) ) {
    delete request.parametersObject.arguments.ids;
  }
  return request;
}

function newPeriodicalUpdater( method, interval, onSuccess, fields, ids ) {
  return newRequest( method, fields ? {
    fields: fields, ids: ids
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

const columnKeys = [
  "menu", "queuePosition", "status",
  "errorString", "recheckProgress", "corruptEver",
  "percentDone", "rateDownload", "rateUpload", "uploadedEver", "uploadRatio", "sizeWhenDone", "name", "labels" ];

const globals = {
  torrentStatus: {
    "-1": {
      label: "All",
      columns: [ "menu", "queuePosition", "status", "percentDone", "rateDownload", "rateUpload", "sizeWhenDone", "name", "labels" ],
      fields: [ "id", "status", "percentDone", "rateDownload", "rateUpload", "eta", "uploadedEver" ],
      keyCode: 65
    },
    0: {
      label: "Stopped",
      columns: [ "menu", "queuePosition", "errorString", "percentDone", "sizeWhenDone", "name", "labels" ],
      fields: [ "id", "status", "error" ],
      keyCode: 83,
      onChange: function() { // Do extra handling when this status is selected.
        globals.shift.torrentUpdater.mod( {
          fields: [ "id", "status", "error", "errorString" ],
          ids: filterStatus().pluck( "id" )
        }, function( response ) {
          globals.shift.torrentUpdater.default();
          globals.shift.updateTorrents.onSuccess( response );
        } )
      }
    },
    1: {
      label: "Check waiting",
      columns: [ "menu", "queuePosition", "percentDone", "corruptEver", "sizeWhenDone", "name", "labels" ],
      fields: [ "id", "status", "percentDone", "corruptEver" ],
      keyCode: 67
    },
    2: {
      label: "Checking",
      columns: [ "menu", "queuePosition", "percentDone", "recheckProgress", "corruptEver", "sizeWhenDone", "name", "labels" ],
      fields: [ "id", "status", "percentDone", "recheckProgress", "corruptEver", "sizeWhenDone" ],
      keyCode: 67
    },
    3: {
      label: "Download waiting",
      columns: [ "menu", "queuePosition", "percentDone", "sizeWhenDone", "name", "labels" ],
      fields: [ "id", "status", "percentDone" ],
      keyCode: 68
    },
    4: {
      label: "Downloading",
      columns: [ "menu", "queuePosition", "percentDone", "rateDownload", "rateUpload", "sizeWhenDone", "name", "labels" ],
      fields: [ "id", "status", "percentDone", "rateDownload", "rateUpload", "uploadedEver", "eta" ],
      keyCode: 68
    },
    5: {
      label: "Seed waiting",
      columns: [ "menu", "queuePosition", "percentDone", "sizeWhenDone", "name", "labels" ],
      fields: [ "id", "status", "percentDone" ],
      keyCode: 85
    },
    6: {
      label: "Seeding",
      columns: [ "menu", "queuePosition", "rateUpload", "uploadedEver", "uploadRatio", "sizeWhenDone", "name", "labels" ],
      fields: [ "id", "status", "rateUpload", "uploadedEver", "uploadRatio" ],
      keyCode: 85
    }
  },
  hashIndex: 0,
  headerState: 0,
  magnets: [],
  removed: [],
  requestHeaders: [ HEADER_TRANSMISSION, "" ],
  rpcUrl: "../rpc",
  selectedIds: [],
  table: true,
  templateFields: [ "id", "files" ],
  torrents: [],
  torrentHash: {},
  torrentStatusDefault: 4,
  shift: {
    settings: {},
    version: "1.1",
    updateTorrents: newPeriodicalUpdater( "torrent-get", 2, function( response ) {
      const args = getArguments( response );
      args.removed && getQueuePositions( args.removed );
      if( args.torrents ) {
        filterTorrents( updateTorrents( response ) );
        if( "torrentTable" == globals.activeTableId ) {
          if( globals.torrentStatusChanged ) {
            setTorrentsColumnsVisible( globals.torrentStatus[ globals.currentStatus ].columns );
          }
          sortTorrents();
          renderTorrents();
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
  staticFields: [ "labels", "name", "percentDone", "queuePosition", "sizeWhenDone" ]
}
globals.currentStatus = globals.torrentStatusDefault;
globals.updateFields = globals.torrentStatus[ globals.currentStatus ].fields;

const comparators = {
  "<": function( x, y ) { return x < y },
  "<=": function( x, y ) { return x <= y },
  "==": function( x, y ) { return x == y },
  ">=": function( x, y ) { return x >= y },
  ">": function( x, y ) { return x > y }
}
const defaultOptions = normalizeOptions( Object.keys( comparators ) );

const filePriority = { "high": { label: "+" }, "normal": { label: " " }, "low": { label: "&ndash;" }, "none": { label: "" } };
const filePriorityKeys = Object.keys( filePriority );
function getPriority( f ){
  return filePriorityKeys[ f.wanted ? 1 - f.priority : 3 ];
}
const uploadStatus = { "loading": { label: "&#9656;" }, "loaded": { label: "&#9991;" }, "uploading": { label: "&#9652;" }, "added": { label: "+" }, "duplicate": { label: "&#10006;" } };
const fileMenuItems = [ "Rename" ];

const sessionFields = {
  "blocklist-size": { _ro: true },
  "config-dir": { _ro: true },
  "download-dir": { render: renderPathSelect },
  "download-dir-free-space": { _ro: true, render: renderSize },
  "encryption": { values: normalizeOptions( [ "required", "preferred", "tolerated" ] ) },
  "incomplete-dir": { render: renderPathSelect },
  "peer-port": { action: function( row, keyCell ) { // actions return true if handling should continue.
    const l = rLed( false, { id: "port-is-open", title: "Checking", readonly: "readonly" } );
    keyCell.insert( l );
    doRequest( "port-test", {}, function( response ) {
      updateFields( getArguments( response ) );
    } );
    return true;
  } },
  "rpc-version": { _ro: true },
  "rpc-version-minimum": { _ro: true },
  "rpc-version-semver": { _ro: true },
  "session-id": { _ro: true },
  "units": { _ignore: true },
  "version": { _ro: true }
}

const torrentActionLabels = [ "Select", "Details", "Refresh", "Check", "Start", "Start Now", "Stop", "Reannounce", "Relocate", "Recycle", "Remove", "Trash" ];
const torrentActions = {};

function replacer( m, torrent ) {
  torrent = torrent || globals.currentTorrent;
  const s = globals.shift;
  const kv = m.substring( 2, m.length - 1 ).split( '.' );
  const v = kv[ 1 ];
  var result = "";
  switch( kv[ 0 ] ) {
    case "session":
      result = s.session[ v ];
      break;
    case "shift":
      result = s.settings[ v ];
      break;
    case "torrent":
      result = s.settings.screenshotMode ? v.capitalize() : torrent && torrent[ v ];
      break;
    default:
      return m;
  }
  return result && result.replaceAll( templateRegExp, replacer );
}

const torrentFields = {
  "activityDate": { render: renderDateTime },
  "addedDate": { render: renderDateTime },
  "availability": {
    render: renderAvailability,
    sss: function( availability ) {
      const a = [];
      for( var i = 0, len = availability.length; i < len; ++i ) {
        a[ i ] = Math.floor( Math.random() * 65 ) - 1;
      }
      return a;
    }
  },
  "bandwidthPriority": {
    edit: true,
    values: normalizeOptions( { "-1": "Low", "0": "Normal", "1": "High" } ).sortByProperty( "value" )
  },
  "comment": {
    render: function( comment ) {
      return comment.replace( torrentRegExp, "<a href=\"$1\" target=\"_blank\">$1</a>" );
    },
    sss: true
  },
  "corruptEver": { _column: { label: "Corrupt", render:renderSizeCell }, render: renderSize },
  "creator": { sss: true },
  "dateCreated": { render: renderDateTime },
  "desiredAvailable": { render: renderSize },
  "doneDate": { render: renderDateTime },
  "downloadDir": {
    edit: true,
    getValue: function( cell ) {
      return cell.down( "div.pathselect" ).value;
    },
    render: renderPathSelect, sss: true },
  "downloadedEver": { render: renderSize },
  "downloadLimit": { edit: true },
  "downloadLimited": { edit: true },
  "editDate": { render: renderDateTime },
  "error": {},
  "errorString": { _column: { label: "Error" } },
  "eta": {},
  "etaIdle": {},
  "file-count": {},
  "files": {
    "bytesCompleted": {},
    "length": {},
    "name": {},
    _ignore: true,
    sss: true
  },
  "fileStats": {
    "bytesCompleted": {},
    "priority": {},
    "wanted": {},
    _ignore: true },
  "group": {},
  "hashString": { sss: true },
  "haveUnchecked": { render: renderSize },
  "haveValid": { render: renderSize },
  "honorsSessionLimits": { edit: true },
  "id": { _ignore: true },
  "isFinished": {},
  "isPrivate": {},
  "isStalled": {},
  "leftUntilDone": { render: renderSize },
  "labels": {
    _column: {
      renderCell: "name",
      filter: {
        active: function() {
          return !isEmpty( this.value );
        },
        cost: 10,
        value: "",
        renderNode: renderLabelFilter,
        match: function( torrent ) {
          if( this.exclude ) {
            return isEmpty( torrent.labels ) || !torrent.labels.includes( this.value );
          }
          else {
            return !isEmpty( torrent.labels ) && torrent.labels.includes( this.value );
          }
        }
      }
    },
    edit: true,
    getValue: function( cell ) {
      return cell.down( "span.labels" ).select( ".label" ).pluck( "innerHTML" ).sort();
    },
    render: renderLabels
  },
  "location": { _ignore: true },
  "magnetLink": { render: function( link ) { return rA( link ) }, sss: true },
  "manualAnnounceTime": {},
  "maxConnectedPeers": {},
  "metadataPercentComplete": { render: renderPercentage },
  "name": {
    _column: {
      render: renderName,
      isString: true,
      filter: {
        active: function() {
          return !isEmpty( this.value ) || this.value instanceof RegExp;
        },
        cost: 6,
        value: "",
        renderNode: renderNameFilter,
        match: function( torrent ) {
          return undefined === torrent.name || ( this.isRegExp ? this.value.test( torrent.name ) : torrent.name.toLowerCase().includes( this.value ) );
        }
      }
    },
    sss: true
  },
  "peer-limit": { edit: true },
  "peers": { _ignore: true },
  "peersConnected": {},
  "peersFrom": { _ignore: true },
  "peersGettingFromUs": {},
  "peersSendingToUs": {},
  "percentComplete": { render: renderPercentage },
  "percentDone": {
    _column: {
      label: "Done",
      render: renderPercentDone,
      defaultOrder: false,
      filter: {
        active: function() { // 0.0 <= this.value <= 1.0
          return 0.0 < this.value && this.value < 1.0 ||
            0.0 === this.value && [ comparators[ "==" ], comparators[ "<=" ], comparators[ ">" ] ].includes( this.comparator ) ||
            1.0 === this.value && [ comparators[ "==" ], comparators[ ">=" ], comparators[ "<" ] ].includes( this.comparator );
        },
        cost: 2,
        comparatorLabel: "<=",
        comparator: comparators[ "<=" ],
        value: 1.0,
        renderNode: renderPercentDoneFilter,
        match: function( torrent ) {
          return undefined === torrent.percentDone || this.comparator( torrent.percentDone, this.value );
        }
      }
    },
    render: renderPercentage
  },
  "pieces": { render: renderPieces },
  "pieceCount": {},
  "pieceSize": { render: renderSize },
  "primary-mime-type": {},
  "priorities": { _ignore: true },
  "queuePosition": {
    _column: {
      label: "Q",
      listHandler: function( e, torrent ) {
        globals.currentTorrent = torrent;
        showPopup( "popupQueue", function( e ) {
          const action = e.target.id;
          doRequest( "queue-move-" + action, { ids: getSelected().pluck( "id" ) }, getQueuePositions.curry( null ) );
        }, e, function( popup, e ) {
          return e.shiftKey;
        } );
      }
    },
    edit: true
  },
  "rateDownload": { _column: { label: "Down", render: renderSpeed }, render: renderSpeed, value: 0 },
  "rateUpload": { _column: { label: "Up", render: renderRateUpload }, render: renderSpeed, value: 0 },
  "recheckProgress": { _column: { label: "Checked", render:renderPercentage }, render: renderPercentage },
  "secondsDownloading": {},
  "secondsSeeding": {},
  "seedIdleLimit": { edit: true },
  "seedIdleMode": { edit: true },
  "seedRatioLimit": { edit: true },
  "seedRatioMode": { edit: true },
  "sequentialDownload": { edit: true },
  "sizeWhenDone": {
    _column: { // 0 <= this.value
      label: "Size",
      render: renderSizeCell,
      filter: {
        active: function() {
          return !( 0 === this.value && this.comparator == comparators[ ">=" ] );
        },
        cost: 2,
        comparatorLabel: ">=",
        comparator: comparators[ ">=" ],
        value: 0,
        renderNode: renderSizeFilter,
        match: function( torrent ) {
          return undefined === torrent.sizeWhenDone || this.comparator( torrent.sizeWhenDone, this.value );
        }
      }
    },
    render: renderSize
  },
  "startDate": { render: renderDateTime },
  "status": {
    render: renderStatus,
    _column: {
      render: renderStatus,
      filter: {
        active: function() {
          return -1 !== this.value;
        },
        cost: 1,
        visible: true,
        value: globals.currentStatus,
        renderNode: renderStatusFilter,
        match: function( torrent ) {
          return undefined === torrent.status || this.value == torrent.status
        }
      }
    }
  },
  "torrentFile": {
    render: function( file ) {
      file = file.substring( file.lastIndexOf( "/" ) + 1 );

      const settings = globals.shift.settings;
      if( !settings.torrentLinkEnabled && !settings.torrentLinkTemplateEnabled ) {
        return file;
      }

      const hash = 3.00 <= globals.version;
      const t = globals.currentTorrent;
      var url = settings.torrentLink + file;
      file = hash ? ( settings.screenshotMode ? file : t.name ) + ".torrent" : file;
      const l = rA( url, file );
      if( settings.torrentLinkTemplateEnabled ) {
        url = l.href;
        l.href = "javascript:void(0)";
        l.target = "_top";
        l.title = "Click to copy to clipboard.";
        l.observe( "click", function( e ) {
          copyToClipboard( settings.torrentLinkTemplate.replaceAll( templateRegExp, replacer ) );
          return false;
        } );
      }
      else if( hash ) {
        l.download = file;
      }
      return l;
    },
    sss: true
  },
  "totalSize": { render: renderSize },
  "trackers": {
    "announce": {},
    "id": {},
    "scrape": {},
    "sitename": {},
    "tier": {},
    _ignore: true
  },
  "trackerAdd": { edit: true, _ignore: true },
  "trackerList": { _ignore: true },
  "trackerRemove": { edit: true, _ignore: true },
  "trackerReplace": { edit: true, _ignore: true },
  "trackerStats": {
    "announce": {},
    "announceState": {},
    "downloadCount": {},
    "hasAnnounced": {},
    "hasScraped": {},
    "host": {},
    "id": {},
    "isBackup": {},
    "lastAnnouncePeerCount": {},
    "lastAnnounceResult": {},
    "lastAnnounceStartTime": {},
    "lastAnnounceSucceeded": {},
    "lastAnnounceTime": { render: renderDateTime },
    "lastAnnounceTimedOut": {},
    "lastScrapeResult": {},
    "lastScrapeStartTime": {},
    "lastScrapeSucceeded": {},
    "lastScrapeTime": { render: renderDateTime },
    "lastScrapeTimedOut": {},
    "leecherCount": {},
    "nextAnnounceTime": {},
    "nextScrapeTime": { render: renderDateTime },
    "scrape": {},
    "scrapeState": {},
    "seederCount": {},
    "sitename": {},
    "tier": {},
    _ignore: true
  },
  "uploadedEver": { _column: { label: "Uploaded", render: renderSizeCell }, render: renderSize },
  "uploadLimit": { edit: true },
  "uploadLimited": { edit: true },
  "uploadRatio": { _column: { label: "Karma", render: renderUploadRatio }, render: renderPercentage },
  "wanted": { _ignore: true },
  "webseeds": { _ignore: true },
  "webseedsSendingToUs": {}
}

const torrentFieldKeys = [];
const torrentDetailsUpdateKeys = [];
const TorrentDefaults = {
  _selected: false,
  _displayed: false
}

function updatePostSession() {
  Array.prototype.push.apply( torrentFieldKeys, Object.keys( torrentFields ) );
  Array.prototype.push.apply( torrentDetailsUpdateKeys, Object.keys( Object.filter( torrentFields, function( value ) {
    value._ro = value._ro || !value.edit;
    return !value._ignore;
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
  ).pushUnique( "id" ) );

  torrentFieldKeys.reduce( function( o, k ) {
    const v = torrentFields[ k ].value;
    if( undefined !== v ) {
      o[ k ] = v;
    }
    return o;
  }, TorrentDefaults );

  torrentActionLabels.concat( [ "add", "get", "set", "Rename" ] ).each( function( action ) {
    const label = action;
    action = action.toLowerCase();
    torrentActions[ action ] = {
      label: label,
      method: "torrent-" + function( a ) {
        switch( a ) {
          case "check": return "verify";
          case "refresh": return "torrent-get";
          case "relocate": return "set-location";
          case "rename": return "rename-path";
          default: return a.replace( " ", "-" );
      }
    } ( action ) };
  } );
  torrentActions[ "trash" ].method = torrentActions[ "remove" ].method;
}

function showDone() {
  globals.html.style.cursor = "auto";
}

function showWait() {
  globals.html.style.cursor = "progress";
}

function getQueuePositions( removed ) {
  removed && removed.each( function( id ) {
    globals.removed.pushUnique( id );

    const t = getTorrent( id );
    if( t ) {
      t._node.remove();
      globals.torrents.remove( t );
      sendNotification( 3, "Torrent removed.", getBody( t ) );
    }
    delete torrentHash[ id ];
  } );

  if( globals.version >= 14 ) { // 2.40
    globals.shift.torrentUpdater.default( [ "queuePosition" ], function( response ) {
      globals.shift.torrentUpdater.default();
      globals.shift.updateTorrents.onSuccess( response );
    } );
  }
}

function postTorrentRemove( action, response ) {
  if( !success( response ) ) {
    sendNotification( 1, "Torrent removal error." );
  }
}

function getTorrent( id, setGlobal ) {
  const result = globals.torrentHash[ id ];
  if( setGlobal ) {
    globals.currentTorrent = result;
  }
  return result;
}

function getTorrents( ids ) {
  return ids.map( getTorrent );
}

function arrayBufferToString( ab ) {
  const CHUNK_SIZE = 65532;

  var s = "";
  var left = ab.byteLength;
  for (var i = 0, len = left; i < len; i += CHUNK_SIZE ) {
    s += String.fromCharCode.apply( null, new Uint8Array( ab, i, Math.min( CHUNK_SIZE, left ) ) );
    left -= CHUNK_SIZE;
  }
  return s;
}

function recycleTorrents( torrents ) {
  var _handler, r, s, t;

  const _next = function() {
    t = torrents.shift();
    if( undefined === t ) {
      getQueuePositions();
      return null;
    }
    r = new XMLHttpRequest();
    Event.observe( r, "load", _handler );
    r.open( "GET", globals.shift.settings.torrentLink + getFilePart( t.torrentFile ) );
    r.responseType = "arraybuffer";
    r.send( null );
  }

  const _isValid = function() {
    if( r.status != 200 ) {
      t.update( {
        error: r.status,
        errorString: r.status + " " + r.statusText
      } );
      sendNotification( 1, "Recycling error. Status " + r.status + ": " + r.statusText + ".", getBody( t ) );
      return false;
    }

    if( !r.response ) {
      t.update( {
        error: 3,
        errorString: "No data in response."
      } );
      sendNotification( 1, "Recycling error. No response data.", getBody( t ) );
      return false;
    }

    s = arrayBufferToString( r.response )
    if( !s.startsWith( "d8:announce" ) && !s.startsWith( "d13:announce-list" ) ) {
      t.update( {
        error: 3,
        errorString: "Junk in response."
      } );
      sendNotification( 1, "Recycling error. File is not a torrent.", getBody( t ) );
      return false;
    }

    return true;
  }

  _handler = function() {
    if( !_isValid() ) {
      _next();
      return;
    }

    globals.removed.concatUnique( t.id );
    doRequest( "torrent-remove", { ids: [ t.id ] }, function( response ) {
      if( !success( response ) ) {
        sendNotification( 1, "Recycling error. Could not remove torrent.", getBody( t ) );
        _next();
        return;
      }
      addTorrent( window.btoa( s ), function( response ) {
        if( success( response ) ) {
          filterTorrents();
          sortTorrents();
        }
        else {
          sendNotification( 1, "Recycling error. Could not add torrent.", getBody( t ) );
        }
        _next();
      } );
    } );
  }
  globals.version < 14 ? _next() : doRequest( "queue-move-bottom", { ids: torrents.pluck( "id" ) }, _next );
}

function handleTorrentActionClick( e ) {
  const action = e.target.id;

  closePopup();

  if( !torrentActions[ action ] ) {
    return;
  }

  showWait();

  if( "details" == action ) {
    $( "menu_details" ).click();
    return;
  }

  const selected = getSelected();
  const preRequest = function( request ) { return request }
  var postRequest = preRequest;
  var postResponse = null;

  const args = {
    ids: selected.pluck( "id" )
  }

  const d = globals.dialogs[ action ];
  switch( action ) {
    case "recycle":
      fetchTorrents( [ "id", "torrentFile" ], args.ids, function( response ) {
        recycleTorrents( updateTorrents( response ) );
      } );
      return;

    case "refresh":
      fetchTorrents( globals.staticFields.concat( globals.updateFields ), args.ids, function( response ) {
        filterTorrents( updateTorrents( response, true ) );
      } );
      return;

    case "relocate":
      args.location = persistPath( d.paths.value );
      args.move = d.move.value;
      fetchDownloadDirs( args.ids );
      postResponse = function() {
        fetchDownloadDirs( args.ids, function( response ) {
          const oldPaths = {};
          const ts = updateTorrents( response, false, function( torrent ) {
            oldPaths[ torrent.id ] = torrent.downloadDir;
          } ).partition( function( torrent ) {
             return torrent.downloadDir === args.location;
          } );

          var b;
          if( !isEmpty( ts[ 0 ] ) ) {
            b = {};
            if( ts[ 0 ].length == 1 ) {
              b = getBody( ts[ 0 ][ 0 ], "\nRelocated to:\n\"" + args.location + "\"" );
            }
            else {
              b.body = "Relocated\n" + ts[ 0 ].map( function( torrent ) {
                return "\"" + oldPaths[ torrent.id ] + torrent.name + "\"";
              } ).join( "\n" ) + "\nto\n\"" + args.location + "\"";
            }
            sendNotification( 2, "Relocation successful.", b );
          }

          if( !isEmpty( ts[ 1 ] ) ) {
            b = {};
            if( ts[ 1 ].length == 1 ) {
              b = getBody( ts[ 1 ][ 0 ], "\nCould not relocate to:\n\"" + args.location + "\"" );
            }
            else {
              b.body = "Could not relocate\n" + ts[ 1 ].map( function( torrent ) {
                return "\"" + torrent.downloadDir + torrent.name + "\"";
              } ).join( "\n" ) + "\nto\n\"" + args.location + "\"";
            }
            sendNotification( 1, "Relocation error.", b );
          }
        } );
      }
      break;

    case "rename":
      const rename = {
         path: getTargetPath(),
         name: d.fileName.value
      }
      if( -1 == globals.pathDepth ) {
        rename.node = globals.currentFile.node.down( "td.name" );
      }
      renameFiles( [ rename ] );
      return;

    case "trash":
      const partitioned = selected.partition( function( torrent ) {
        return torrent.isMagnet();
      } );
      var selectedMagnetIds = partitioned[ 0 ].pluck( "id" );

      args.ids = partitioned[ 1 ].pluck( "id" );
      if( args.ids.length > 0 ) {
        args[ "delete-local-data" ] = true;
        if( selectedMagnetIds.length > 0 ) {
          postResponse = function() {
            doRequest( torrentActions[ action ].method, { ids: selectedMagnetIds }, postTorrentRemove.curry( action ) );
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
  postResponse = postResponse || function() {
    setTimeout( getErrorData, 1000 );
  }

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

  if( "select" === globals.action ) {
    return globals.currentTorrent.toggleSelect();
  }

  const d = globals.dialogs;
  d.additional.update();

  globals.selected = getSelected();
  const dialog = d[ globals.action ];
  const open = dialog && dialog.open;
  if( open && open() ) {
    closePopup( e );
    const l = torrentActions[ globals.action ].label;
    const p = showPopup( "popupDialog" );
    dialog.close && ( p.close = dialog.close );
    p.down( "h1" ).update( l );
    p.down( "span" ).update( globals.action );
    d.torrents.update( "\"" + globals.selected.pluck( "name" ).join( "\",<br>\n\"" ) + "\"" );
    d.action.update( l ).setAttribute( "id", globals.action );
    if( "relocate" === globals.action ) {
      d.relocate.paths.focus();
    }
    return;
  }
  handleTorrentActionClick( e );
}

function selectTorrents( action ) {
  var select = "select visible" == action;
  const visible = select || "deselect visible" == action;
  select = select || "select all" == action;
  globals.torrents.each( function( torrent ) {
    torrent.selected = !visible || visible && torrent.displayed ? select : torrent.selected;
  } );
}

function storeSelection() {
  globals.selectedIds = getSelected().pluck( "id" );
}

function restoreSelection() {
  globals.torrents.each( function( torrent ) {
    torrent.selected = globals.selectedIds.includes( torrent.id );
  } );
}

const torrentColumns = columnKeys.reduce( function( o, k ) {
  const f = torrentFields[ k ];
  const v = f && f._column;
  if( undefined !== v ) {
    o[ k ] = v;
  }
  return o;
}, {
  "menu": {
    label: rLed().observe( "click", function( e ) {
      showPopup( "popupGeneral", function( e ) {
        const action = e.target.id;
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
      $( "recycle" )[ globals.shift.settings.torrentLinkEnabled && torrent.error >= 3 ? "show" : "hide" ]();
      showPopup( "popupTorrent", handleTorrentMenuClick, e );
    }
  }
} );

globals.torrentColumnHash = columnKeys.reduce( function( a, k ) {
  return a.pushUnique( torrentColumns[ k ] );
}, [] );
globals.sortProperty = updateOrder( torrentColumns );

Object.copyNestedProperties( torrentFields, torrentColumns, Object.keys( torrentColumns ), [ "sss" ] );

( function() {
  for( var key in globals.torrentStatus ) {
    const s = globals.torrentStatus[ key ];
    s.columns = Object.copyNestedProperties( torrentColumns, {}, s.columns );
  }
}() );

const filters = Object.values( torrentColumns ).pluck( "filter" ).compact().sort( function( a, b ) { return a.cost < b.cost } );

function filterTorrents( torrents ) {
  const f = filters.filter( function( filter ) {
    return Object.isFunction( filter.active ) ? filter.active() : filter.active;
  } ).reverse();

  torrents = torrents || globals.torrents;
  return torrents.filter( function( torrent ) {
    var display = true;
    for( var i = 0, len = f.length; i < len && display; ++i ) {
      display = f[ i ].match( torrent );
    }
    return torrent.displayed = display;
  } );
}

function filterDisplayed( torrents ) {
   return torrents.filter( function( torrent ) {
     return torrent.displayed;
  } );
}

function filterSelected( torrents ) {
  return torrents.filter( function( torrent ) {
    return torrent.selected;
  } );
}

function filterStatus( status ) {
  status = status === undefined ? globals.currentStatus : status;
  if( -1 == status ) {
    return globals.torrents;
  }

  return globals.torrents.filter( function( torrent ) {
    return status == torrent.status;
  } );
}

function getSelected() {
  const selected = filterDisplayed( filterSelected( globals.torrents ) );
  return selected.isEmpty() ? [ globals.currentTorrent ] : selected;
}

const fileColumns = {
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

const peerColumns = {
  "menu": { label: rLed(), render: rLed },
  "address": { label: "Peer", defaultOrder: false, sss: true },
  "port": {},
  "rateToClient": { label: "Down", render: renderSpeed },
  "rateToPeer": { label: "Up", render: renderSpeed },
  "progress": { label: "Has", render: renderPercentage },
  "flagStr": { label: "Flags", render: renderFlags },
  "clientName": { label: "Client" }
}

const peerFlags = {
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

const trackerFields = [ "id", "trackers", "trackerList" ];

const trackerColumns = {
  "menu": {
    label: rLed(),
    render: rLed,
    listHandler: function( e, tracker ) {
      globals.currentTracker = tracker;
      showPopup( "popupTracker", function( e ) {
        globals.action = e.target.id;
        switch( globals.action ) {
          case "remove":
            fixTorrents( { ids: [ globals.currentTorrent.id ], trackerRemove: [ globals.currentTracker ] } );
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
globals.trackerColumnHash = Object.values( trackerColumns ).filter( function( column ) {
  return column.render;
} );

const webseedColumns = {
  "webseeds": { label: "Webseeds" }
}

const detailsColumns = {
  "key": {},
  "value": {}
}

const peersFromColumns = detailsColumns;
const sessionColumns = detailsColumns;
const shiftColumns = detailsColumns;

const renderSizeOk = function( size ) {
  return size === undefined ? "?" : renderSize( size );
}

const pathColumns = {
  "path": {},
  "free": { render: renderSizeOk },
  "total": { render: renderSizeOk },
  "count": { label: "#" },
  "menu": { label: "", render: function() { return rLed().makeToggle() } }
}

const Torrent = Class.create( {
  initialize: function( torrent, keys ) {
    Object.extend( this, TorrentDefaults );
    this.update( torrent, keys );
  },
  isMagnet: function() {
    return ( undefined === this.metadataPercentComplete || 1.0 > this.metadataPercentComplete ) && 0.0 == this.percentDone && 0.0 == this.sizeWhenDone && !this.isSeeding();
  },
  isSeeding: function() {
    return ( globals.version < 14 ? 8 : 6 ) === this,status;
  },
  select: function() {
    return this.setValue( true );
  },
  deselect: function() {
    return this.setValue( false );
  },
  toggleSelect: function( select ) {
    return this.setValue( undefined === select ? !this.selected : select );
  },
  setValue: function( s ) {
    this.selected = s;
    return this;
  },
  update: function( torrent, keys ) {
    const array = Object.isArray( torrent );
    this._dirty = this._dirty || [];
    keys = keys || Object.keys( torrent );
    for( var i = 0; i < keys.length; ++i ) {
      const k = keys[ i ];
      const o = this[ k ];
      const v = torrent[ array ? i : k ];
      if( o != v ) {
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
                if( undefined !== o && "Downloading" == globals.torrentStatus[ o ].label ) {
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

Object.defineProperty( Torrent.prototype, "selected", {
  get() {
    return this._selected;
  },
  set( s ) {
    if( this._selected != s ) {
      this._selected = s;
      if( this._node ) {
        this._node.toggleClassName( "selected", this._selected );
        this._node.down( "led" ).value = s;
      }
    }
  }
} );

Object.defineProperty( Torrent.prototype, "displayed", {
  get() {
    return this._displayed;
  },
  set( d ) {
    this._displayed = d;
  }
} );

function showPopup( popup, handler, e, keepOpen ) {
  popup = $( popup );
  const popups = $( "popups" );
  const outside = $( "outside" );
  const elements = [ outside, popups, popup ];

  // Prevent stacking visually.
  popups.select( ".popup" ).hideAll();

  popups.close = function( e ) {
    if( keepOpen && keepOpen( popup, e ) ) {
      return;
    }
    elements.hideAll().invoke( "stopObserving", "click" );
    popup.close && popup.close( e );
    delete popup.close;
    delete popups.close;
  }

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
  const popups = $( "popups" );
  popups.close && popups.close( e );
}

function showAddPopup( e ) {
  e && e.stop();
  showPopup( "popupAdd" );
  const label = $( "labelDir" );
  const input = label.next();
  input && input.remove();
  const d = globals.dialogs.add;
  d.paths = renderPathSelect();
  label.insert( { after: d.paths } );
  if( torrentRegExp.test( d.url.value ) ) {
    return;
  }
  if( navigator.clipboard && navigator.clipboard.readText ) {
    navigator.clipboard.readText().then( function( text ) {
      d.url.value = text.match( torrentRegExp );
      d.url.value && d.isUrl.click();
    } );
  }
}

function getTorrentFileNames( torrent ) {
  torrent = torrent || globals.currentTorrent;
  fetchTorrents( [ "id", "files", "name" ], [ torrent.id ], function( response ) {
    if( success( response ) ) {
      filterTorrents( updateTorrents( response ) );
      $( "fileBody" ).update();
      renderFiles( torrent );
    }
  } );
}

function renameFiles( renames ) {
  var a;

  const _next = function() {
    a = renames.shift();
    if( undefined === a ) {
      getTorrentFileNames();
      return;
    }

    if( getFilePart( a.path ) == a.name ) {
      _next();
      return;
    }

    a.ids = [ globals.currentTorrent.id ];
    const node = a.node;
    delete a.node;

    doRequest( "torrent-rename-path", a, function( response ) {
      const args = getArguments( response );
      if( success( response ) ) {
        if( node ) {
          node.update( args.name );
        }
      }
      else {
        sendNotification( 1, "Renaming error.", { body: "Could not rename\n\"" + getFilePart( args.path ) + "\nto\n\"" + args.name + "\"" } );
      }
      _next();
    } );
  }
  _next();
}

function renderDateTime( seconds ) {
  return seconds > 0 ? new Date( 1000 * seconds ).toJSON().substr( 0, 19 ).replace( "T", " " ) : "-";
}

function renderDateTimeShort( seconds ) {
  if( seconds > 0 ) {
    const s = renderDateTime( seconds );
    seconds *= 1000;
    const now = new Date().getTime()
    return seconds < now - DAY_MS || seconds > now + DAY_MS ? s.substr( 0, 10 ) : s.substr( 11, 8 )
  }
  return "-";
}

function renderFlags( flags, peer, attribute, cell ) {
  if( cell ) {
    cell.title = flags.toArray().map( function( flag ) { return flag + " = " + peerFlags[ flag ] } ).join( "\n" );
  }
  return flags;
}

const pctClassNames = [ "pct0", "pct25", "pct50", "pct75", "pct100" ];

function setPercentageClass( e, percentage, multiplier ) {
  multiplier = multiplier || 1.0;
  percentage *= multiplier;
  percentage = percentage.limit( 0.0, 1.0 );
  for( var i = 0, len = pctClassNames.length; i < len; ++i ) {
    e.toggleClassName( pctClassNames[ i ], i == Math.floor( percentage * ( len - 1 ) ) );
  }
  return e;
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

function getRGBA( rgba ) {
  const s = "background-color";
  var index = rgba.indexOf( "rgb" );
  if( -1 === rgba.indexOf( "rgb" ) ) {
    const style = {};
    style[ s ] = rgba;
    rgba = rD().hide().setStyle( style ).getComputedStyle( s );
  }
  index = rgba.indexOf( "rgb" );
  rgba = rgba.substring( index );
  rgba += -1 === rgba.indexOf( "rgba") ? ",1" : "";
  return rgba.match( /[\.\d]+/g ).map( function( a ) { return +a } );
}

function c32( r, g, b, a ) {  // ABGR
  if( Object.isString( r ) ) {
    r = getRGBA( r );
  }
  if( Object.isArray( r ) ) {
    a = r[ 3 ] || 1.0;
    b = r[ 2 ] || 0;
    g = r[ 1 ] || 0;
    r = r[ 0 ] || 0;
  }
  return r | g << 8 | b << 16 | a * 255 << 24;
}

function createCanvas( property ) {
  const canvas = rE( "canvas", { "class": property } );
  canvas.height = 1;
  canvas.width = globals.pieceCount;
  return canvas;
}

var availabilityColors;
function renderAvailability( availability, cell ) {
  const steps = 16;
  const torrent = globals.currentTorrent;
  if( torrent.pieceCount > globals.maxPieceCount ) {
    return;
  }
  var canvas = cell.down( "canvas.availability" ) || createCanvas( "availability" );

  const _HSL = function( hStart, hEnd ) {
    const colors = [];

    var hue = hStart;
    var delta = ( hEnd - hStart ) / steps;
    for( var i = 0; i < steps; ++i ) {
      colors.push( c32( [ "hsl(",hue,",100%,50%)" ].join( "" ) ) );
      hue += delta;
    }
    return colors;
  }

  const _RGBA = function() {
    const _marked = function( color ) {
      return "0px solid rgba(255, 255, 255, 0)" === color;
    }
    canvas.addClassName( "gradient" );
    var start = canvas.getComputedStyle( "border-left" );
    var end = canvas.getComputedStyle( "border-right" );
    canvas.removeClassName( "gradient" );
    if( _marked( start ) || _marked( end ) ){
      return undefined;
    }
    start = getRGBA( start );
    end = getRGBA( end );
    const opacityStep = ( end[ 3 ] * 100 - start[ 3 ] * 100 ) / steps;
    const colors = [];
    var alpha = 0;
    var opacity = start[ 3 ] * 100;

    for( var i = 0; i < steps; ++i ) {
      alpha += 1.0 / steps;
      opacity += opacityStep;

      colors.push( c32(
        Math.round( end[0] * alpha + (1 - alpha) * start[0] ),
        Math.round( end[1] * alpha + (1 - alpha) * start[1] ),
        Math.round( end[2] * alpha + (1 - alpha) * start[2] ),
        opacity / 100
      ) );
    }
    return colors;
  }

  availabilityColors =
    availabilityColors ||
    _RGBA() ||
    _HSL( 0, 120 );

  if( !torrent.pieceCount || globals.percentDone == torrent.percentDone ) {
    return canvas;
  }

  canvas.style.imageRendering = cell.getWidth() < globals.pieceCount ? "optimizequality" : "optimizespeed";
  const ctx = canvas.getContext( "2d" );
  const image = ctx.createImageData( globals.pieceCount, 1 );
  const ra = new Uint32Array( image.data.buffer );
  var bitIndex;
  for( var i = 0, len = globals.pieceCount; i < len; ++i ) {
    const a = availability[ i ];
    ra[ i ] = -1 === a ? 0 : availabilityColors[ a.limit( 0, steps - 1 ) ];
  }
  try {
    ctx.putImageData( image, 0, 0 );
  }
  catch( e ) {
    console.warn( formatException( e ) );
    globals.maxPieceCount = torrent.pieceCount - 1;
  }

  return canvas;
}

function formatException( e ) {
  return e.name + " " + "0x" + e.result.toString( 16 ) + " " + e.message + "\n(" + e.stack.split( "\n" )[ 0 ] + ") ";
}

function renderPieces( pieces, cell ) {
  const torrent = globals.currentTorrent;
  if( torrent.pieceCount > globals.maxPieceCount ) {
    return;
  }

  const canvas = cell.down( "canvas.pieces" ) || createCanvas( "pieces" );
  globals.piecesColor = globals.piecesColor || c32( canvas.getComputedStyle( "color" ) );

  if( !torrent.pieceCount || globals.percentDone === torrent.percentDone ) {
    return canvas;
  }

  canvas.style.imageRendering = cell.getWidth() < globals.pieceCount ? "optimizequality" : "optimizespeed";
  const ctx = canvas.getContext( "2d" );
  const image = ctx.createImageData( globals.pieceCount, 1 );
  const ra = new Uint32Array( image.data.buffer );
  const p = window.atob( pieces );
  var bitIndex;
  for( var i = 0, len = globals.pieceCount; i < len; ++i ) {
    bitIndex = i % 8;
    if( 0 === bitIndex ) {
      b = p.charCodeAt( i / 8 );
    }
    bitIndex = 128 >> bitIndex;
    ra[ i ] = globals.piecesColor & 0x00ffffff | ( ( b & bitIndex ) > 0 ? 0xff : 0x00 ) << 24;
  }
  try {
    ctx.putImageData( image, 0, 0 );
  }
  catch( e ) {
    console.warn( formatException( e ) );
    globals.maxPieceCount = torrent.pieceCount - 1;
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

function renderLabels( labels ) {
  return rS( "labels", labels.map( function( label ) {
    return rS( { class: "label " + label.toCSS(), title: label }, label );
  } ) );
}

function renderName( name, torrent, ignore, cell ) {
  const s = ( torrent.isMagnet() ? "<i class=\"fa fa-magnet fa-rotate-90\"></i>" + " [" + torrent.hashString + "] " : "" ) + name;
  if( cell && torrent.labels && torrent.labels.length ) {
    cell.update( renderLabels( torrent.labels ) );
    cell.insert( s );
    return undefined;
  }
  return s;
}

function renderPercentage( percentage, decimals ) {
  decimals = Object.isNumber( decimals ) ? decimals : 2;
  return ( percentage * 100.0 ).toFixed( decimals ) + "%";
}

function renderRateUpload( rateUpload, torrent, ignore, cell ) {
  if( cell && Object.isNumber( torrent.uploadedEver ) ) {
    cell.title = renderSize( torrent.uploadedEver );
  }
  return isNaN( rateUpload ) ? "" : renderSpeed( rateUpload );
}

function renderSize( size, decimals, threshold ) {
  threshold = threshold || 1024;
  for( var u = 0; u < 9 && size >= threshold; ++u ) {
    size = size / 1024;
  }
  return ( 0 < size ? size.toFixed( Object.isNumber( decimals ) ? decimals : 2 ) : 0 ) + " " + UNITS[ u ];
}

function renderSizeCell( size, torrent, ignore, cell ) {
  if( size > 1024 && cell ) {
    cell.title = size + " B";
  }
  return renderSize( size );
}

function renderSpeed( size ) {
  return renderSize( size, 0 ) + "/s";
}

function renderStatus( status ) {
  return undefined !== status && globals.torrentStatus[ status ].label;
}

function renderFilter( label ) {
  const f = rD( { "class": "filter"} ).hide();
  f.insert( rL( null, label + ":" ) );
  f.insert( rS( { "class" : "filterInput" } ) );
  return f;
}

function renderStatusFilter() {
  const f = renderFilter( "Status" );
  f.down( "span.filterInput" ).insert(
    renderSelect( {
      select: { id: "statusSelect", value: globals.currentStatus },
      options: Object.keys( globals.torrentStatus ).map( function( k ) {
        return { value: k, text: globals.torrentStatus[ k ].label };
      } )
    } ).observe( "change", function() {
      torrentColumns.status.filter.value = +this.value;
      globals.torrentStatusChanged = true;
      globals.currentStatus = this.value;
      filterTorrents();
      $( "torrentBody" ).select( "tr" ).filter( Element.visible ).invoke( "toggleClassName", "active", false );
      globals.currentIndex = -1;
      globals.updateFields = globals.torrentStatus[ globals.currentStatus ].fields;
      if( globals.torrentStatus[ globals.currentStatus ].onChange ) {
        globals.torrentStatus[ globals.currentStatus ].onChange();
      }
      else {
        globals.shift.torrentUpdater.default();
      }
      sortTorrents( undefined, true );
      renderTorrents();
    } )
  );
  return f;
}

function normalizePercentage( value ) {
  return isNaN( value = parseFloat( value ) ) || value > 100.00 ? 100.00 : value < 0.00 ? 0.00 : value;
}

function normalizeInteger( value ) {
  return isNaN( value = parseInt( value ) ) || value < 0 ? 0 : value;
}

function renderPercentDoneFilter() {
  const filter = torrentColumns.percentDone.filter;
  const select = renderSelect( { select: { value: filter.comparatorLabel }, options: defaultOptions } );
  const input = rI( renderPercentage( filter.value ), { "class": "styled number" } );

  const _handler = function() {
    filter.comparator = comparators[ select.value ];
    filter.value = normalizePercentage( input.value ) / 100.00;
    input.value = renderPercentage( filter.value );
    filterTorrents();
  }

  select.observe( "change", _handler );
  input.observe( "change", _handler );
  input.observe( "blur", _handler );

  const f = renderFilter( "Done" );
  f.down( "span.filterInput" ).insert( select ).insert( input );
  return f;
}

function renderSizeFilter() {
  const filter = torrentColumns.sizeWhenDone.filter;
  const select = renderSelect( { select: { value: filter.comparatorLabel }, options: defaultOptions } );
  const input = rI( filter.value, { "class": "styled number" } );

  const _handler = function() {
    filter.comparator = comparators[ select.value ];
    filter.value = normalizeInteger( input.value );
    input.value = filter.value;
    filterTorrents();
  }

  select.observe( "change", _handler );
  input.observe( "change", _handler );
  input.observe( "blur", _handler );

  const f = renderFilter( "Size" );
  f.down( "span.filterInput" ).insert( select ).insert( input );
  return f;
}

function renderNameFilter() {
  const filter = torrentColumns.name.filter;
  const input = rI( filter.value );
  const regExpLed = rLed().makeToggle();

  const _handler = function() {
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
  }

  input.observe( "change", _handler );
  input.observe( "blur", _handler );
  regExpLed.observe( "click", _handler );

  const f = renderFilter( "Name" );
  f.down( "span.filterInput" ).insert( input ).insert( regExpLed ).insert( "RegExp" );
  return f;
}

function renderLabelFilter() {
  const filter = torrentColumns.labels.filter;
  const input = rI( filter.value );
  const inputExclude = rLed().makeToggle();

  const _handler = function() {
    filter.value = input.value;
    filter.exclude = inputExclude.value;
    filterTorrents();
  }

  input.observe( "change", _handler );
  input.observe( "blur", _handler );
  inputExclude.observe( "click", _handler );

  const f = renderFilter( "Label" );
  f.down( "span.filterInput" ).insert( input ).insert( inputExclude ).insert( "Exclude" );
  return f;
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
  const requestBase = Object.isString( method ) ? newRequest( method, args, onSuccess, properties ) :  method;
  requestBase.parameters = requestBase.parameters ? requestBase.parameters : Object.toJSON( requestBase.parametersObject );

  const request = Object.extend( {
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
    onComplete: function() {
      showDone();
    }
  }, requestBase );

  return globals.lastRequest = request.frequency > 0 ?
    new Ajax.PeriodicalUpdater( "items", request.url, request ) :
    new Ajax.Request( request.url, request );
}

function addTorrent( data, handler, target, paused, notify ) {
  var reader;

  const _upload = function() {
    data = reader ? reader.result : data;
    const search = "base64,"
    const index = data.indexOf( search );
    data = -1 === index ? data : data.substring( index + search.length );

    const args = {
      "download-dir": target || globals.shift.session && globals.shift.session[ "download-dir" ] || undefined,
      "metainfo": data
    }
    if( undefined !== paused ) {
      args[ "paused" ] = paused;
    }
    if( data.includes( ":" ) ) {
      delete args[ "metainfo" ];
      args[ "filename" ] = decodeURIComponent( data ).replace( new RegExp( "&amp;", "g" ), "&" );
    }
    const req = doRequest( "torrent-add", args, function( response ) {
      if( success( response ) ) {
        const args = getArguments( response );
        args.torrents = [ args[ "torrent-added" ] || args[ "torrent-duplicate" ] ];
        filterTorrents( updateTorrents( response, true ) );
        sortTorrents();
        renderTorrents();
      }
      handler && handler( response );
    } );
    notify && notify( req );
  }

  switch( data.constructor ) {
  case Blob:
  case File:
    reader = Events.observe( new FileReader(), "load", _upload );
    reader.readAsDataURL( data );
    break;
  case ArrayBuffer:
    data = window.btoa( arrayBufferToString( data ) );
  case String:
    _upload();
  default:
  }
}

function fetchTorrents( fields, ids, handler ) {
  if( ids && ids.length > globals.torrents.length / 2 ) {
    ids = undefined;
  }
  const args = { fields: fields, ids: ids };
  if( globals.table && ( undefined === ids || 1 < ids.length ) ) {
    args.format = "table";
  }
  doRequest( "torrent-get", args, handler || updateTorrents );
}

const fetchDownloadDirs = fetchTorrents.curry( [ "id", "downloadDir" ] );

const fixTorrents = doRequest.curry( "torrent-set" );

const renderers = {
  "downloadSpeed": renderSpeed,
  "uploadSpeed": renderSpeed,
  "downloadedBytes": renderSize,
  "uploadedBytes": renderSize,
  "download-dir-free-space": renderSize
}

const updaters = {
  "port-is-open": function( e, value ) {
    e.writeAttribute( "title", value ? "Open" : "Closed" ).value = value;
  }
}

function updateFields( object ) {
  for( var k in object ) {
    if( k in object ) {
      const o = object[ k ];
      const e = $( k );

      if( updaters[ k ] ) {
        return updaters[ k ]( e, o );
      }

      if( Object.isString( o ) || Object.isNumber( o ) || Object.isBoolean( o ) ) {
        const renderer = renderers[ k ];

        if( e ) {
          updateElement( e, renderer ? renderer( o ) : o );
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
  if( globals.currentStatus > 0 ) {
    return;
  }

  ids = ids || globals.torrents.filter( function( torrent ) {
    return 0 === torrent.status && 0 !== torrent.error;
  } ).pluck( "id" );

  if( isEmpty( ids ) ) {
    return;
  }

  fetchTorrents( [ "id", "error", "errorString" ], ids, function( response ) {
    filterTorrents( updateTorrents( response ).each( function( torrent ) {
      sendNotification( 2, "Torrent error.", { body: "\"" + torrent.name + "\":\n" + torrent.errorString } );
    } ) )
    sortTorrents();
    renderTorrents();
  } );
}

function getFieldData( ids ) {
  if( isEmpty( ids ) ) {
    return;
  }
  fetchTorrents( globals.staticFields.concat( globals.updateFields ), ids, function( response ) {
    filterTorrents( updateTorrents( response ) );
    sortTorrents();
    renderTorrents();
  } );
}

function getMagnetData( ids ) {
  if( isEmpty( ids ) ) {
    return;
  }
  fetchTorrents( [ "id", "hashString", "metadataPercentComplete" ], ids );
}

function updateTorrents( response, refresh, pre ) {
  const torrents = [];
  const ids = [];  // Ids of torrents to be updated
  const eids = []; // Ids of torrents with errors
  const mids = []; // Ids of magnets for special handling

  const args = getArguments( response );
  if( !args || isEmpty( args.torrents ) ) {
    return [];
  }

  const ts = args.torrents;
  const table = Object.isArray( ts[ 0 ] );
  const keys = table ? ts.shift() : Object.keys( ts[ 0 ] );
  ts.each( function( torrent, index ) {
    const id = torrent[ table ? keys.indexOf( "id" ) : "id" ];
    if( undefined === id ) {
      console.error( "Torrent.id should never be undefined!" );
    }

    if( globals.removed.includes( id ) ) {
      return;
    }

    var t = getTorrent( id );
    if( t ) {
      pre && pre( t );
      t.update( torrent, keys );
      if( 0 === t.status && 0 !== t.error && isEmpty( t.errorString ) ) {
        eids.push( t.id )
      }
    }
    else {
      t = new Torrent( torrent, keys );
      globals.torrents.push( t );
      globals.torrentHash[ t.id ] = t;
    }
    torrents.push( t );

    if( globals.magnets.includes( t.id ) ) {
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
    if( refresh ) {
      t._dirty.concatUnique( keys );
    }
  } );

  globals.magnets.concatUnique( mids );

  getFieldData( ids );
  getMagnetData( mids );
  getErrorData( eids );

  return torrents;
}

function updateOrder( columns, property ) {
  const noReverse = undefined === property;
  var c;

  if( !property ) {
    for( var k in columns ) {
      if( columns[ k ].order != null ) {
        property = k;
        break;
      }
    }
  }

  if( !property ) {
    for( var k in columns ) {
      c = columns[ k ];
      if( c.defaultOrder != null ) {
        c.order = c.defaultOrder;
        return k;
      }
    }
    return null;
  }

  for( var k in columns ) {
    c = columns[ k ];
    if( k == property ) {
      c.order = undefined === c.order ? false : noReverse === c.order;
    }
    else {
      delete c.order;
    }
  }
  return property;
}

function sortTorrents( property, orderChanged ) {
  const torrents = globals.torrents;
  if( isEmpty( torrents ) ) {
    return;
  }

  const columns = globals.torrentStatus[ globals.currentStatus ].columns;
  property = updateOrder( columns, property ) || updateOrder( columns, "percentDone" );

  for( var i = 0, len = torrents.length; i < len; ++i ) {
    torrents[ i ]._i = i;
  }

  const column = torrentColumns[ property ];

  torrents.sortByProperty( property, column.order, column.isString );

  const _set = function( e ) {
    e.removeClassName( "asc" ).removeClassName( "desc" );
    if( e.className.includes( property ) ) {
        e.addClassName( column.order ? "asc" : "desc" );
    }
  }
  $$( "#torrentTable col" ).each( _set );
  $$( "#torrentTable th" ).each( _set );

  globals.shift.newOrderIds = globals.torrents.pluck( "id" ).join( "" );
  orderChanged = orderChanged || globals.shift.orderIds != globals.shift.newOrderIds;
  globals.shift.orderIds = globals.shift.newOrderIds;

  if( !orderChanged ) {
    return;
  }

  const body = $( "torrentBody" );
  if( null === body ) {
    return;
  }

  filterStatus().each( function( torrent ) {
    torrent._node && body.appendChild( torrent._node );
  } );
}

function renderTorrentRow( torrent ) {
  torrent._node = renderRow( torrent, torrentColumns, torrent.id ).hide();
  torrent._node.zzz = true;
  return torrent._node;
}

function renderTorrents() {
  const body = $( "torrentBody" );

  if( null === body ) {
    return;
  }

  const ids = [];  // Ids of torrents to be updated
  globals.torrents.each( function( torrent ) {
    var row = torrent._node;

    if( !torrent.displayed || globals.removed.includes( torrent.id ) ) {
      if( row ) {
        row.hide();
      }
      return;
    }

    if( row ) {
      if( row.zzz ) {
        delete row.zzz;
        ids.push( torrent.id );
      }
      for( var i = 0, len = torrent._dirty.length; i < len; ++i ) {
        const k = torrent._dirty[ i ];
        const c = torrentColumns[ k ];
        if( !c || c._column === false ) {
          continue;
        }
        renderCell( torrent, c, k, row.down( "." + k ), function() { return k.capitalize() + " " + torrent.id } );
      }
      torrent._dirty = [];
      row.style.display = "";
      row.show();
    }
    else {
      row = renderTorrentRow( torrent );
      body.insert( row );
      delete row.zzz;
      ids.push( torrent.id );
    }
  } );
  getFieldData( ids );
}

function getTable( id, target, columnDefinitions, keys, renderer, click ) {
  const table = $( id );
  if( table ) {
    return table;
  }
  const t = getTableElements();

  const _head = function( c, k ) {
    return rS( { id: "l_" + k, "class": k } ).insert( undefined === c.label ? k.capitalize() : c.label );
  }

  t.table = rTable( id, t );
  if( columnDefinitions ) {
    const header = rR();
    t.header.insert( header );
    keys = keys || Object.keys( columnDefinitions );
    for( var i = 0, len = keys.length; i < len; ++i ) {
      const k = keys[ i ];
      const c = columnDefinitions[ k ];
      if( c._column !== false ) {
        t.columns.insert( rE( "col", { "class": k } ) );
        const cell = rE( "th", { id: "h_" + k, "class": k } ).insert( _head( c, k ) );
        click = c.click || click;
        click && cell.observe( "click", click );
        header.insert( cell );
      }
    }

    for( var k in columnDefinitions ) {
      var c = columnDefinitions[ k ];
      if( c.actualColumn ) {
        const cell = t.header.down( "th#h_" + c.actualColumn );
        if( cell ) {
          cell.insert( _head( c, k ) );
        }
      }
    }

    updateOrder( columnDefinitions );
  }
  target && target.insert( t.table );
  renderer && renderer( t );
  return t.table;
}

function updateElement( e, content ) {
  if( undefined === content ) {
    return;
  }
  if( content != e.innerHTML || 0 === content ) {
    e.update( content );
  }
}

function renderCell( o, d, k, cell, ssspecial ) {
  const render = d.render;
  if( false === render ) {
    return undefined;
  }

  const content = globals.shift.settings.screenshotMode && d.sss ? true === d.sss ? ssspecial
    ? ssspecial( o, k ) : k.capitalize() : d.sss( o, k ) : o[ k ];

  const newCell = cell === undefined;
  cell = cell || rC( Object.extend( { "class": k }, d.attributes ), "" );
  updateElement( cell, Object.isFunction( render ) ? render( content, o, k, cell ) : content );
  return newCell ? cell : undefined;
}

function renderRow( object, columnDefinitions, row ) {
  row = undefined === row ? rR() : Object.isElement( row ) ? row : rR( { id: row } );

  for( var k in columnDefinitions ) {
    row.insert( renderCell( object, columnDefinitions[ k ], k, row.down( "." + k ) ) );
  }
  return row;
}

function showTorrentTable() {
  const torrent = globals.currentTorrent;
  if( showContent( "torrentTable" ) ) {
    torrent && centerVertically( torrent._node );
    return;
  }

  const torrentTable = getTable( "torrentTable", globals.content, torrentColumns, columnKeys, function( t ) {
    t.body.replace( t.body = rE( "tbody", { id: "torrentBody" } ).insert( globals.torrents.map( renderTorrentRow ) ) );

    Object.keys( torrentColumns ).each( function( k ) {
      var style = $S( "." + k );
      if( !style ) {
        const sheet = document.styleSheets[ 0 ];
        sheet.insertRule( "." + k + " {}", 0 );
        const rules = sheet.rules || sheet.cssRules;
        style = rules[ 0 ].style;
      }
      torrentColumns[ k ].style = style;
    } );

    t.body.observe( "click", function( e ) {
      const cell = e.findElement( "td" );
      if( !cell ) {
        return;
      }
      const row = cell.up( "tr" );
      const column = globals.torrentColumnHash[ row.childElements().indexOf( cell ) ];

      const rows = $( "torrentBody" ).select( "tr" ).filter( Element.visible );
      rows.invoke( "toggleClassName", "active", false );
      row.toggleClassName( "active", true );
      globals.currentIndex = rows.indexOf( row );

      const torrent = getTorrent( row.id, true );
      if( column && column.listHandler ) {
        column.listHandler( e, torrent );
      }
      else {
        torrent.toggleSelect();
      }
    } ).observe( "dblclick", function( e ) {
      const row = e.findElement( "tr" );
      if( row ) {
        $( getTorrent( row.id, true ).isMagnet() ? "menu_trackers" : "menu_files" ).click();
      }
    } ).observe( "mousedown", function() {
      t.mousedown = 1;
    } ).observe( "mousemove", function( e ) {
      if( t.mousedown ) {
        if( t.mousedown > 3 ) {
          const cell = e.findElement( "td" );
          if( cell ) {
            getTorrent( cell.up( "tr" ).id ).select();
          }
        }
        t.mousedown++;
      }
    } ).observe( "mouseup", function() {
      t.mousedown = 0;
    } );

    const c = rD( { id: "filterContainer" } ).hide();
    const h = rE( "th", { id: "filterContainerCell" } ).insert( c );
    t.header.insert( rR().insert( h ) );

    const _show = function() {
      [ c, h ].invoke( $A( c.children ).filter( Element.visible ).length ? "show" : "hide" );
    }

    for( var k in torrentColumns ) {
      const column = torrentColumns[ k ];
      const f = column.filter;
      if( f ) {
        if( f._node ) {
          c.insert( f._node );
        }
        else if( f.renderNode ) {
          c.insert( f._node = f.renderNode() );
        }
        else {
          continue;
        }

        const l = rLed( f.visible ).observe( "click", function( e ) {
          const f = torrentColumns[ this.up().id.substring( 2 ) ].filter;
          this.value = f.visible = !f.visible;
          f.visible ? f._node.show() : f._node.hide();
          _show()
          e.stop();
        } );
        f.visible && f._node.show();
        $( "l_" + k ).insert( { bottom: l } );
      }
    }
    h.writeAttribute( "colSpan", globals.torrentColumnHash.length );
    _show()
  },
  function() {
    sortTorrents( this.id.substring( 2 ) );
  } );
  torrent && centerVertically( torrent._node );
}

function setTorrentsColumnsVisible( columns ) {
  var columnCount = 0;
  for( var c in torrentColumns ) {
    const style = torrentColumns[ c ].style;
    if( c in columns ) {
      if( false !== torrentColumns[ c ]._column ) {
        style.display = "";
        columnCount++;
      }
    }
    else {
      style.display = "none"
    }
  }
  $( "filterContainerCell" ).colSpan = columnCount;
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
  const path = getPathPart( files.find( function( file ) {
    return file.index == id;
  } ), depth );

  return files.filter( function( file ) {
    return path == getPathPart( file, depth );
  } ).pluck( "index" );
}

function setFilesPriority( id, files, priority ) {
  const request = newRequest( "torrent-set", { ids: [ id ] }, function( response ) {
    if( success( response ) ) {
      files.each( function( fileIndex ) {
        $( "f_" + fileIndex ).down( "led" ).value = priority;
      } );
    }
  } );

  ( "none" == priority ? [ "files-unwanted" ] : [ "files-wanted", "priority-" + priority ] ).each( function( selector ) {
    request.parametersObject.arguments[ selector ] = files;
  } );

  doRequest( request );
}

function playDoneSound() {
  if( globals.shift.settings.soundEnabled ) {
    const s = globals.shift.doneSound;
    s.volume = globals.shift.settings.soundVolume;
    s.play();
  }
}

function prettify( o ) {
  return $H( o ).toArray().map( function( a ) { return a.join( " = " ) } ).join( "\n" );
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
        const notification = new Notification( title, options );
      }
    }
  } else if( "mozNotification" in navigator ) { // Gecko < 22
    sendNotification = function( level, title, options ) {
      if( Notification.permission !== "granted" ) {
        return;
      }
      options = options || {};
      options.icon = options.icon || globals.icon;
      if( globals.shift.settings.notificationLevel >= level ) {
        const notification = navigator.mozNotification.createNotification( title, options.body, options.icon );
        notification.show();
      }
    }
  } else {
    sendNotification = function( level, title, options ) {}
  }
  sendNotification( level, title, options );
}

function isDone( file ) {
  return file.bytesCompleted === file.length;
}

function rFile( file, torrent ) {
  const s = globals.shift.settings;
  const fileName = s.screenshotMode ? "File " + file.index : file.name.split( "/" ).last();
  return ( isDone( file ) ? s.fileLinkEnabled : s.incompleteFolderLinkEnabled ) ? rFileLink( file, torrent ).update( fileName ) : fileName;
}

function rFileLink( file, torrent ) {
  const s = globals.shift.settings;
  var base = ( isDone( file ) ? s.fileLinkEnabled && s.fileLink : s.incompleteFolderLinkEnabled && s.incompleteFolderLink ) || "";
  base = base && base.replaceAll( templateRegExp, function( m ) { return replacer( m, torrent ) } );
  return isEmpty( base ) ? file.name : rA( base + file.name + ( !isDone( file ) && globals.shift.session[ "rename-partial-files" ] ? ".part" : "" ), "" );
}

function rFolder( base, fileParts, filePartIndex, index ) {
  const _f = function( i ) {
    return globals.shift.settings.screenshotMode ? "Folder " + index : fileParts[ i ];
  }
  var result = _f( filePartIndex ) + "&sol;";
  if( base ) {
    for( var i = 0; i <= filePartIndex; ++i ) {
      base += _f( i ) + "/";
    }
    result = rA( base, result );
  }
  return result;
}

var indentDeclaration;
const indentSelector = "table#fileTable td.name";
const indentStyle = "padding-left";
const indentValue = "calc(0em + 4px);"
const complete = renderPercentage( 1 );

function renderFiles( torrent ) {
  const torrentDone = 1.0 === torrent.percentDone;

  const s = globals.shift.settings;
  var folderLink = s.folderLinkEnabled ? s.folderLink : null;
  if( !torrentDone && globals.shift.session[ "incomplete-dir-enabled" ] ) {
    folderLink = s.incompleteFolderLinkEnabled ? s.incompleteFolderLink : null;
  }

  const _id = function( row ) {
    const id = row.id.split( "_" );
    id[ 1 ] = +id[ 1 ];
    return id;
  }

  const fbody = $( "fileBody" ).observe( "click", function( e ) {
    const target = e.findElement( "led" );
    if( !target ) {
      return;
    }
    const row = target.up( "tr" );
    const id = _id( row )
    showPopup( "popupFile", function( e ) {
      const torrent = globals.currentTorrent;
      globals.action = e.findElement( "li" ).id;
      const isFile = "f" == id[ 0 ] ;

      const d = globals.dialogs[ globals.action ];
      switch( globals.action ) {
        case "rename":
          e.currentTarget.stopObserving( "click" ).hide();
          globals.currentFile = torrent.files.find( function( file ) {
            return file.index == id[ 1 ];
          } );
          globals.pathDepth = isFile ? -1 : +id[ 2 ];
          d.fileName.value = getFilePart( getTargetPath() );
          showPopup( "popupRename" );
          d.fileName.focus();
          break;
        default:
          const selected = isFile ? [ id[ 1 ] ] : getSelectedFiles( torrent.files, id[ 1 ], +id[ 2 ] );
          setFilesPriority( torrent.id, selected, globals.action );
      }
    }, e )
  } ).observe( "dblclick", function( e ) {
    const row = e.findElement( "tr" );
    if( !row ) {
      return;
    }
    const id = _id( row )
    const selected = "f" == id[ 0 ] ? [ id[ 1 ] ] : null;
    if( selected ) {
      setFilesPriority( globals.currentTorrent.id, selected, row.down( "led" ).value ? "none" : "normal" );
    }
  } );
  var currentNode = fbody.down();
  const dummyNode = null == currentNode ? rR() : null;

  if( dummyNode ) {
    $( "fileBody" ).insert( dummyNode );
    currentNode = dummyNode;
  }

  var lastFileParts = [];
  var row;

  function _style() {
    const styles = $S( indentSelector );
    return indentStyle + ":" + ( styles ? styles[ indentStyle ] : indentValue );
  }

  function _indent( i ) {
    indentDeclaration = indentDeclaration || _style();
    return indentDeclaration.replace( "0", i );
  }

  torrent.files.each( function( file, index ) {
    file.index = undefined === file.index ? index : file.index;
    const fileParts = file.name.split( "/" );

    const fileStyle = fileParts.length > 1 ? _indent( fileParts.length - 1 ) : "";

    const folderNodes = [];
    for( var i = 0, len = fileParts.length - 1; i < len; ++i ) {
      if( fileParts[ i ] == lastFileParts[ i ] ) {
        continue;
      }
      const rowId = "d_" + file.index + "_" + i;
      row = $( rowId );
      if( row && file.folderNodes ) {
        file.folderNodes.remove( row );
      }
      else {
        row = rR( { id: rowId } )
        .insert( rC( {}, rLed() ) )
        .insert( rC( { colspan: 2 } ) )
        .insert( rC( { "class": "name", style: _indent( i ) } ).insert( rFolder( folderLink, fileParts, i, index ) ) );
      }
      folderNodes.push( row );
      currentNode.insert( { after: row } );
      currentNode = row;
    }
    file.folderNodes && file.folderNodes.invoke( "remove" );
    file.folderNodes = folderNodes;
    lastFileParts = fileParts;

    Object.extend( file, torrent.fileStats[ file.index ] );
    if( file.node ) {
      if( globals.shift.settingsChanged || file.bytesCompleted === file.length ) {
        file.node.down( "td.name" ).update( rFile( file ) );
      }
    }
    else {
      file.filePercentDone = file.length == 0 ? 1 : file.bytesCompleted / file.length;
      file.node = rR( { id: "f_" + file.index } )
        .insert( rC( {}, rLed( getPriority( file ) ) ) )
        .insert( setPercentageClass( rC( "filePercentDone", renderPercentage( file.filePercentDone ) ), file.filePercentDone ) )
        .insert( rC( { "class": "length", title: file.length + " B" }, renderSize( file.length ) ) )
        .insert( rC( { "class": "name", style: fileStyle }, rFile( file ) ) );
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
  const fileTable = getTable( "fileTable", globals.content, fileColumns, undefined, function( t ) {
    globals.pieceCount = torrent.pieceCount;
    t.table.addClassName( "torrent" );
    t.body.id = "fileBody";
    if( torrent.pieces ) {
      const cell = rE( "th", { id: "filePieces", colspan: "4" } );
      t.header.insert( { top: rR().insert( cell ) } );
      cell.insert( renderPieces( torrent.pieces, cell ) );
    }
    for( var i = 0, len = torrent.files.length; i < len; ++i ) {
      torrent.files[ i ].folderNodes = [];
    }
    renderFiles( torrent );
  },
  function() {
    for( var i = 0, len = torrent.files.length; i < len; ++i ) {
      torrent.files[ i ]._i = i;
    }
    const property = updateOrder( fileColumns, this.id.substring( 2 ) );
    const column = fileColumns[ property ];
    const o = column.order;

    if( "name" === property ) {
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
    const row = $( "f_" + file.index );
    const fileStat = torrent.fileStats[ file.index ];
    const updateBytes = fileStat.bytesCompleted != file.bytesCompleted;
    const updatePriority = fileStat.priority != file.priority;
    const updateWanted = fileStat.wanted != file.wanted;

    Object.extend( file, fileStat );
    if( updateBytes ) {
      if( globals.shift.settingsChanged || fileStat.bytesCompleted === file.length ) {
        file.node.down( "td.name" ).update( rFile( file ) );
      }
      file.filePercentDone = file.length == 0 ? 1 : fileStat.bytesCompleted / file.length;
      updateElement( setPercentageClass( row.down( "td.filePercentDone" ), file.filePercentDone ), renderPercentage( file.filePercentDone ) );
    }
    if( updatePriority || updateWanted ) {
      row.down( "led" ).value = getPriority( fileStat );
    }
  } );
}

function showPeers( torrent ) {
  var peersDiv = $( "peersDiv" );
  if( !peersDiv ) {
    peersDiv = rD( { id: "peersDiv" } );
    peersDiv.addClassName( "torrent" );
    globals.content.insert( peersDiv );
  }

  const peersFromTable = getTable( "peersFromTable", peersDiv, peersFromColumns, undefined, function( t ) {
    renderKeyValuePairs( t.body, torrent.peersFrom, null, false );
    t.table.addClassName( "peersFrom keyvalue" );
  } );
  updateKeyValuePairs( peersFromTable.down( "tbody" ), torrent.peersFrom );

  const peerTable = getTable( "peerTable", peersDiv, peerColumns, undefined, function( t ) {
    renderKeyValuePairs( t.body, torrent.peersFrom );
  },
  function( e ) {
    torrent.peers.sortByProperty( e.target.id.substring(2) );
  } );

  const peerBody = peerTable.down( "tbody" );
  const currentPeers = torrent.peers.pluck( "address" );
  peerBody.childElements().each( function( row ) {
    if( !currentPeers.includes( row.id.substring( 2 ) ) ) {
      row.remove();
    }
  } );

  torrent.peers.sortByProperty().each( function( peer ) {
    const id = "p_" + peer.address;
    const row = $( id );
    if( row ) {
      updateRow( peer, peerColumns, row );
    }
    else {
      peerBody.insert( renderRow( peer, peerColumns, id ) );
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

  const trackerTable = getTable( "trackerTable", trackerDiv, trackerColumns, undefined, function( t ) {
    t.body.observe( "click", function( e ) {
      const cell = e.findElement( "td" );
      if( cell ) {
        const row = cell.up( "tr" );
        const id = +row.id.split( "_" )[ 1 ];
        const column = globals.trackerColumnHash[ row.childElements().indexOf( cell ) ];
        if( column && column.listHandler ) {
          column.listHandler( e, id );
        }
      }
    } );

    const tl = undefined !== torrent.trackerList;
    const trackerArea = rT( "styled " + ( tl ? "list" : "add" ) );
    tl && trackerArea.update( torrent.trackerList );

    const trackerLed = rLed().observe( "click", function( e ) {
      tl ?
      showPopup( "popupTrackerUpdate", function( e ) {
        globals.action = e.target.id;
        switch( globals.action ) {
          case "update":
            fixTorrents( { ids: [ torrent.id ], trackerList: trackerArea.value } );
        }
      }, e ) :
      showPopup( "popupTrackerAdd", function( e ) {
        globals.action = e.target.id;
        switch( globals.action ) {
          case "add":
            const trackers = trackerArea.value.match( trackerRegExp );
            addTrackers( [ torrent.id ], trackers, nop );
        }
      }, e );
    } );
    t.footer.insert( rR().insert( rC().insert( trackerLed ) ).insert( rC( { "colspan": 8 } ).insert( trackerArea ) ) );
  } );

  const webseedTable = getTable( "webseedTable", trackerDiv, webseedColumns, undefined, function( t ) {
    torrent.webseeds.each( function( webseed ) {
      t.body.insert( rR().insert( rC().insert( rD().insert( webseed ) ) ) );
    } )
  } );

  trackerBody = trackerTable.down( "tbody" );
  const currentTrackers = torrent.trackerStats.pluck( "id" );
  trackerBody.childElements().each( function( row ) {
    if( !currentTrackers.includes( row.id.substring( 2 ) ) ) {
      row.remove();
    }
  } );

  var tier = 0;
  const _tier = function() {
    trackerBody.insert( rR( "tier" ).insert( rC( { colspan: Object.keys( trackerColumns ).length } ) ) );
  }
  torrent.trackerStats.each( function( tracker ) {
    if( !$( "t_" + tracker.id ) ) {
      if( tier !== tracker.tier ) {
        _tier();
        tier = tracker.tier;
      }
      trackerBody.insert( renderRow( tracker, trackerColumns, "t_" + tracker.id ) );
    }
  } );
  _tier();
  globals.oldTrackerStats = torrent.trackerStats;
}

function renderFooter( click, noScreenshotModeCheck ) {
  const clipboardLed = rLed().makeToggle().addClassName( "clipboard" );
  clipboardLed.copy = function( data ) {
    if( this.value ) {
      copyObjectToClipboard( data );
    }
  };
  return rR().insert( rC() ).insert( rC().insert( rB().observe( "click", function() {
    if( true !== noScreenshotModeCheck ) {
      if( globals.shift.settings.screenshotMode ) {
        return;
      }
    }
    click && click( clipboardLed );
  } ) ).insert( clipboardLed ).insert( "Copy to clipboard" ) );
}

function showDetails( torrent ) {
  const detailsTable = getTable( "detailsTable", globals.content, detailsColumns, undefined, function( t ) {
    globals.percentDone = null;
    globals.pieceCount = torrent.pieceCount;
    t.table.addClassName( "torrent keyvalue" );
    renderKeyValuePairs( t.body, torrent, "d_", torrentFields );
    const downloadDir = t.table.down( "#d_downloadDir" );
    const moveLed = rLed( true );
    if( downloadDir ) {
       moveLed.setAttribute( "id", "d_move" );
       moveLed.setAttribute( "title", "Move" );
       moveLed.makeToggle();
       downloadDir.insert( { top: moveLed } );
    }

    t.footer.insert( renderFooter( function( clipboard ) {
      showWait();
      const data = getKeyValuePairs( torrent, "d_", torrentFields );
      if( clipboard.value ) {
        const t = Object.extend( Object.clone( torrent ), data );
        Object.without( t, [ "_dirty", "_displayed", "_index", "_node", "_selected", "id" ] );
        clipboard.copy( t );
      }
      if( !isEmpty( data ) ) {
        const f = "downloadDir";
        const l = "location";
        const locationChanged = f in data;
        if( locationChanged ) {
          data[ l ] = data[ f ];
          delete data[ f ];
        }

        const _update = function() {
          fetchDownloadDirs( [ torrent.id ], function( response ) {
            if( success( response ) ) {
              torrent.update( data );
              torrent = updateTorrents( response, true )[ 0 ];
              updateKeyValuePairs( Object.copyNestedProperties( torrent, {}, torrent._dirty ), "d_", torrentFields );
            }
          } );
        }

        fixTorrents( Object.extend( { ids: [ torrent.id ] }, data ), function( response ) {
          if( locationChanged ) {
            data[ f ] = data[ l ];
            delete data[ l ];
          }
          const m = { body: prettify( data ) };
          if( success( response ) ) {
            sendNotification( 3, "Torrent settings changed.", m );
            if( locationChanged ) {
              doRequest( "torrent-set-location", { ids: [ torrent.id ], location: data[ f ], move: moveLed.value }, _update );
              return;
            }
            _update();
          }
          else {
            sendNotification( 1, "Failed changing torrent settings.", m );
          }
        } );
      }
    } ) );
  } );
  updateKeyValuePairs( Object.copyNestedProperties( torrent, {}, torrent._dirty ), "d_", torrentFields );
  globals.percentDone = torrent.percentDone;
  torrent._dirty = [];
}

function getKeyValuePairs( object, idPrefix, fields ) {
  const data = {};
  for( var k in object ) {
    if( k[ 0 ] === '_' ) {
      continue;
    }
    const f = fields[ k ];
    if( f && f._ro ) {
      continue;
    }

    const o = object[ k ];
    const cell = $( idPrefix + k );
    var v = null;

    if( f && f.locked ) {
      delete f.locked;
    }

    if( !cell && !( f && f.getValue ) ) {
      continue;
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
      v = cell.down( "led" ).value;
    }
    else if( Object.isNumber( o ) ) {
      v = +cell.down( "input" ).value;
    }
    else if( Object.isString( o ) ) {
      v = ( cell.down( "input" ) || cell.down( "div.pathselect" ) ).value;
    }
    else {
      continue;
    }
    if( v != null && v != object[ k ] ) {
      data[ k ] = v;
    }
  }
  return data;
}

function lock( fields, k ) {
  fields[ k ] = fields[ k ] || {};
  fields[ k ].locked = true;
}

function renderKeyValuePairs( target, object, idPrefix, fields ) {
  idPrefix = idPrefix || "";
  Object.keys( object ).sort().each( function( k ) {
    const f = fields ? fields[ k ] : false === fields ? false : null;
    if( k[ 0 ] === '_' || f && f._ignore ) {
      return;
    }

    const createInput = false !== f;
    const row = rR();
    const keyCell = rC( "key", k );
    const ro = f && f._ro;
    const valueCell = rC( { id: idPrefix + k } );

    const sss = globals.shift.settings.screenshotMode && f && f.sss;
    const o = sss ? true === sss ? k.capitalize() : sss( object[ k ] ) : object[ k ];

    const a = f && f.action;
    const cont = a && a( row, keyCell, valueCell, o );
    if( !a || cont ) {
      row.insert( keyCell ).insert( valueCell );
    }
    target.insert( row );
    if( a && !cont ) {
      return;
    }

    var content = o;
    if( f && f.render ) {
      content = f.render( content, valueCell );
    }
    else if( f && f.values ) {
      if( !ro ) {
        content = renderSelect( { options: f.values } ).observe( "focus", lock.curry( fields, k ) );
        content.value = o;
      }
    }
    else if( Object.isArray( o ) ) {
      content = renderSelect( { select: { value: o[ 0 ] }, options: normalizeOptions( o ) } );
    }
    else if( Object.isBoolean( o ) ) {
      content = rLed( o, ro ? { readonly: "readonly" } : {} );
      if( !ro ) {
        content.observe( "click", function() {
          lock( fields, k );
          content.toggle();
        } );
      }
    }
    else if( !Object.isNumber( o ) && !Object.isString( o ) ) {
      return;
    }

    if( ro ) {
      valueCell.writeAttribute( "readonly", "readonly" );
    }
    else if( f && f.renderAdvanced ) {
      content = f.renderAdvanced( o, content );
    }
    else if( createInput && !Object.isElement( content ) ) {
      content = rI( content ).observe( "focus", lock.curry( fields, k ) );
    }
    valueCell.insert( content );
  } );
}

function updateKeyValuePairs( object, idPrefix, fields ) {
  Object.keys( object ).sort().each( function( k ) {
    const f = fields ? fields[ k ] : false === fields ? false : null;
    if( k[ 0 ] === '_' || f && ( f._ignore || f.locked ) ) {
      return;
    }

    const sss = globals.shift.settings.screenshotMode && f && f.sss;
    const o = sss ? true === sss ? k.capitalize() : sss( object[ k ] ) : object[ k ];

    const ro = false === f || f && f._ro;
    const valueCell = $( idPrefix + k );

    var content = o;
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
      valueCell.down( "led" ).value = o;
      return;
    }
    else if( !Object.isNumber( o ) && !Object.isString( o ) ) {
      return;
    }

    if( ro ) {
      valueCell.update( content );
    }
    else if( !Object.isElement( content ) ) {
      valueCell.down( "input" ).value = content;
    }
  } );
}

function showSessionTable() {
  if( showContent( "sessionTable" ) ) {
    return;
  }

  doRequest( "session-get", {}, function( response ) {
    globals.shift.session = getArguments( response );
    const sessionTable = getTable( "sessionTable", globals.content, sessionColumns, undefined, function( t ) {
      t.table.addClassName( "keyvalue" );
      renderKeyValuePairs( t.body, globals.shift.session, "s_", sessionFields );
      t.footer.insert( renderFooter( function( clipboard ) {
        const data = getKeyValuePairs( globals.shift.session, "s_", sessionFields );
        clipboard.copy( globals.shift.session );
        if( !isEmpty( data ) ) {
          Object.extend( globals.shift.session, data );
          doRequest( "session-set", data,  function( response ) {
            const m = { body: prettify( data ) };
            if( success( response ) ) {
              sendNotification( 3, "Session settings changed.", m );
            }
            else {
              sendNotification( 1, "Changed session settings Failed.", m );
            }
          } );
        }
      } ) );
    } );
  } );
}

const shiftFields = {
  "dark": {
    getValue: function() {
      return $( "darkLed" ).value;
    }
  },
  "paths": {
    getValue: function( cell ) {
      return this.value;
    },
    renderAdvanced: function( paths, content ) {
      const self = this;
      paths = self.value = [].concat( paths ).pushUnique( globals.shift.session[ "download-dir" ] ).compact();
      paths = globals.shift.settings.screenshotMode ? paths.map( function( p, i ) { return "Path" + i } ) : paths;
      const _new = function( p ) { return { path: p, count: 0 } }
      paths = paths.map( _new );
      const pathHash = paths.reduce( function( h, p ){ h[ p.path ] = p; return h }, {} );
      const pathTable = getTable( "pathTable", undefined, pathColumns ).addClassName( "styled" );
      const body = $( pathTable.down( "tbody" ) ).observe( "click", function( e ) {
        e.stop();
        if( e.target.classList.contains( "led" ) ) {
          const selected = paths.filter( function( path ) {
            return path.node.down( "led" ).value;
          } ).pluck( "path" );
          globals.torrents.each( function( torrent ) {
            torrent.selected = selected.includes( torrent.downloadDir );
          } );
        }
      } );

      const _render = function() {
        paths.each( function( path ) {
          const row = path.node = renderRow( path, pathColumns, path.node );
          row.down( "led" )[ path.count ? "show" : "hide" ]();
          body.insert( row );
        } );
      };
      _render();

      return [
        pathTable,
        rB( "Edit Paths" ).observe( "click", function() {
          globals.dialogs.paths.paths.update( paths.pluck( "path" ).join( "\n" ) );
          globals.dialogs.paths.callback = function( values ) {
            for( var p, i; p = paths.shift(); ) {
              switch( i = values.indexOf( p.path ) ) {
                case -1:
                  p.node && p.node.remove() && delete p.node;
                  break;
                default:
                  values[ i ] = p;
              }
            }
            paths.concatUnique( values.map( function( p ) {
              return Object.isString( p ) ? _new( p ) : p;
            } ) ) ;
            _render();
            self.value.setLength( 0 ).concatUnique( paths.pluck( "path" ) );
          }
          showPopup( "popupPaths" );
        } ),
        rB( "Scrape Paths" ).observe( "click", function() {
          paths.each( function( p ) { p.count = 0 } );
          fetchDownloadDirs( undefined, function ( response ) {
            updateTorrents( response ).each( function( torrent ) {
              const k = torrent.downloadDir;
              ( pathHash[ k ] = pathHash[ k ] || paths.squeak( _new( k ) ) ).count++;
            } );
            paths.concatUnique( Object.values( pathHash ) );
            _render();
            self.value.setLength( 0 ).concatUnique( paths.pluck( "path" ) );
          } )
        } ),
        rB( "Free Space" ).observe( "click", function() {
          const _work = paths.pluck( "path" );
          _next = function() {
            doRequest( "free-space", { "path": _work.shift() }, function( response ) {
              const args = getArguments( response );
              const path = pathHash[ args.path ];
              path.free = args[ "size-bytes" ];
              path.total = args[ "total_size" ];
              ( isEmpty( _work ) ? _render : _next )()
            } )
          }
          _next();
        } )
      ]
    },
    value: []
  },
  "minSeeders": {
  },
  "trackers": {
    getValue: function( cell ) {
      return cell.down( "textarea" ).value;
    },
    renderAdvanced: function( trackers ) {
      return [
        rT( { id: "trackers_remove", "class": "styled", style: "resize: vertical", placeholder: "Remove" } ).hide(),
        rT( { id: "trackers_add", "class": "styled", style: "resize: vertical", placeholder: "Add" } ).insert( trackers )
      ]
    }
  }
}

function stopSeeding() {
  const minSeeders = $( "s_minSeeders" ).down( "input" ).value;
  fetchTorrents( [ "id", "trackerStats" ], filterStatus( globals.version < 14 ? 8 : 6 ).pluck( "id" ), function( response ) {
    const stopTorrents = getArguments( response ).torrents.filter( function( torrent ) {
      const stats = torrent.trackerStats;
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

function iterateTorrents( fields, ids, callback, last ) {
  ids = isEmpty( ids ) ? globals.torrents.pluck( "id" ) : ids;
  const _next = function() {
    const id = ids.shift();
    if( !id ) {
      last && last();
      return;
    }
    fetchTorrents( fields, [ id ], function( response ) {
      if( success( response ) ) {
        callback && callback( getArguments( response ).torrents[ 0 ], _next );
        return;
      }
      _next();
    } );
  }
  _next();
}

function matchTracker( trackers, list ) {
  return result = trackers.reduce( function( r, tracker ){
    list.includes( tracker.announce ) && r.push( [ tracker.id, tracker.announce ] );
    return r;
  }, [] );
}

function addTrackers( ids, add, done ) {
  if( isEmpty( add ) ) {
    done();
    return;
  }

  fixTorrents( { ids: ids, trackerAdd: add }, function( response ) {
    if( success( response ) ) {
      done();
      return;
    }
    iterateTorrents( trackerFields, ids, function( torrent, next ) {
      const trackers = add.withoutArray( matchTracker( torrent.trackers, add ).pluck( 1 ) );
      if( 0 === trackers.length ) {
        next();
      }
      else {
        fixTorrents( { ids: ids, trackerAdd: add.withoutArray( trackers.pluck( 1 ) ) }, next );
      }
    }, done );
  } );
}

function removeTrackers( ids, remove, done ) {
  if( isEmpty( remove ) ) {
    done();
    return;
  }

  fixTorrents( { ids: ids, trackerRemove: remove }, function( response ) {
    if( success( response ) ) {
      done();
      return;
    }
    iterateTorrents( trackerFields, ids, function( torrent, next ) {
      const trackers = matchTracker( torrent.trackers, remove );
      if( 0 === trackers.length ) {
        next();
      }
      else {
        fixTorrents( { ids: ids, trackerRemove: trackers.pluck( 0 ) }, next );
      }
    }, done );
  } );
}

function replaceTrackers( ids, add, remove, done ) {
  if( isEmpty( add ) || isEmpty( remove ) || add.length !== remove.length ) {
    done();
    return;
  }

  const replace = remove.zip( add );
  fixTorrents( { ids: ids, trackerReplace: replace }, function( response ) {
    if( success( response ) ) {
      done();
      return;
    }
    const map = replace.reduce( function( o, e ){
      o[ e[ 0 ] ] = e[ 1 ];
      return o;
    }, {} )
    iterateTorrents( trackerFields, ids, function( torrent, next ) {
      const trackers = matchTracker( torrent.trackers, replace.pluck( 0 ) );
      if( 0 === trackers.length ) {
        next();
      }
      else {
        fixTorrents( { ids: ids, trackerReplace: trackers.each( function( tracker ) {
          tracker[ 1 ] = map[ tracker[ 1 ] ];
        } ) }, next );
      }
    }, done );
  } );
}

function renderTrackerCell( cell ) {
  const tb = rB( "trackers on all torrents" );
  const ta = cell.down( "textarea#trackers_add" );
  const tr = cell.down( "textarea#trackers_remove" );
  const elements = [ tb, ta, tr ];

  const _done = function( result ) {
    elements.invoke( "enable" );
    tb.insert( { after: rS( result ) } );
  }

  const x = {
    "add_trackers": {
      click: function( e ) {
        ta.show();
        tr.hide();
        tr.insert( { after: ta } );
      },
      action: function( e ) {
        addTrackers( [], ta.value.match( trackerRegExp ), _done );
      }
    },
    "remove_trackers": {
      click: function( e ) {
        ta.hide();
        tr.show();
        ta.insert( { after: tr } );
      },
      action: function( e ) {
        removeTrackers( [], tr.value.match( trackerRegExp ), _done );
      }
    },
    "replace_trackers": {
      click: function( e ) {
        ta.show();
        tr.show();
        tr.insert( { after: ta } );
      },
      action: function( e ) {
        replaceTrackers( [], ta.value.match( trackerRegExp ), tr.value.match( trackerRegExp ), _done );
      }
    }
  }

  const _prep = function( s ) {
    return s.charAt( 0 ).toUpperCase() + s.slice( 1, s.indexOf( "_" ) );
  }

  var first;
  Object.keys( x ).each( function( i ) {
    var l = rLed( false, { id: i } );
    first = first || l;
    first.addRadio( l );
    cell.insert( l ).insert( _prep( i ) );
  } );
  first.setRadioHandler( function( e ) {
    e.stop();
    x[ e.target.id ].click( e );
  } );

  cell.insert( tb.observe( "click", function( e ){
    e.stop();
    elements.invoke( "disable" );
    x[ first.getRadio().id ].action( e );
  } ) );
  first.click();
}

function setQueuePositionBy( property ) {
  const batchIds = [];
  showWait();

  const _next = function() {
    const ids = batchIds.shift();
    if( ids ) {
      doRequest( "queue-move-bottom", { ids: ids }, _next );
    }
    else{
      showDone();
    }
  }

  fetchTorrents( [ "id", property ], undefined, function( response ) {
    updateTorrents( response );
    globals.torrents.sortByProperty( property );
    if( undefined === globals.torrents[ 0 ].queuePosition ) {
      globals.torrents[ 0 ].queuePosition = 0;
    }
    var minQueuePosition = globals.torrents[ 0 ].queuePosition;
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
    batchIds.reverse();
    _next();
  } );
}

const darkMedia = "(prefers-color-scheme: dark)";
function isDark() {
  return window.matchMedia && window.matchMedia( darkMedia ).matches
}

function setStylesheet( name, dark ) {
  name = Object.isString( name ) ? name : globals.shift.settings.styleSheet[ 0 ];
  dark = dark || globals.shift.settings.dark || isDark();
  globals.html.className = dark ? "dark" : "";
  var i = name.lastIndexOf( "." );
  globals.html.addClassName( -1 === i ? name : name.substring( 0, i ) );

  const sheet = $$( "link[rel=stylesheet]" )[ 1 ];
  sheet.href = sheet.baseURI + name;
  globals.piecesColor = undefined;
  indentDeclaration = undefined;
  availabilityColors = undefined;
  if( document.getAnimations ) {
    const a = document.getAnimations();
    for( i = 0, len = a.length; i < len; ++i ) {
      if( -1 !== a[i].animationName.indexOf( "fullcircle" ) ) {
        a[i].currentTime = new Date().getTime() % 3600000;
        break;
      }
    }
  }
}

function showShiftTable() {
  if( showContent( "shiftTable" ) ) {
    return;
  }

  getTable( "shiftTable", globals.content, shiftColumns, undefined, function( t ) {
    t.table.addClassName( "keyvalue" );
    renderKeyValuePairs( t.body, globals.shift.settings, "s_", shiftFields );

    t.body.down( "td#s_minSeeders" ).insert( rB( "Stop seeding" ).observe( "click", stopSeeding ) );

    const _dark = t.body.down( "td#s_dark" );
    const _l = _dark.down( "led" )
    _l.setAttribute( "id", "darkLed" );
    t.body.down( "td#s_styleSheet" ).insert( _l ).insert( "Dark" );
    _dark.up( "tr" ).remove();

    if( globals.version >= 10 ) { // 2.10
      renderTrackerCell( t.body.down( "td#s_trackers" ) );
    }

    if( globals.version >= 14 ) { // 2.40
      t.body.insert( rR().insert( rC().insert( "Set queue positions" ) ).insert( rC().insert(
        rB( "Date" ).observe( "click", setQueuePositionBy.curry( "addedDate" ) )
      ) ) );
    }

    t.footer.insert( renderFooter( function( clipboard ) {
      const s = globals.shift.settings;
      var data = getKeyValuePairs( s, "s_", shiftFields );
      if( globals.shift.settingsChanged = !isEmpty( data ) ) {
        const deactivated = false === data.screenshotMode;
        data = deactivated ? { screenshotMode: false } : data;
        Object.extend( s, data );
        clipboard.copy( s );
        deactivated && updateKeyValuePairs( t.body, s );
        data = Object.diff( s, globals.shift.defaultSettings );
        if( data.styleSheet || undefined !== data.dark ) {
          setStylesheet( data.styleSheet[ 0 ], data.dark );
        }
        cookiefy( data );
        if( s.notificationLevel > 0 ) {
          if( data.notificationLevel > 0 && Notification.permission !== "granted" ) {
            Notification.requestPermission();
          }
          sendNotification( 3, "Shift settings Changed.", { body: prettify( data ) } );
        }
        renderDoneSound();
      }
      playDoneSound();
    }, true ) );
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

var menuSelected = null;

// Returns true if a new menu item was selected.
function menuSelect( item ) {
  const menuId = createId( "menu_", item );
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

function renderPopup( id ) {
  return rD( { id: id, "class": "popup" } ).hide();
}

function renderDialogPopup( id ) {
  return renderPopup( id ).addClassName( "dialog" );
}

function renderMenuItems( items, render ) {
  return items.map( function( item ) {
    return rE( "li", { id: item.toLowerCase() } ).insert( render ? render( item ) : item );
  } );
}

function renderMenuPopup( id, items, render ) {
  return renderPopup( id ).insert( rE( "ul" ).insert( renderMenuItems( items, render ) ) );
}

function renderPage() {
  const rCancel = function( style, text ) {
    return rB( { "class": style, value: text || "Cancel" } ).observe( "click", closePopup );
  }

  const _browse = function( e ) {
    _file( e );
    globals.dialogs.add.file.click();
  }

  const _file = function( e ) {
    e.stop();
    globals.dialogs.add.isFile.click();
  }

  const _url = function( e ) {
    e.stop();
    globals.dialogs.add.isUrl.click();
  }

  const a = globals.actions = {
    batchrename: {
      _searcher: function( search ) {
        return search instanceof RegExp ? function( file ) {
          return getFilePart( file.name ).match( search );
        } : function( file ) {
          return getFilePart( file.name ).includes( search );
        }
      },
      _preview: function() {
        const d = globals.dialogs.batchrename;
        const isRegExp = d.isRegExp.value;
        const search = isRegExp ? new RegExp( d.search.value, "g" ) : d.search.value;

        var replace = d.replace.value;
        if( isRegExp && 0 === replace.length ) {
          for( var i = 1, len = ( new RegExp( d.search.value + "|", "g" ) ).exec( "" ).length; i < len; ++i ) {
            replace += "$" + i;
          }
          d.replace.value = replace;
        }
        const file = globals.currentTorrent.files.find( _searcher( search ) );
        const fileName = file ? getFilePart( file.name ) : "";
        d.searchPreview.update( fileName );
        d.replacePreview.update( fileName.replace( search, replace ) );
      }
    },

    substitute: {
      _searcher: function( search ) {
        return search instanceof RegExp ? function( t ) {
          return t.downloadDir && t.downloadDir.match( search );
        } : function( t ) {
          return t.downloadDir && t.downloadDir.includes( search );
        }
      },
      _preview: function() {
        const d = globals.dialogs.substitute;
        const search = d.isRegExp.value ? new RegExp( d.search.value, "g" ) : d.search.value;

        const _find = function( torrents ) {
          return torrents && torrents.find( globals.actions.substitute._searcher( search ) );
        };

        const t = _find( [ globals.currentTorrent ] ) || _find( globals.selected ) || ( d.selection.value ? null : _find( globals.torrents ) );

        const _display = function() {
          d.searchPreview.update();
          d.replacePreview.update();
          if( t ) {
            const s = t.downloadDir;
            d.searchPreview.insert( s + "/" + t.name );
            d.replacePreview.insert( s.replace( search, d.replace.value ) + "/" + t.name );
          }
        }

        _display();
      }
    }
  }

  const d = globals.dialogs = {
    action: rB( { "class": "action", value: "Action" } ).observe( "click", handleTorrentActionClick ),
    add: {
      file: rI( null, { type: "file", multiple: "multiple" } ).observe( "change", function( e ) {
        _file( e );
        d.add.fileName.value = $A( e.currentTarget.files ).pluck( "name" ).join( ";" );
      } ).hide(),
      isFile: rLed(),
      fileName: rI( null, { readonly: "readonly" } ).observe( "click", _browse ).observe( "focus", _file ),
      browse: rB( { "id": "browse", "class": "add", value: "Browse" } ).observe( "click", _browse ).observe( "focus", _file ),
      isUrl: rLed(),
      url: rI().observe( "change", _url ).observe( "focus", _url ).observe( "keypress", _url ),
      paths: rI( "" ),
      paused: rLed().makeToggle().setValue( !function() {
        var s = globals.shift.session[ "start-added-torrents" ];
        return undefined === s ? true : s;
      }() ),
      uploading: rB( { "class": "add", value: "Uploading" } ).observe( "click", function( e ) {
        e.stop();
        showPopup( "popupUpload" );
      } ),
      add: rB( { "class": "add", value: "Add" } ).observe( "click", function( e ) {
        e.stop();
        closePopup();
        const d = globals.dialogs.add;
        const file = d.isFile.getRadio() === d.isFile;
        const input = d[ file ? "fileName": "url" ];
        if( input.value.length ) {
          upload( file ? Array.from( d.file.files ) : [ input.value ], persistPath( d.paths.value ), d.paused.value );
          input.value = "";
        }
      } )
    },
    additional: rD( "additional" ),
    batchrename: {
      search: rI().observe( "change", a.batchrename._preview ),
      searchPreview: rS( "example" ),
      isRegExp: rLed( false, { title: "Regular Expression" } ).makeToggle().observe( "click", a.batchrename._preview ),
      replace: rI().observe( "change", a.batchrename._preview ),
      replacePreview: rS( "example" ),
      rename: rB( { "class": "rename", id: "batchrename", value: "Rename" } ).observe( "click", function( e ) {
        e.stop();
        closePopup();
        const p = d.batchrename;
        if( p.replace.value === p.search.value ) {
          return;
        }

        const search = p.isRegExp.value ? new RegExp( p.search.value, "g" ) : p.search.value;
        const replace = p.replace.value;
        const files = globals.currentTorrent.files.filter( a.batchrename._searcher( search ) );
        renameFiles( files.map( function( f ) {
          return {
            path: f.name,
            name: getFilePart( f.name ).replace( search, replace ),
            node: f.node.down( "td.name" )
          }
        } ) );
      } )
    },
    cancel: rCancel( "cancel" ),
    paths: {
      paths: rD( { id: "paths", "class": "styled", contentEditable: "true", spellcheck: "false" } ).observe( "keydown", function( e ) {
        if( e.keyCode !== 27 ) { // Esc
          e.stopPropagation();
        }
        if( e.keyCode === 13 ) { // Enter
          document.execCommand( "insertHTML", false, "\n" );
          e.preventDefault();
        }
      } ),
      apply: rB( { "class": "paths", value: "Apply" } ).observe( "click", function( e ) {
        e.stop();
        closePopup();
        if( globals.shift.settings.screenshotMode ) {
          return;
        }
        const callback = globals.dialogs.paths.callback;
        callback && callback( $( "paths" ).textContent.split( "\n" ).grep( /([^\s])/ ).invoke( "trim" ).uniq() );
      } ),
      callback: undefined
    },
    relocate: {
      close: function() {
        const b = $("substitute");
        b && b.remove();
      },
      open: function() {
        if( !globals.currentTorrent.downloadDir ) {
          fetchDownloadDirs( [ globals.currentTorrent.id ] ) ;
        }
        d.additional.update();
        d.additional.insert( [
          rS( "label" ).insert( "To" ), d.relocate.paths = renderPathSelect(), "<br/>",
          rS( "label" ), d.relocate.move.setValue( true ).makeToggle(), " Move" ] );
        d.cancel.insert( { after: rB( { id: "substitute", "class": "action", value: "Substitute" } ).observe( "click", function( e ) {
          e.stop();
          closePopup();
          d.substitute.search.value = d.substitute.replace.value = globals.currentTorrent.downloadDir;
          d.substitute.search.change();
          d.substitute.selection.value = 1 < globals.selected.length;
          showPopup( "popupSubstitute" );
        } ) } );
        return true;
      },
      paths: null,
      move: rLed( true )
    },
    substitute: {
      search: rI().observe( "change", a.substitute._preview ),
      searchPreview: rS( "example" ),
      isRegExp: rLed( false, { title: "Regular Expression" } ).makeToggle().observe( "click", a.substitute._preview ),
      replace: rI().observe( "change", a.substitute._preview ),
      replacePreview: rS( "example" ),
      move: rLed( true ).makeToggle(),
      selection: rLed().makeToggle(),
      relocate: rB( { "class": "action", value: "Relocate" } ).observe( "click", function( e ) {
        e.stop();
        closePopup();
        d.relocate.open();
        const p = showPopup( "popupDialog" );
        p.close = d.relocate.close;
      } ),
      substitute: rB( { "class": "substitute", id: "substitute", value: "Substitute" } ).observe( "click", function( e ) {
        e.stop();
        closePopup();
        const p = globals.dialogs.substitute;
        if( p.replace.value === p.search.value ) {
          return;
        }

        const search = p.isRegExp.value ? new RegExp( p.search.value, "g" ) : p.search.value;
        const replace = p.replace.value;
        var torrents = p.selection.value ? globals.selected : globals.torrents;

        const move = p.move.value;
        const _replace = function() {
          const _searcher = globals.actions.substitute._searcher( search );
          torrents.partitionBy( "downloadDir" ).shiftEach( function( batch, _next ) {
            if( !batch.find( _searcher ) ) {
              return _next();
            }
            doRequest( "torrent-set-location", { ids: batch.pluck( "id" ), location: batch[ 0 ].downloadDir.replace( search, replace ), move: move }, _next );
          }, function() {
            fetchDownloadDirs( torrents.pluck( "id" ) );
          } );
        }

        var ids = torrents.filter( function( t ) { return !t.downloadDir } ).pluck( "id" );
        if( !ids.length ) {
          return _replace();
        }

        fetchDownloadDirs( ids, function( response ) {
          updateTorrents( response )
          _replace();
        } );
      } )
    },
    remove: {
      open: function() {
        d.additional.insert( d.remove.trash.setValue( false ), "Trash" );
        return globals.shift.settings.confirmRemove;
      },
      trash: rLed( true, { readonly: "readonly" } )
    },
    rename: {
      fileName: rI(),
      rename: rB( { "class": "rename", id: "rename", value: "Rename" } ).observe( "click", handleTorrentActionClick )
    },
    torrents: rD( "torrents" ),
    trash: {
      open: function() {
        d.additional.insert( d.remove.trash.setValue( true ), "Trash" );
        return globals.shift.settings.confirmTrash;
      }
    },
    upload: {
      uploads: rD( { id: "uploads" } ).observe( "dblclick", function( e ) {
        const l = e.findElement( "div.upload" );
        l && l.item.clear( true );
      } ),
      keep: rLed().makeToggle(),
      silent: rLed().makeToggle().toggle(),
      add: rB( { "class": "upload", value: "Add" } ).observe( "click", showAddPopup ),
      close: rCancel( "upload", "Close" ),
      clear: rB( { "class": "upload", value: "Clear" } ).observe( "click", function( e ) {
        e.stop();
        const u = $( "uploads" );
        u.select( "div.upload" ).each( function( div ){
          const led = div.down( "led" );
          if( led.hasClassName( "added" ) || led.hasClassName( "duplicate" ) ) {
            div.item && div.item.clear( true );
          }
        } );
        if( u.empty() ) {
          closePopup( e );
        }
      } )
    }
  }
  d.add.isFile.addRadio( d.add.isUrl ).click();

  d.remove.insert = Object.values( d.remove );
  d.rename.insert = Object.values( d.rename );

  const popups = rD( { id: "popups" } ).insert(
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
      .insert( rD().insert( d.add.isFile, rS( "add", "File" ), d.add.fileName, d.add.browse ) )
      .insert( rD().insert( d.add.isUrl, rS( "add", "Url" ), d.add.url ) )
      .insert( rD().insert( rS( { class: "add", id: "labelDir" }, "Dir" ) ) )
      .insert( rD().insert( d.add.paused, rS( { id: "labelPaused" }, "Add paused" ) ) )
      .insert( rD().insert( d.add.uploading, rCancel( "add" ), d.add.add ) )
  ).insert(
    renderDialogPopup( "popupBatchRename" )
      .insert( rE( "h1", {}, "Batch Rename" ) )
      .insert( rD().insert( rS( "rename", "Search" ), d.batchrename.search, d.batchrename.isRegExp ) )
      .insert( rD().insert( rS( "rename", "Example" ), d.batchrename.searchPreview ) )
      .insert( rD().insert( rS( "rename", "Replace" ), d.batchrename.replace ) )
      .insert( rD().insert( rS( "rename", "Example" ), d.batchrename.replacePreview ) )
      .insert( rD().insert( rCancel( "rename" ), d.batchrename.rename ) )
  ).insert(
    renderDialogPopup( "popupDialog" )
      .insert( rE( "h1" ) )
      .insert( "Are you sure you want to <span></span> the following torrent(s)" )
      .insert( d.torrents )
      .insert( d.additional )
      .insert( rD().insert( d.cancel ).insert( d.action ) )
  ).insert(
    renderDialogPopup( "popupPaths" )
      .insert( rE( "h1", {}, "Paths" ) )
      .insert( d.paths.paths )
      .insert( rD().insert( rCancel( "paths" ), d.paths.apply ) )
  ).insert(
    renderDialogPopup( "popupSubstitute" )
      .insert( rE( "h1", {}, "Batch substitute paths" ) )
      .insert( rD().insert( rS( "substitute", "Search" ), d.substitute.search, d.substitute.isRegExp ) )
      .insert( rD().insert( rS( "substitute", "Example" ), d.substitute.searchPreview ) )
      .insert( rD().insert( rS( "substitute", "Replace" ), d.substitute.replace ) )
      .insert( rD().insert( rS( "substitute", "Example" ), d.substitute.replacePreview ) )
      .insert( rD().insert( rS( "substitute" ), d.substitute.move, rS( "substitute", " Move " ), d.substitute.selection, rS( "substitute", " Selection only" ) ) )
      .insert( rD().insert( rCancel( "substitute" ), d.substitute.relocate, d.substitute.substitute ) )
  ).insert(
    renderDialogPopup( "popupUpload" )
      .insert( rE( "h1", {}, "Uploading" ) )
      .insert( d.upload.uploads )
      .insert( rD().insert( d.upload.keep, rS( "upload", "Keep" ), d.upload.silent, rS( "upload", "Silent" ), d.upload.add, d.upload.close, d.upload.clear ) )
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
      .insert( rD().insert( rS( "rename", "Name" ), d.rename.fileName ) )
      .insert( rD().insert( rCancel( "rename" ), d.rename.rename ) )
  ).insert(
    renderMenuPopup( "popupTorrent", torrentActionLabels )
  ).insert(
    renderMenuPopup( "popupTracker", [ "Remove" ] )
  ).insert(
    renderMenuPopup( "popupTrackerAdd", [ "Add" ] )
  ).insert(
    renderMenuPopup( "popupTrackerUpdate", [ "Update" ] )
  );

  $( "outside" ).insert( popups );
  $( "popupFile" ).down( "ul" ).insert( renderMenuItems( fileMenuItems ) );
  $( "popupTorrent" ).down( "li#remove" ).insert( { before: rD( "menuSpacer" ) } );

  globals.popups = {
    "popups": popups
  };

  popups.select( ".popup" ).each( function( popup ) {
    globals.popups[ popup.id ] = popup;
  } );

  const header = rD( { id: "header" } );
  header
    .insert( rD( { id: "stats" } )
    .insert( rS( "label", "Dl/Ul: " ) )
    .insert( rS( { id: "downloadSpeed" }, "0Bs" ) ).insert( " / " )
    .insert( rS( { id: "uploadSpeed" }, "0Bs" ) ).insert( rE( "br" ) )
    .insert( rS( "label", "Total: " ) )
    .insert( rS( { id: "downloadedBytes" }, "0B" ) ).insert( " / " )
    .insert( rS( { id: "uploadedBytes" }, "0B" ) ).insert( rE( "br" ) )
    .insert( rS( "label", "Free: " ) )
    .insert( rS( { id: "download-dir-free-space" }, "0B" ) )
    .observe( "dblclick", function() {
      const f = $( "filterContainer" );
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
            const xs = e.pageX - header.offsetLeft;
            const ys = e.pageY - header.offsetTop;
            const w = window.innerWidth - header.offsetWidth - 8;
            const h = window.innerHeight - header.offsetHeight - 8;
            this.observe( "mousemove", function( e ) {
              header.style.left = ( e.pageX - xs ).limit( 8, w ) + "px";
              header.style.top = ( e.pageY - ys ).limit( 8, h ) + "px";
            } );
            const _handler = function() {
              this.stopObserving( "mouseleave" );
              this.stopObserving( "mousemove" );
              this.stopObserving( "mouseup" );
            }
            this.observe( "mouseleave", _handler );
            this.observe( "mouseup", _handler );
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
      rM( "Add", showAddPopup ),
      rM( "Start all", function() {
        if( globals.shift.settings.confirmStartAll ) {
          if( !confirm( "Start all torrents?" ) ) {
            return;
          }
        }
        doRequest( "torrent-start" );
      } ),
      rM( "Stop all", function() {
        if( globals.shift.settings.confirmStopAll ) {
          if( !confirm( "Stop all torrents?" ) ) {
            return;
          }
        }
        doRequest( "torrent-stop" );
      } )
    ],
    torrent: [
      [ "Files", "fileTable", [ "id", "fileStats", "percentDone", "pieces", "sizeWhenDone" ], showFiles ],
      [ "Peers", "peersDiv", [ "id", "peers", "peersFrom" ], showPeers ],
      [ "Trackers", "trackerDiv", [ "id", "trackerStats" ], showTrackers ],
      [ "Details", "detailsTable", torrentDetailsUpdateKeys, showDetails ]
    ].map( function( a ) {
      return rM( a[ 0 ], function( handler ) {
        globals.menu.main.hideAll();
        globals.menu.torrent.showAll();
        const torrent = globals.currentTorrent;
        if( globals.oldTorrent != torrent ) {
          globals.oldTorrent = torrent;
          globals.content.select( ".torrent" ).invoke( "remove" );
        }
        if( torrent.files ) {
          handler();
        }
        else {
          fetchTorrents( torrentFieldKeys, [ torrent.id ], function( response ) {
            updateTorrents( response );
            handler();
          } );
        }
      }.curry( function( menu, tableId, fields, renderer ) {
        if( !menuSelect( menu ) ) {
          return;
        }
        showWait();
        if( !showContent( tableId ) ) {
          const torrent = globals.currentTorrent;
          globals.shift.torrentUpdater.mod( { fields: fields, ids: [ torrent.id ] }, function( response ) {
            updateTorrents( response );
            renderer( torrent );
            showDone();
          } );
        }
      }.curry( a[ 0 ], a[ 1 ], a[ 2 ], a[ 3 ] ) ) );
    } ),
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
        globals.shift.torrentUpdater.default();
      }
      globals.menu.session.hideAll();
      globals.menu.torrent.hideAll();
      globals.menu.main.showAll();
    } ) )
    .insert( globals.menu.main )
    .insert( globals.menu.torrent )
    .insert( rM( "Session", function() {
      if( menuSelect( "session" ) ) {
        showSessionTable();
      }
      globals.menu.main.hideAll();
      globals.menu.torrent.hideAll();
      globals.menu.session.showAll();
    } ) )
    .insert( globals.menu.session )
    .insert( rM( "About", function() {
      showPopup( "popupAbout" );
    } ) )
  );

  globals.body.insert( header );

  globals.content = rD( { id: "content" } );
  globals.body.insert( globals.content );

  globals.menu.main.showAll();
  menuSelect( "torrents" );
}

function getBody( torrent, s ) {
  s = s || "";
  return { body: ( torrent.hashString ? torrent.hashString + "\n" : "" ) + torrent.name + s };
}

const _uploads = [];

function upload( uploads, target, paused ) {
  const preLoad = true;
  const protocol = window.location.href.includes( "uri=" );
  const d = globals.dialogs && globals.dialogs.upload;

  const _back = function( message ) {
    if( protocol ) {
      globals.body.insert( message );
      window.history.back();
    }
  }

  if( isEmpty( uploads ) ) {
    _back();
  }

  const _upload = function( uploadable ) {
    uploadable.update( "uploading" );
    uploadable.node && uploadable.node.scrollIntoView( false );

    // Upload the item first to see if Transmission can handle it.
    addTorrent( uploadable.result || uploadable.url, function( response ) {
      _uploads.remove( uploadable );
      _back();

      if( !success( response ) ) {
        // Transmisssion could not handle the item. Parse it for URL extraction.
        const textReader = _reader( function() {
          upload( textReader.result.match( torrentRegExp ), target, paused );
        } );
        textReader.readAsText( uploadable );
        uploadable.update( "processing" );
        _next();
        return;
      }

      const args = getArguments( response );
      const t = args[ "torrent-added" ] || args[ "torrent-duplicate" ];
      if( !t ) {
        _back();
        _next();
        return;
      }

      var m;
      if( "torrent-added" in args ) {
        uploadable.update( "added" );
        sendNotification( 3, "Torrent added.", getBody( t ) );
        if( uploadable.url && uploadable.url.startsWith( "magnet:" ) ) {
          globals.magnets.push( t.id );
        }
        !d.keep.value && uploadable.clear( true );
        m = " added!";
      }

      if( "torrent-duplicate" in args ) {
        uploadable.update( "duplicate" );
        sendNotification( 2, "Duplicate torrent.", getBody( t ) );
        !d.keep.value && uploadable.clear( false );
        m = " duplicate!"
      }

      _back( m );
      _next();
    }, target, paused, function( request ) {
      uploadable.request = request;
    } );
  }

  const _url = function( s ) {
    var name = decodeURIComponent( s );
    return {
      url: s,
      name: name.startsWith( "magnet:" ) ? magnetNameRegExp.exec( name )[ 1 ] : getFilePart( name )
    }
  }

  if( protocol ) {
    return _upload( function( item ) {
      item.clear = nop;
      item.update = nop;
      return item;
    }( _url( uploads[0] ) ) );
  }

  const u = $( "uploads" );
  const uploading = !isEmpty( _uploads );
  uploads.each( function( item ) {
    if( _uploads.find( function( existing ) {
      return item === existing.url || item.name === existing.name;
    } ) ) {
      return;
    }
    const isUrl = !item.name;
    item = isUrl ? _url( item ) : item;
    u.insert( _uploads.squeak( function( item ) {
      item.clear = function( n ) {
        _uploads.remove( this );
        this.request && this.request.transport && this.request.transport.abort && this.request.transport.abort();
        delete this.request;
        delete this.name;
        delete this.result;
        delete this.update;
        delete this.url
        if( n ) {
          delete this.clear;
          delete this.node.item;
          this.node.remove();
          delete this.node;
          !d.silent.value && showPopup( "popupUpload" );
        }
      }.bind( item );
      item.update = function( status ) {
        this.status = status;
        this.node.down( "led" ).value = status;
      }.bind( item );
      item.node = rD( "upload" ).insert( rLed( false ) ).insert( item.name );
      item.node.item = item;
      return item;
    } ( item ) ).node );
    isUrl && item.update( "loaded" );
  } );

  u.show();
  showPopup( "popupUpload" );

  if( uploading ) {
    return;
  }

  const _reader = function( onLoad ) {
    return Event.observe( new FileReader(), "load", onLoad );
  }

  const _load = function( file, onLoad ) {
    if( "loaded" === file.status ) {
      onLoad( file );
    }
    else {
      file.update( "loading" );
      const r = _reader( function( e ) {
        file.update( "loaded" );
        file.result = e.target.result;
        onLoad( file )
      } );
      r.readAsDataURL( file );
    }
  }

  const _next = function() {
    if( isEmpty( _uploads ) ) {
      return;
    }

    var item = _uploads.find( function( i ) {
      return "uploading" === i.status;
    } );

    if( item ) {
      // TODO Update status.
    }
    else {
      item = _uploads.find( function( i ) {
        return "loaded" === i.status;
      } );
      item && _upload( item );
    }

    item = _uploads.find( function( item ) {
      return !item.status;
    } );

    if( item ) {
      _load( item, preLoad ? _next : _upload );
      return;
    }
    setTimeout( _next, 1000 );
  }
  _next();
}

function renderDoneSound() {
  const s = globals.shift;
  if( s.doneSound ) {
    s.doneSound.pause();
    s.doneSound.currentTime = 0;
  }
  var soundDone = s.settings.soundDone;
  if( isEmpty( soundDone ) ) {
    const audioWave = [];
    for( var i = 0; i < 1024; ++i ) {
      audioWave[ i ] = 128 + Math.round( 127 * Math.sin( i / 1.8 ) );
    }
    soundDone = new riffwave( audioWave ).dataURI;
  }
  s.doneSound = new Audio( soundDone );
  s.doneSound.setAttribute( "id", "doneSound" );
}

function renderTitle() {
  const s = globals.shift;
  if( s.settings.showSpeedTitle && s.sessionStats ) {
    document.title = renderers[ "downloadSpeed" ]( s.sessionStats.downloadSpeed ) + " \u25BC\u25B2" + renderers[ "uploadSpeed" ]( s.sessionStats.uploadSpeed );
  }
  else {
    document.title = "Shift " + s.version + " / Transmission " + s.session.version;
  }
}

function getVisible( selector ) {
  var elements = globals.body.select( selector ).filter( Element.visible );
  for( var i = 0, len = elements.length; i < len; ++i ) {
    var e = elements[ i ];
    if( elements.offsetParent ) {
      return e;
    }
  }
  return null;
}

function centerVertically( e ) {
  if( !e ) {
    return;
  }
  const clientHeight = document.viewport.getHeight();
  const clientBottom = document.viewport.getScrollOffsets().top + clientHeight;
  const h = e.getHeight();
  const t = e.cumulativeOffset().top;

  if( t < clientBottom || clientBottom < t + h ) {
    window.scrollTo( 0, t + h / 2 - clientHeight / 2 );
  }
}

var statusKeys;

function handleKeyDown( e ) {
  if( e.ctrlKey || [ "INPUT", "TEXTAREA" ].includes( e.target.tagName ) ) {
    return true;
  }
  const kc = e.keyCode;

  const _getVisible = function() {
    return $( "torrentBody" ).select( "tr" ).filter( Element.visible );
  }

  var torrent;
  switch( globals.activeTableId ) {
  case "torrentTable":
    globals.currentIndex |= 0;
    statusKeys = statusKeys || Object.keys( globals.torrentStatusKeyHash ).map( Number );
    if( statusKeys.includes( kc ) ) {
      preventDefault( e );
      globals.hashIndex = ( globals.hashIndex + 1 ) % globals.torrentStatusKeyHash[ kc ].length;
      $( "statusSelect" ).setValue( globals.torrentStatusKeyHash[ kc ][ globals.hashIndex ] ).change();
    }
    else if( 32 == kc ) { // Space
      preventDefault( e );
      torrent = globals.currentTorrent || getTorrent( _getVisible()[ 0 ].id, true );
      if( !torrent ) {
        return;
      }
      centerVertically( torrent._node );
      globals.select = torrent.toggleSelect().selected;
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
    else if( 38 == kc || 40 == kc ) { // Up, Down
      preventDefault( e );
      var rows = _getVisible();
      if( !isEmpty( rows ) ) {
        rows.invoke( "toggleClassName", "active", false );
        globals.currentIndex += 38 == kc ? -1 : 1;
        globals.currentIndex = globals.currentIndex.limit( 0, rows.length - 1 );
        var row = rows[ globals.currentIndex ];
        row.toggleClassName( "active", true );
        torrent = getTorrent( row.id, true );
        if( undefined !== globals.select ) {
          torrent.toggleSelect( globals.select );
        }
        centerVertically( row );
      }
    }
    else if( 46 == kc ) { // Delete
      preventDefault( e );
      handleTorrentMenuClick( { target: { id: e.shiftKey ? "trash" : "remove" } } );
    }
    else if( 48 <= kc && kc <= 57 ) { // 0..9
      preventDefault( e );
      var headers = $( "torrentTable" ).select( "th" ).filter( Element.visible ).filter( function( column ) {
        return column.id.startsWith( "h_" ) && "h_menu" != column.id;
      } );
      var i = ( kc - 39 ) % 10; // 1..9,0
      sortTorrents( headers[ i.limit( 0, headers.length - 1 ) ].id.substring( 2 ) );
    }
    break;
  }

  switch( kc ) {
    case 13: // Enter
    case 107: // +
      var button;
      preventDefault( e );
      if( $( "popups" ).visible() ) {
        if( $( "popupAdd" ).visible() ) {
          globals.dialogs.add.add.click();
          break;
        }
      }
      else if( button = getVisible( "button.apply" ) ) {
        button.click();
        break;
      }
      else {
        showAddPopup();
        break;
      }
    case 27: // Esc
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
  const kc = e.keyCode;
  if( undefined !== globals.select && 32 == kc ) { // Space
    delete globals.select;
  }
  if( 9 == kc ) { // Tab
    document.activeElement.focus();
  }
}

function registerMagnetHandler() {
  if( globals.shift.settings.registerMagnetHandler ) {
    if( navigator.isProtocolHandlerRegistered ) {
      if( navigator.isProtocolHandlerRegistered( "magnet" ) ) {
        return;
      }
    }
    navigator.registerProtocolHandler && navigator.registerProtocolHandler( "magnet", window.location.href + "?uri=%s", "Shift Transmission Magnet Handler" );
  }
  else {
    navigator.unregisterProtocolHandler && navigator.unregisterProtocolHandler( "magnet" );
  }
}

function extractTemplateFields( data ) {
  for( var k in data ) {
    var s = "" + data[ k ];
    s.replaceAll( templateRegExp, function( m ) {
      var kv = m.substring( 2, m.length - 1 ).split( '.' );
      "torrent" === kv[ 0 ] && globals.templateFields.pushUnique( kv[ 1 ] );
    } );
  }
}

document.observe( "dom:loaded", function() {
  globals.html = document.documentElement;
  globals.head = globals.html.down( "head" );
  globals.icon = globals.head.down( "link" ).href;
  globals.body = globals.html.down( "body" );
  globals.body.addClassName( "normal" );

  const s = window.location.href;
  const i = s.indexOf( "uri=" );
  if( -1 !== i ) {
    globals.body.update( "Uploading ..." );
    upload( decodeURIComponent( s.substring( i + 4 ) ).match( torrentRegExp ) );
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
    const files = Array.from( e.dataTransfer.files );
    upload( isEmpty( files ) ? [ e.dataTransfer.getData( "URL" ) ] : files );
  } );

  doRequest( { url: "shift.json", evalJSON: "force", method: "get", onSuccess: function( response ) {
    globals.shift.defaultSettings = response.responseJSON;
    const cookies = document.cookie.split( ";" );
    const cookie = cookies.find( function( s ) {
      return s.startsWith( COOKIE_KEY );
    } );
    const data = undefined === cookie ? {} : window.atob( cookie.substring( COOKIE_KEY.length ) ).evalJSON();
    globals.shift.settings = Object.extend( Object.extend( {}, globals.shift.defaultSettings ), data );
    for( k in globals.shift.defaultSettings ) {
      var o = globals.shift.defaultSettings[ k ];
      Object.isArray( o ) && globals.shift.settings[ k ].concatUnique( o );
    }
    setStylesheet();
    window.matchMedia && window.matchMedia( darkMedia ).addEventListener( "change", setStylesheet );
    renderDoneSound();
    registerMagnetHandler();

    extractTemplateFields( globals.shift.settings );
  } } );

  // Get first time session data and initialize page.
  doRequest( "session-get", {}, function( response ) {
    function _remove() {
      const fields = Array.prototype.slice.call( arguments );
      fields.each( function( field ) {
        const f = field.split( "." );
        const k = f.shift();
        var o = torrentFields;
        switch( k ) {
        case "session":
          o = sessionFields;
          break;
        default:
          f.unshift( k );
        }
        Object.without( o, f.join( "." ) );
      } )
      Object.values( globals.torrentStatus ).pluck( "columns" ).each( function( columns ) {
        Object.without( columns, fields );
      } );
      globals.staticFields.remove( fields );
    }

    globals.shift.session = getArguments( response );
    globals.version = +globals.shift.session[ "rpc-version" ];
    if( globals.version < 18 ) { // 4.10
      _remove( "files.beginPiece", "files.endPiece", "sequentialDownload" );
    }
    if( globals.version < 17 ) { // 4.00
      _remove( "availability", "file-count", "group", "percentComplete", "primary-mime-type", "trackerList", "trackerStats.sitename" );
      delete pathColumns.total;
    }
    if( globals.version < 16 ) { // 3.00
      globals.table = false;
      _remove( "session.session-id", "labels", "editDate" );
    }
    if( globals.version < 15 ) { // 2.80
      _remove( "etaIdle" );
      fileMenuItems.remove( "Rename" );
    }
    if( globals.version < 14 ) { // 2.40
      _remove( "queuePosition", "isStalled" );
      torrentActionLabels.remove( "Start Now" );
      globals.torrentStatus = {
        "-1": globals.torrentStatus[ "-1" ],
        1: globals.torrentStatus[ 1 ],
        2: globals.torrentStatus[ 2 ],
        4: globals.torrentStatus[ 4 ],
        8: globals.torrentStatus[ 6 ],
        16: globals.torrentStatus[ 0 ]
      }
    }
    if( globals.version < 10 ) { // 2.10
      delete shiftFields.trackers;
      delete globals.shift.settings.trackers;
    }
    if( globals.version < 6 ) { // 1.70
      torrentActionLabels.remove( "Relocate" );
    }

    const h = {};
    for( var k in globals.torrentStatus ) {
      var kc = globals.torrentStatus[ k ].keyCode;
      if( kc ) {
        const a = h[ kc ] || [];
        a.push( k );
        h[ kc ] = a;
      }
    }
    globals.torrentStatusKeyHash = h;

    updatePostSession();
    renderTitle();
    renderPage();
    updateFields( globals.shift.session );

    fetchTorrents( [ "id", "status" ], undefined, function( response ) {
      updateTorrents( response );

      // Get full update for visible torrents and start periodical updaters.
      fetchTorrents( globals.staticFields.concat( globals.updateFields ), filterStatus().pluck( "id" ), function( response ) {
        updateTorrents( response );
        filterTorrents();
        sortTorrents();
        renderTorrents();

        const args = globals.shift.updateTorrents.parametersObject.arguments;
        args.fields = globals.updateFields;
        if( globals.table ) {
          args.format = "table";
        }
        globals.shift.torrentUpdater = doRequest( globals.shift.updateTorrents );
        globals.shift.torrentUpdater.mod = function( args, onSuccess ) {
          const po = this.options.parametersObject;
          for( var k in args ) {
            po.arguments[ k ] = args[ k ];
          }
          this.options.parameters = Object.toJSON( po );
          this.options.onSuccess = onSuccess || globals.shift.updateTorrents.onSuccess;
        }
        globals.shift.torrentUpdater.default = function( extraFields, onSuccess ) {
          this.mod( {
            fields: globals.updateFields.concat( extraFields ).compact(),
            ids: "recently-active"
          }, onSuccess );
        }

        globals.shift.statsUpdater = doRequest( globals.shift.updateStats );
        globals.shift.sessionUpdater = doRequest( globals.shift.updateSession );

        Event.observe( document, "keydown", handleKeyDown );
        Event.observe( document, "keyup", handleKeyUp );
      } );
      globals.activeTableId = "torrentTable";
      showTorrentTable();
      setTorrentsColumnsVisible( globals.torrentStatus[ globals.currentStatus ].columns );
    } );
  } );
} );
