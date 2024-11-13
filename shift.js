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

const STORE_KEY = "shift.settings=";
const RELOAD_KEY = "shift.reload=";
const DAY_MS = 24 * 60 * 60 * 1000;
const HEADER_TRANSMISSION = "X-Transmission-Session-Id";
const UNITS = [ "B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB" ];

const cssMapRexExp = /\.|%[0-9a-z]{2}/gi;
const coverRegExp = /(front|cover|folder)/i;
const imageRegExp = /\.(bmp|gif|jpe?g|png|svg|webp)$/i;
const magnetNameRegExp = /&dn=(.*?)&?/;
const mimeTypeMapRegExp = /^(?!#)(\S*)\s+(\S*)/gm;
const noMatchRegExp = /\0/;
const noWordRegExp = /\\W/ig;
const quotedRegExp = /\w+|"[^"]+"/g;
const rgbaRegExp = /[\.\d]+/g;
const templateRegExp = /\$\{.*?\}/g;
const torrentRegExp = /(\b(https?|ftp|magnet):\/?\/?[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|])/ig;
const trackerRegExp = /(\b(https?|udp):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|])/ig;
const whiteSpaceRegExp = /\s/g;

Object.extend( Object, {
  clear: function( o ) {
    Object.keys( o ).forEach( function( k ) { delete o[ k ] } );
    return o;
  },
  compare: function( a, b ) {
    if( a == b ) return 0;
    if( null == a ) return -1; // undefined too
    if( null == b ) return 1; // undefined too
    if( Array.isArray( a ) && Array.isArray( b ) ) {
      return a.compare( b );
    }
    if( Object.isString( a ) && Object.isString( b ) ) {
      return a.localeCompare( b, "standard", { sensitivity: "case" } );
    }
    return b > a ? -1 : 1;
  },
  comparePath: function( a, b, path ) {
    return Object.compare( Object.getValue( a, path ), Object.getValue( b, path ) )
  },
  copyNestedProperties: function( o, target, keys, nestedKeys ) {
    keys = keys || Object.keys( o );
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
  entries: Object.entries || function( o ) {
    return Object.keys( o ).reduce( function( r, k ) {
      return r.concat( typeof k === "string" && o.propertyIsEnumerable( k ) ? [ [ k, o[ k ] ] ] : [] );
    }, [] )
  },
  equals: Object.equals || function( a, b ) {
    return  Object.isArray( a ) && Object.isArray( b ) ? a.equals( b ) : 0 === Object.compare( a, b );
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
  getValue: function( o, path ) {
    for( var i = 0, path = path.split( "."), l = path.length; i < l && o !== null && undefined !== o; ++i ) {
      o = o[ path[ i ] ];
    };
    return o;
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
  pluck: function( o, keys ) {
    keys = Object.isArray( keys ) ? keys : Array.prototype.slice.call( arguments, 1 );
    return keys.map( function( k ) { return o[ k ] } );
  },
  pull: function( o, k ) {
    if( undefined === o ) {
      return null;
    }
    const r = o[ k ];
    delete o[ k ];
    return r;
  },
  sort: function( o, k ) {
    const t = Object.clone( o );
    Object.clear( o );
    if( k ) {
      Object.entries( t ).sort( function( a, b ) {
        return Object.comparePath( a[ 1 ], b[ 1 ], k );
      } ).each( function( k ) {
        o[ k[ 0 ] ] = k[ 1 ];
      } );
    }
    else {
      Object.keys( t ).sort().each( function( k ) {
        o[ k ] = t[ k ];
      } );
    }
    return o;
  },
  without: function() {
    const keys = Array.from( arguments ).flatten();
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

function isEmpty( s ) {
  return undefined === s || null === s || 0 === s.length || Object.isEmpty( s );
}

Object.extend( Number.prototype, {
  limit: function( min, max ) {
    return Math.min( Math.max( min, this ), max );
  }
} );

Object.extend( Array.prototype, {
  compare: function( b ) {
    var result = 0;
    for( var i = 0, l = Math.min( this.length, b.length ); i < l; ++i ) {
      if( 0 !== ( result = Object.compare( this[ i ], b[ i ] ) ) ) {
        return result;
      }
    }
    return this.length - b.length;
  },
  equals: Array.prototype.equals || function( a ) {
    if( !a ) return false;
    if( this === a ) return true;
    if( this.length != a.length ) return false;

    for( var i = 0, l = this.length; i < l; ++i ) {
      if( !Object.equals( this[ i ], a[ i ] ) ) {
        return false;
      }
    }
    return true;
  },
  find: Array.prototype.find || Array.prototype.detect,
  findIndex: Array.prototype.findIndex || function( f ) {
    var foundIndex = -1;
    const self = this;
    this.find( function( i, index ) {
      const found = f( i, index, self );
      if( found ) {
        foundIndex = index;
      }
      return found;
    } );
    return foundIndex;
  },
  hideAll: Enumerable.invoke.curry( "hide" ),
  ids: Enumerable.pluck.curry( "id" ),
  includes: Array.prototype.includes || Array.prototype.include,
  indexify: function() {
    for( var i = 0, l = this.length; i < l; ++i ) {
      this[ i ]._i = i;
    }
    return this;
  },
  insert: function( i ) {
    this.length = i > this.length ? i : this.length;
    i = i < 0 ? this.length : i;
    this.splice.apply( this, [ i, 0 ].concat( Array.prototype.slice.call( arguments, 1 ) ) );
    return this;
  },
  isEmpty: function() {
    return 0 === this.length;
  },
  pack: function() {
    return this.replace( this.compact() );
  },
  partitionBy: function( property ) {
    const result = [];
    const indexMap = [];
    for( var i = 0, l = this.length; i < l; ++i ) {
      const o = this[ i ];
      const k = Object.isFunction( property ) ? property( o ) : o[ property ];
      indexMap.pushUnique( k );
      const index = indexMap.indexOf( k );
      result[ index ] ? result[ index ].push( o ) : result.push( [ o ] );
    }
    return result;
  },
  pluckUnique: function( k ) {
    return this.reduce( function( r, o ) {
      return r.pushUnique( o[ k ] );
    }, [] );
  },
  pushUnique: function( e ) {
    if( 1 < arguments.length ) {
      e = Array.from( arguments );
    }
    if( Object.isArray( e ) ) {
      for( var i = 0, l = e.length; i < l; ++i ) {
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
    if( Object.isArray( e ) ) {
      for( var i = 0, l = e.length; i < l; ++i ) {
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
  replace: function( a ) {
    Array.prototype.splice.apply( this, [ 0, this.length ].concat( a ) );
    return this;
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
  sortByProperty: function( property, ascending, isArray ) {
    ascending = ascending ? 1 : -1;
    if( isArray ) {
      this.each( function( e ) {
        var o = e[ property ];
        if( undefined === o || !Object.isArray( o ) || 0 === o.length ) {
          delete e._a;
          return;
        }
        e._a = e._a || o.slice().sort().join();
      } );
      property = "_a";
    }
    return this.sort( function( a, b ) {
      const result = Object.compare( a[ property ], b[ property ] );
      return 0 === result ? undefined === a._i ? 0 : a._i - b._i : result * ascending;
    } );
  },
  squeak: function( e ) { // Like push but returns element instead of length.
    this.push( e );
    return e;
  },
  withoutArray: function( a ) {
    return this.slice().remove( a );
  }
} );

Object.extend( String.prototype, {
  dequote: function() {
    return this.replace( /^\"(.+)\"$/, "$1" );
  },
  hash: String.prototype.hash || function() {
    for( var i = 0, h = 9, l = this.length; i < l; ++i ) {
      h = Math.imul( h ^ this.charCodeAt( i ), 9 ** 9 );
    }
    return h ^ h >>> 9
  },
  includes: String.prototype.includes || function( s ) {
    return -1 !== this.indexOf( s );
  },
  quote: function() {
    return this.includes( " " ) ? '"' + this + '"' : this;
  },
  replaceAll: String.prototype.replaceAll || function( s, r ) {
    return this.replace( s.toRegExp( !(s instanceof RegExp ) ), r );
  },
  resolve: function( t, r ) {
    t = t || globals.currentTorrent;
    return this.replaceAll( templateRegExp, r || function replacer( m ) {
      const s = globals.shift;
      const kv = m.substring( 2, m.length - 1 ).split( "." );
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
          result = s.settings.screenshotMode ? v.capitalize() : t && t[ v ];
          break;
        default:
          return m;
      }
      return result && result.resolve( t, r );
    } );
  },
  substringTo: function( s ) {
    const i = this.indexOf( s );
    return -1 === i ? this : this.substring( 0, i );
  },
  toCSS: function() {
    return encodeURIComponent( this ).toLowerCase().replace( cssMapRexExp, "_" );
  },
  toRegExp: function( c ) {
    return false === c ? this : new RegExp( this, "g" );
  }
} );

Object.extend( Element.prototype, {
  change: function() {
    return this.trigger( "change" );
  },
  dblclick: function() {
    return this.dispatchEvent( new MouseEvent( "dblclick", {
      view: window,
      bubbles: true,
      cancelable: true,
    } ) );
  },
  getComputedStyle: function( s ) {
    const body = document.body;
    const connected = this.isConnected || body.compareDocumentPosition( this ) & Node.DOCUMENT_POSITION_CONTAINS;
    !connected && body.appendChild( this );
    const result = window.getComputedStyle( this ).getPropertyValue( s );
    !connected && body.removeChild( this );
    return result;
  },
  getPosition: function() {
    var e = this, x = 0, y = 0;
    while( e ) {
      x += e.offsetLeft - e.scrollLeft + e.clientLeft;
      y += e.offsetTop - e.scrollTop + e.clientTop;
      e = e.offsetParent;
    }
    return { x: x, y: y };
  },
  indexOf: function( e ) {
    return Array.prototype.indexOf.call( this.children, e );
  },
  setId: function( id ) {
    this.setAttribute( "id", id );
    return this;
  },
  setReadOnly: function( readonly ) {
    this[ false === readonly ? "removeAttribute" : "setAttribute" ]( "readonly", "readonly" );
    return this;
  },
  setSpan: function( span ) {
    this.setAttribute( "COL" === this.tagName ? "span" : "colspan", span );
    return this;
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

Object.extend( HTMLSelectElement.prototype, {
  includes: HTMLSelectElement.prototype.includes || function( v ) {
    for ( var i = 0, l = this.options.length; i < l; i++ ) {
      if ( this.options[ i ].value == v ) {
        return true;
      }
    }
    return false;
  },
} );

Object.extend( Event.prototype, {
  toString: function() {
    return "@" + this.timeStamp + ": " + this.currentTarget.nodeName + " " + this.target.nodeName + "." + this.type;
  }
} );

Object.extend( Function.prototype, {
  uncurry: function() {
    return this.call.bind( this );
  }
} );

function preventBubbling( e ) {
  e && e.stopPropagation();
}

function preventDefault( e ) {
  e && e.stop();
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

function retrieve( id ) {
  const c = document.cookie.split( "; " ).find( function( s ) {
    return s.startsWith( id );
  } );
  return c && c.substring( id.length );
};

const rd = ( function() {
  const s = retrieve( RELOAD_KEY );
  if( isEmpty( s ) ) {
    return undefined;
  }

  document.cookie = RELOAD_KEY + "; expires=0; SameSite=strict";
  const rd = new Date( +s );
  console.log( "Exited at " + rd.toISOString() );
  return rd;
} )();

function store( data, clear, local ) {
  const d64 = window.btoa( Object.toJSON( data ) );
  if( local = undefined === local ? globals.shift.defaultSettings.localStorageEnabled : local ) {
    clear ? localStorage.removeItem( STORE_KEY ) : localStorage.setItem( STORE_KEY, d64 );
    return data;
  }
  const date = new Date();
  date.setTime( date.getTime() + 365 * DAY_MS );
  document.cookie = STORE_KEY + d64 + "; expires=" + ( clear ? 0 : date ) + "; SameSite=strict";
  return data;
}

function sh( show ) {
  return show ? "show" : "hide";
}

function createId( prefix, label ) {
  return prefix + label.toLowerCase().replace( whiteSpaceRegExp, "_" ).underscore();
}

function rE( tag, attributes, content ) {
  attributes = Object.isString( attributes ) ? { "class": attributes } : attributes || {};
  if( attributes.style && !Object.isString( attributes.style ) ) {
    attributes.style = Object.entries( attributes.style ).invoke( "join", ": " ).join( "; " );
  }
  content = content || Object.pull( attributes, "content" );
  const h = [ "change", "click", "focus", "keydown", "keypress" ].reduce( function( r, k ) {
    const v = Object.pull( attributes, k );
    v && ( r[ k ] = v );
    return r;
  }, {} );
  const e = new Element( tag, attributes ).insert( content || "" );
  Object.keys( h ).each( function( k ) {
    e.observe( k, h[ k ] );
  } );
  return e;
}

function rA( href, text, attributes ) {
  return rE( "a", Object.extend( { href: href, target: "_blank" }, attributes ), undefined === text ? unescape( href ) : text );
}

function rB( attributes, click ) {
  attributes = Object.isString( attributes ) ? { value: attributes } : attributes;
  attributes = Object.extend( { "class": "apply", type: "button", value: "Apply", click: click }, attributes );
  return rE( "button", attributes, Object.pull( attributes, "value" ) ).addClassName( "styled" );
}

const rC = rE.curry( "td" );
const rH = rE.curry( "th" );
const rD = rE.curry( "div" );
function rI( value, attributes ) {
  return rE( "input", Object.extend( { "class": "styled", keydown: preventBubbling, type: "text", value: undefined === value ? "" : value }, attributes ) );
}

function rL( content, attributes ) {
  return rE( "label", attributes, content );
}

function rCol( c ) {
  return rE( "col", c ? { "class": c } : {} );
}

function rM( label, click, attributes ) {
  const id = createId( "menu_", label );
  attributes = Object.extend( { click: click, content: label, id: id, tabindex: 0 }, attributes );
  if( click = click || Object.pull( attributes, "click" ) ) {
    globals.functionMap[ id ] = click;
  }
  return rE( "li", attributes );
}

function rO( o ) {
  return rE( "option", o ).update( o.text ? o.text : o.value );
}

const rP = rE.curry( "p" );
const rR = rE.curry( "tr" );
const rS = rE.curry( "span" );
const rT = rE.curry( "textarea" );
const rSpacer = rS.curry( { "class": "spacer" }, "|" );

function rLed( v, attributes ) {
  attributes = attributes || {};
  attributes.tabindex = 0;
  return Object.defineProperty( Object.extend( rE( "led", attributes ), {
    _change: function( e ) {
    },
    _value: false,
    setValue: function( v ) {
      this.value = v
      return this;
    },
    toggle: function( v, e ) {
      this.setValue( undefined === v ? !this._value : Boolean( v ) );
      this._change( e );
      return this;
    },
    makeToggle: function( f ) {
      this._change = ( f || this._change ).bind( this );
      return this._observe( this.toggle.curry( undefined ).bind( this ) );
    },
    _radio: function( e ) {
      for( var i = 0, l = this._radios.length; i < l; ++i ) {
        const r = this._radios[ i ];
        r.value = r === e.target;
        this._index = r === e.target ? i : ( this._index || 0 );
      }
      this._change( e );
    },
    _makeRadio: function( e ) {
      return e._observe( this._radio.bind( this ) );
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
      this._change = handler;
      return this;
    },
    _observe: function ( f ) {
      return this.observe( "click", f ).observe( "keydown", function( e ) {
        if( 32 === e.keyCode ) { // Space
          e.stop();
          f( e );
        }
      } );
    }
  } ), "value", {
    get() {
      return this._value;
    },
    set( v ) {
      this._value = "none" !== ( v = true === v ? "normal" : v || "none" );
      const _match = function( o ) {
        var found = false;
        for( var k in o ) {
          this.toggleClassName( k, v === k );
          found |= v === k;
        }
        if( found ) {
          this.update( o[ v ].label );
        }
        return found;
      }.bind( this );
      _match( folderStatus ) || _match( filePriority ) || _match( uploadStatus ) || this.update( v );
      return this._value;
    }
  } ).setValue( v );
}

function renderTableElements() {
  return {
    columns: rE( "colgroup" ),
    header: rE( "thead" ),
    body: rE( "tbody" ),
    footer: rE( "tfoot" )
  }
}

function rTable( id, t ) {
  return rE( "table", { id: id } ).insert( Object.values( t || renderTableElements() ) );
}

function normalizeOptions( options ) {
  const _vt = function( v, t ) {
    return { value: v, text: t };
  }
  const normalized = [];
  if( Object.isArray( options ) ) {
    for( var i = 0, l = options.length; i < l; ++i ) {
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

function renderSelect( args ) {
  args = args || {};
  if( 1 < arguments.length ) {
    args = Array.from( arguments );
  }
  if( Object.isArray( args ) ) {
    args = { options: normalizeOptions( args ) }
  }
  const options = Object.pull( args, "options" ) || [];
  const select = rE( "select", Object.extend( { "class": "styled", "keydown": preventBubbling }, args ) ).insert( options.map( rO ) );
  if( undefined !== args.value ) {
    select.value = args.value;
  }
  select.selectedIndex = -1 === select.selectedIndex ? 0 : select.selectedIndex;

  return select;
}

function renderPathSelect( path, cell ) {
  var div = cell && cell.down( "div.pathselect" );
  if( div ) {
    div.down().value = path;
    return div;
  }
  const l = "\u2026";
  const dir = globals.shift.session[ "download-dir" ];
  const select = renderSelect( [].pushUnique( globals.shift.settings.paths, dir, path || dir, l ) );
  const input = rI();
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

function copyToClipboard( s ) {
  document.observe( "copy", function( e ) {
    e.clipboardData.setData( "text/plain", s );
    e.stop();
    document.stopObserving( "copy" );
  } );
  document.execCommand( "copy" );
}

function copyObjectToClipboard( o ) {
  copyToClipboard( JSON.stringify( Object.sort( o ), null, 2 ) );
}

function persistPath( path ) {
  const settings = globals.shift.settings;
  const l = settings.paths.length;
  settings.paths.pushUnique( path );
  settings.paths.length !== l && settings.pathsPersistent && store( settings );
  return path;
}

// riffwave by Pedro Ladaria <pedro.ladaria at Gmail dot com>
function riffwave( data ) {
  function encodeFastBase64( src ) {
    const _c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    const _l = [];
    for( var i = 0; i < 4096; ++i ) {
      _l[ i ] = _c[ i >> 6 ] + _c[ i & 0x3F ];
    }

    var l = src.length;
    const dst = [];
    var i = 0;
    while( l > 2 ) {
      var n = src[ i ] << 16 | src[ i + 1 ] << 8 | src[ i + 2 ];
      dst.push( _l[ n >> 12 ] + _l[ n & 0xFFF ] );
      l-= 3;
      i+= 3;
    }
    if( l > 0 ) {
      var n1 = ( src[ i ] & 0xFC ) >> 2;
      var n2 = ( src[ i ] & 0x03 ) << 4;
      if( l > 1 ) n2 |= ( src[ ++i ] & 0xF0 ) >> 4;
      dst.push( _c[ n1 ] );
      dst.push( _c[ n2 ] );
      if( 2 === l ) {
        var n3 = ( src[ i++ ] & 0x0F ) << 2;
        n3 |= ( src[ i ] & 0xC0 ) >> 6;
        dst.push( _c[ n3 ] );
      }
      if( 1 === l ) {
        dst.push( "=" );
      }
      dst.push( "=" );
    }
    return dst.join( "" );
  }

  function split16bitArray( data ) {
    var r = [];
    var j = 0;
    for( var i = 0, l = data.length; i < l; ++i ) {
      r[ j++ ] = data[ i ] & 0xFF;
      r[ j++ ] = data[ i ] >> 8 & 0xFF;
    }
    return r;
  }

  function strToArray( s ) {
    return s.toArray().map( function( e ) { return e.charCodeAt() & 0xFF } );
  }

  function u32ToArray( i ) {
    return [ i & 0xFF, i >> 8 & 0xFF, i >> 16 & 0xFF, i >> 24 & 0xFF ];
  }

  function u16ToArray( i ) {
    return [ i & 0xFF, i >> 8 & 0xFF ];
  }

  const _h = {              // OFFS SIZE NOTES
    chunkId:       "RIFF",  //    0    4 "RIFF" = 0x52494646
    chunkSize:     0,       //    4    4 36 + SubChunk2Size = 4+(8+SubChunk1Size)+(8+SubChunk2Size)
    format:        "WAVE",  //    8    4 "WAVE" = 0x57415645
    subChunk1Id:   "fmt ",  //   12    4 "fmt " = 0x666d7420
    subChunk1Size: 16,      //   16    4 16 for PCM
    audioFormat:   1,       //   20    2 PCM = 1
    numChannels:   1,       //   22    2 Mono = 1, Stereo = 2...
    sampleRate:    8000,    //   24    4 8000, 44100...
    byteRate:      0,       //   28    4 SampleRate*NumChannels*BitsPerSample/8
    blockAlign:    0,       //   32    2 NumChannels*BitsPerSample/8
    bitsPerSample: 8,       //   34    2 8 bits = 8, 16 bits = 16
    subChunk2Id:   "data",  //   36    4 "data" = 0x64617461
    subChunk2Size: 0        //   40    4 data size = NumSamples*NumChannels*BitsPerSample/8
  };

  _h.blockAlign = _h.numChannels * _h.bitsPerSample >> 3;
  _h.byteRate = _h.blockAlign * _h.sampleRate;
  _h.subChunk2Size = data.length * _h.bitsPerSample >> 3;
  _h.chunkSize = 36 + _h.subChunk2Size;

  return Object.isArray( data ) ? "data:audio/wav;base64," + encodeFastBase64( [].concat(
    strToArray( _h.chunkId ),
    u32ToArray( _h.chunkSize ),
    strToArray( _h.format ),
    strToArray( _h.subChunk1Id ),
    u32ToArray( _h.subChunk1Size ),
    u16ToArray( _h.audioFormat ),
    u16ToArray( _h.numChannels ),
    u32ToArray( _h.sampleRate ),
    u32ToArray( _h.byteRate ),
    u16ToArray( _h.blockAlign ),
    u16ToArray( _h.bitsPerSample ),
    strToArray( _h.subChunk2Id ),
    u32ToArray( _h.subChunk2Size ),
    16 === _h.bitsPerSample ? split16bitArray( data ) : data ) ) : "";
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
  return response.responseJSON && response.responseJSON.arguments;
}

function success( response ) {
  return response.responseJSON && "success" === response.responseJSON.result;
}

function onFailure( response ) {
  globals.lastResponse = response;
  if( 409 === response.status ) {
    // All requests use a reference to this array.
    globals.requestHeaders[ 1 ] = response.getHeader( HEADER_TRANSMISSION );
    return true;
  }
  if( 500 <= response.status ) {
    reload();
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

function reload() {
  window.location.reload( true );
}

function getVisibleSibling( e, s, dir ) {
  while( e = e[ dir ? "next" : "previous" ]( s ) ) {
    if( e.visible() ) {
      return e;
    }
  }
  return null;
}

function keyPriority( priority ) {
  var row = document.activeElement.up( "tr" );
  if( row && row.up( "#fileBody" ) ) {
    setFileRowPriority( row, priority );
  }
}

function removeLabel( e ) {
  const t = $( e.target );
  const labels = t.up( "span.labels" );
  if( !labels ) {
    return;
  }

  const d = labels._data;
  d.remove( t.title ).renderLabels( d.indexOf( t.title ).limit( -1, d.length - 2 ) );
}

const globals = {
  columnKeys: [],
  currentStatus: 4,
  dynaLabels: [],
  errorStrings: [ "", "Any" ],
  filters: [],
  functionMap: {},
  hashIndex: 0,
  headerState: 0,
  init: true,
  keys: {
    "default": {
      27: closePopup, // Esc
      107: function( e ) { // +
        var button;
        preventDefault( e );
        if( $( "popups" ).visible() ) {
          if( $( "popupAdd" ).visible() ) {
            globals.dialogs.add.add.click();
          }
        }
        else if( button = getVisible( "popup.dialog button.apply" ) ) {
          button.click();
        }
        else {
          showAddPopup();
        }
      },
      191: function( e ) { // /
        if( e.shiftKey ) { // ?
          if( $( "popupAbout" ).visible() ) {
            closePopup( e );
          }
          else {
            preventDefault( e );
            globals.functionMap[ "menu_about" ]( e );
          }
        }
      }
    },
    "detailsTable": {
      70: "menu_files", // f
      80: "menu_peers", // p
      84: "menu_trackers", // t
      27: "menu_torrents", // Esc
      46: removeLabel // Delete
    },
    "fileTable": {
      80: "menu_peers", // p
      84: "menu_trackers", // t
      68: "menu_details", // d
      27: "menu_torrents", // Esc
      38: function( e ) { // Up
        var oldrow = document.activeElement.up( "tr" );
        if( oldrow && oldrow.up( "#fileBody" ) ) {
          var row = getVisibleSibling( oldrow, "tr", 40 === e.keyCode );
          if( !row ) {
            return;
          }
          row.down( "led" ).focus();
          centerVertically( row );
        }
      },
      39: function( e ) { // Right
        var led = document.activeElement;
        led && led.up( "#fileBody" ) && led.click();
      },
      40: 38,
      48: "fileTable", // 0..9
      32: keyPriority.curry( undefined ), // Space
      61: keyPriority.curry( "high" ), // =
      173: keyPriority.curry( "low") // -
    },
    "peerDiv": {
      70: "menu_files", // f
      84: "menu_trackers", // t
      68: "menu_details", // d
      27: "menu_torrents", // Esc
      48: "peerTable" // 0..9
    },
    "sessionTable": {
      27: "menu_torrents", // Esc
      192: "menu_shift" // `
    },
    "shiftTable": {
      27: "menu_torrents", // Esc
      46: removeLabel, // Delete
      192: "menu_torrents" // `
    },
    "torrentTable": {
      32: function( e ) { // Space
        var el = document.activeElement.up( "tr" );
        if( el && el.up( "#torrentBody" ) ) {
          el.click();
        }
      },
      38: function( e ) { // Up
        var oldrow = document.activeElement.up( "tr" );
        if( oldrow && oldrow.up( "#torrentBody" ) ) {
          var row = getVisibleSibling( oldrow, "tr", 40 === e.keyCode );
          if( !row ) {
            return;
          }
          oldrow.toggleClassName( "active", false );
          row.toggleClassName( "active", true );
          row.down( "led" ).focus();
          centerVertically( row );
          var torrent = getTorrent( row.id, true );
          if( undefined !== globals.select ) {
            torrent.toggleSelect( globals.select );
          }
        }
      },
      39: function( e ) { // Right
        var led = document.activeElement;
        led && led.up( "#torrentBody" ) && led.click();
      },
      40: 38,
      46: function( e ) { // Delete
        const target = $( e.target );
        if( globals.shift.settings.deleteTorrentLabelByKey && target.hasClassName( "border" ) ) {
          return fixLabels( false, target.title, getRowTorrent( target ) );
        }
        handleTorrentMenuClick( { target: { id: e.shiftKey ? "trash" : "remove" } } );
      },
      48: "torrentTable", // 0..9
      65: function( e ) { // a,c,d,s,u
        const kc = e.keyCode;
        const h = globals.torrentStatusKeyHash[ kc ];
        globals.hashIndex = kc === globals.lastKey ? ( globals.hashIndex + 1 ) % h.length : 0;
        globals.lastKey = kc;
        $( "statusSelect" ).setValue( h[ globals.hashIndex ] ).change();
      },
      192: "menu_session", // `
      219: storeSelection, // [
      220: function( e ) { // \
        selectTorrents( e.shiftKey ? "deselect visible" : "select visible" );
      },
      221: restoreSelection // ]
    },
    "trackerDiv": {
      27: "menu_torrents", // Esc
      48: "trackerTable", // 0..9
      70: "menu_files", // f
      80: "menu_peers", // p
      68: "menu_details" // d
    }
  },
  magnets: [],
  mimeTypes: {},
  removed: [],
  requestHeaders: [ HEADER_TRANSMISSION, "" ],
  rpcUrl: "../rpc",
  selectedIds: [],
  table: true,
  templateFields: [ "id", "files" ],
  shift: {
    settings: {},
    version: "1.2",
    updateTorrents: newPeriodicalUpdater( "torrent-get", 5, function( response ) {
      if( !success( response ) ) {
        console.log( "Unsuccesful response." );
        return;
      }
      const args = getArguments( response );
      args.removed && args.removed.length && getQueuePositions( args.removed );
      if( args.torrents ) {
        filterTorrents( updateTorrents( response ) );
        if( $( "torrentTable" ).visible() ) {
          if( globals.torrentStatusChanged ) {
            setTorrentsColumnsVisible();
          }
          sortTorrents();
          renderTorrents();
        }
      }
    }, {}, "recently-active" ),

    updateStats: newPeriodicalUpdater( "session-stats", 5, function( response ) {
      const args = getArguments( response );
      if( Object.comparePath( args, globals.shift.sessionStats, "current-stats.secondsActive" ) < 0 ) {
        reload();
      }
      updateFields( globals.shift.sessionStats = args );
      renderTitle();
    } ),

    updateSession: newPeriodicalUpdater( "session-get", 60, function( response ) {
      updateFields( globals.shift.session = getArguments( response ) );
    } )
  },
  staticFields: [],
  torrentColumnHash: [],
  torrentColumns: {},
  torrentDetailsUpdateKeys: [ "id" ],
  torrentFieldKeys: [],
  torrentHash: [],
  torrents: [],
  torrentDefaults: {
    _selected: false,
    _displayed: false
  },
  torrentStatus: [
    [ "All", 65 ], // a
    [ "Stopped", 83 ], // s
    [ "Check waiting", 67 ], // c
    [ "Checking", 67 ], // c
    [ "Download waiting", 68 ], // d
    [ "Downloading", 68 ], // d
    [ "Seed waiting", 85 ], // u
    [ "Seeding", 85 ] // u
  ].reduce( function( r, e, i ) {
    r[ i - 1 ] = { label: e[ 0 ], keyCode: e[ 1 ], columns: {}, fields: [] };
    return r;
  }, {} ),
}
const ts = globals.torrentStatus;
ts[ 0 ].onChange = function() { // Do extra handling when "Stopped" is selected.
  globals.shift.torrentUpdater.mod( {
    fields: [ "id", "status", "error", "errorString" ],
    ids: filterStatus().ids()
  }, function( response ) {
    globals.shift.torrentUpdater.default();
    globals.shift.updateTorrents.onSuccess( response );
  } )
}

const comparators = {
  "<": function( x, y ) { return x < y },
  "<=": function( x, y ) { return x <= y },
  "==": function( x, y ) { return x == y },
  ">=": function( x, y ) { return x >= y },
  ">": function( x, y ) { return x > y }
}
const defaultOptions = normalizeOptions( Object.keys( comparators ) );

function _l( o ) {
  return Object.keys( o ).reduce( function( r, k ) { r[ k ] = { label: o[ k ] }; return r }, {} )
}

const folderStatus = _l( { "open": "&#9662;", "close": "&#9656;" } );
const folderStatusKeys = Object.keys( folderStatus );

const filePriority = _l( { "high": "+", "normal": " ", "low": "&ndash;", "none": "" } );
const filePriorityKeys = Object.keys( filePriority );
function getPriority( f ) {
  return filePriorityKeys[ f.wanted ? 1 - f.priority : 3 ];
}
const uploadStatus = _l( { "loading": "&#9656;", "loaded": "&#9991;", "uploading": "&#9652;", "added": "+", "duplicate": "&#10006;" } );
const fileMenuItems = [ "Rename" ];

const sessionFields = {
  "blocklist-size": { _ro: true },
  "config-dir": { _ro: true },
  "download-dir": { render: renderPathSelect },
  "download-dir-free-space": { _ro: true, render: renderSize },
  "encryption": { values: normalizeOptions( [ "required", "preferred", "tolerated" ] ) },
  "incomplete-dir": { render: renderPathSelect },
  "peer-port": { action: function( row, keyCell ) { // Actions return true if handling should continue.
    keyCell.insert( rLed( false, { id: "port-is-open", title: "Checking", "class": "checking" } ).setReadOnly() );
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

function dragEnterLabel( e ) {
  delete e.target._offset;
}

function dragOverLabel( checkId, e ) {
  e.stop();
  const d = globals.drag;
  if( !d ) {
    return;
  }

  if( checkId && !globals.dragSource.id ) {
    return;
  }

  var after;
  this._offset = this._offset || this.getPosition().x;
  for( var i = 0, c = this.children, l = c.length; i < l; ++i ) {
    const l = c[ i ];
    if( d !== l && e.clientX <= l.offsetLeft + l.offsetWidth / 2 + this._offset ) {
      after = l;
      break;
    }
  }
  this.insertBefore( d, after );
}

function labelEditor( labels, content, pick ) {
  this.value = labels = labels.clone();
  const l = renderLabels( labels );
  l.observe( "dragenter", dragEnterLabel );
  l.observe( "dragover", dragOverLabel.curry( false ).bind( l ) );
  const input = rI();
  const select = pick && renderSelect( pick );
  return [ l, renderLabel( "Trash", true, true, "l0" ), input, select, rB( "Add", function( e ) {
    labels.pushUnique( input.value || pick && select.value || null ).renderLabels();
  } ) ]
}

const torrentFields = {
  "activityDate": { render: renderDateTime },
  "addedDate": { nup: true, render: renderDateTime },
  "availability": {
    render: renderAvailability,
    sss: function( availability ) {
      const a = [];
      for( var i = 0, l = availability.length; i < l; ++i ) {
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
    nup: true,
    render: function( comment ) {
      return comment.replace( torrentRegExp, "<a href=\"$1\" target=\"_blank\">$1</a>" );
    },
    sss: true
  },
  "corruptEver": {
     sb: 12,
    _column: { sb: 12, order: 5, label: "Corrupt", render:renderSizeCell }, render: renderSize },
  "creator": { nup: true, sss: true },
  "dateCreated": { nup: true, render: renderDateTime },
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
  "error": { sb: 2 },
  "errorString": {
    sb: 0,
    _column: {
      sb: 2, order: 3,
      label: "Error",
      filter: {
        active: function() {
          return !isEmpty( this.value );
        },
        cost: 5,
        match: function( torrent ) {
          return torrent.errorString === this.value || "Any" === this.value && torrent.errorString;
        },
        render: renderErrorFilter,
        renderRefreshOption: new Option( "", "refresh" ).update( "&#8635;" ),
        value: ""
      }
    } },
  "eta": { sb: 33 },
  "etaIdle": {},
  "file-count": {},
  "files": {
    "beginPiece": {},
    "bytesCompleted": {},
    "endPiece": {},
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
  "hashString": { nup: true, sss: true },
  "haveUnchecked": { render: renderSize },
  "haveValid": { render: renderSize },
  "honorsSessionLimits": { edit: true },
  "id": { sb: 255, _ignore: true },
  "isFinished": {},
  "isPrivate": { nup: true },
  "isStalled": {},
  "leftUntilDone": { render: renderSize },
  "labels": {
    sb: 0, static: true,
    _column: {
      sb: 255, order: 14,
      dblclick: function( e, torrent, te ) {
        $( "l_labels" ).down( "led" ).toggle( $( "labelFilterInput" ).addFilterLabel( e ).value );
        return true;
      },
      render: false,
      renderAdvanced: function( torrent, d, k, row, cell ) {
        const labels = torrent[ k || "labels" ];
        if( !labels || !labels.length ) {
          return;
        }

        if( labels._node ) {
          labels.renderLabels();
          return;
        }

        row = row || torrent._node;
        if( cell = row.down( ".name" ) ) {
          cell.insert( { top: renderLabels( labels, false, !globals.shift.settings.deleteTorrentLabelByKey ) } );
        }
      },
      filter: {
        active: function() {
          return !isEmpty( this.value );
        },
        cost: 10,
        value: [],
        render: renderLabelFilter,
        match: function( torrent ) {
          var result = !this.or;
          for( var i = 0, l = this.value.length; i < l; ++i ) {
            const found = torrent.labels && torrent.labels.includes( this.value[ i ] );
            result = this.or ? result || found : result && found;
            if( this.or === found ) {
              break;
            }
            else {
              continue;
            }
          }
          return this.exclude ? !result : result;
        }
      }
    },
    edit: true,
    getValue: function( cell ) {
      return cell.down( "span.labels" )._data;
    },
    render: renderLabels,
    renderAdvanced: function( labels, content ) {
      const e = labelEditor( labels, content, globals.shift.settings.labels );
      return e;
    }
  },
  "location": { _ignore: true },
  "magnetLink": { nup: true, render: function( link ) { return rA( link ) }, sss: true },
  "manualAnnounceTime": {},
  "maxConnectedPeers": {},
  "menu":{
    sb: 0, _ignore: true,
    _column: {
      sb: 255, order: 0,
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
      click: function( e, torrent ) {
        globals.currentTorrent = torrent;
        $( "recycle" )[ sh( globals.shift.settings.torrentLinkEnabled && 3 <= torrent.error ) ]();
        showPopup( "popupTorrent", handleTorrentMenuClick, e );
        return true;
      }
    }
  },
  "metadataPercentComplete": { nup: true, render: renderPercentage, value: 0 },
  "name": {
    sb: 0, static: true,
    nup: true,
    _column: {
      sb: 255, order: 13,
      render: function( name, torrent, ignore, cell ) {
        if( !cell ) {
          return name;
        }

        if( 15 < globals.version ) {
          cell.setSpan( 2 );
        }

        var matchedName = false;
        var matchedMagnet = false;
        var matchedLabel = false;
        Array.from( cell.childNodes ).reverse().each( function( n ) {
          if( torrent.name === n.textContent ) {
            matchedName = true;
            return;
          }
          if( n.textContent.includes( torrent.hashString ) ) {
            matchedMagnet = true;
            if( torrent.isMagnet() ) {
              return;
            }
          }
          if( "I" === n.tagName && torrent.isMagnet() ) {
            return;
          }
          if( "SPAN" === n.tagName && !isEmpty( torrent.labels ) ) {
            matchedLabel = true;
            return;
          }
          cell.removeChild( n );
        } );


        if( torrent.isMagnet() && torrent.hashString && !matchedMagnet ) {
          const s = "<i class=\"fa fa-magnet fa-rotate-90\"></i> [" + torrent.hashString + "] ";
          cell.insert( matchedLabel ? { 1: s } : { top: s } );
        }

        if( name && !matchedName ) {
          cell.insert( name );
        }
        return;
      },
      mouseover: function( e, torrent, te ) {
        if( !globals.shift.settings.contentMagic || te.cell.nomouseover ) {
          return;
        }
        if( te.cell.down( "img" ) ) {
          te.cell.addClassName( "hover" );
          return;
        }

        te.cell.nomouseover = true;
        const _img = function( files ) {
          const images = files.filter( function( file ) {
            return imageRegExp.test( file.name );
          } );
          if( !images.length ) {
            return;
          }
          const covers = images.filter( function( file ) {
            return coverRegExp.test( file.name );
          } ).sort( function( fa, fb ) { return fa.name.length < fb.name.length } );

          const file = covers.find( isDone ) || images.find( isDone ) || covers[ 0 ] || images[ 0 ];
          var src = globals.shift.settings.screenshotMode ? "cover.png" : rFileLink( file, torrent ).href;
          if( src ) {
            te.cell.addClassName( "hover" );
            te.cell.insert( { top: rE( "img", { "class": "hover", src: src, style: "margin-left: " + ( torrent.id % 8 ) * 32 + "px" } ) } );
            delete te.cell.nomouseover;
          }
        }

        if( torrent.files ) {
          _img( torrent.files );
        }
        else {
          fetchTorrents( globals.templateFields, [ torrent.id ], function( response ) {
            if( success( response ) ) {
              filterTorrents( updateTorrents( response ) );
              _img( torrent.files );
            }
          } );
        }
      },
      filter: {
        active: function() {
          return !isEmpty( this.value ) || this.value instanceof RegExp;
        },
        cost: 6,
        value: "",
        render: renderNameFilter,
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
    sb: 125, static: true,
    _column: {
      sb: 127, order: 6,
      label: "Done",
      render: renderPercentDone,
      defaultOrder: false,
      filter: {
        active: function() { // 0.0 <= this.value <= 1.0
          return 0.0 < this.value && this.value < 1.0 ||
            0.0 === this.value && Object.pluck( comparators, "==", "<=", ">" ).includes( this.comparator ) ||
            1.0 === this.value && Object.pluck( comparators, "==", ">=", "<" ).includes( this.comparator );
        },
        cost: 2,
        comparatorLabel: "<=",
        comparator: comparators[ "<=" ],
        value: 1.0,
        render: renderPercentDoneFilter,
        match: function( torrent ) {
          return undefined === torrent.percentDone || this.comparator( torrent.percentDone, this.value );
        }
      }
    },
    render: renderPercentage
  },
  "pieces": { render: renderPieces },
  "pieceCount": { nup: true },
  "pieceSize": { nup: true, render: renderSize },
  "primary-mime-type": {
    sb: 0, static: true,
    nup: true,
    render: function( mimeType, cell ) {
      if( cell ) {
        renderMimeTypeColumn( mimeType, undefined, undefined, cell );
        cell.title = "";
        cell.insert( mimeType );
      }
      return undefined;
    },
    _column: {
      sb: 255, order: 12,
      label: "T",
      click: function( e, torrent, te ) {
        if( !globals.shift.settings.contentMagic || "IMG" !== e.target.nodeName || isEmpty( globals.shift.settings ) ) {
          return false;
        }
        var link = e.findElement( "a" );
        if( !link ) {
          const _link = function( files ) {
            const extension = globals.mimeTypes[ torrent[ "primary-mime-type" ] ];
            var file = files.sortByProperty( "name", true ).find( function( file ) {
              return file.name.endsWith( extension );
            } );
            link = rFileLink( file || files[ 0 ] );
            if( link ) {
              e.target.replace( link );
              link.update( e.target );
              link.click();
            }
          }
          if( torrent.files ) {
            _link( torrent.files );
          }
          else {
            fetchTorrents( globals.templateFields, [ torrent.id ], function( response ) {
              if( success( response ) ) {
                filterTorrents( updateTorrents( response ) );
                _link( torrent.files );
              }
            } );
          }
        }
        return true;
      },
      render: renderMimeTypeColumn
    }
  },
  "priorities": { _ignore: true },
  "queuePosition": {
     sb: 0, static: true,
    _column: {
      sb: 255, order: 1,
      label: "Q",
      click: function( e, torrent ) {
        globals.currentTorrent = torrent;
        showPopup( "popupQueue", function( e ) {
          const action = e.target.id;
          doRequest( "queue-move-" + action, { ids: getSelected().ids() }, getQueuePositions.curry( null ) );
        }, e, function( popup, e ) {
          return e.shiftKey;
        } );
        return true;
      }
    },
    edit: true
  },
  "rateDownload": {
    sb: 33,
    _column: { sb: 33, order: 7, label: "Down", render: renderSpeed }, render: renderSpeed, value: 0 },
  "rateUpload": {
    sb: 161,
    _column: { sb: 161, order: 8, label: "Up", render: renderRateUpload }, render: renderSpeed, value: 0 },
  "recheckProgress": {
    sb: 8,
    _column: { sb: 8, order: 4, label: "Checked", render:renderPercentage }, render: renderPercentage
  },
  "secondsDownloading": {},
  "secondsSeeding": {},
  "seedIdleLimit": { edit: true },
  "seedIdleMode": { edit: true },
  "seedRatioLimit": { edit: true },
  "seedRatioMode": { edit: true },
  "sequentialDownload": { edit: true },
  "sizeWhenDone": {
    sb: 8, static: true,
    nup: true,
    _column: { // 0 <= this.value
      sb: 255, order: 11,
      label: "Size",
      render: renderSizeCell,
      filter: {
        active: function() {
          return !( 0 === this.value && comparators[ ">=" ] === this.comparator );
        },
        cost: 2,
        comparatorLabel: ">=",
        comparator: comparators[ ">=" ],
        value: 0,
        render: renderSizeFilter,
        match: function( torrent ) {
          return undefined === torrent.sizeWhenDone || this.comparator( torrent.sizeWhenDone, this.value );
        }
      }
    },
    render: renderSize
  },
  "startDate": { render: renderDateTime },
  "status": {
    sb: 255,
    render: renderStatus,
    _column: {
      sb: 1, order: 2,
      render: renderStatus,
      filter: {
        active: function() {
          return -1 !== this.value;
        },
        cost: 1,
        visible: true,
        value: globals.currentStatus,
        render: renderStatusFilter,
        match: function( torrent ) {
          return undefined === torrent.status || this.value === torrent.status
        }
      }
    }
  },
  "torrentFile": {
    nup: true,
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
          copyToClipboard( settings.torrentLinkTemplate.resolve( t ) );
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
  "totalSize": { nup: true, render: renderSize },
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
  "uploadedEver": {
    sb: 161,
    _column: { sb: 128, order: 9, label: "Uploaded", render: renderSizeCell }, render: renderSize },
  "uploadLimit": { edit: true },
  "uploadLimited": { edit: true },
  "uploadRatio": {
    sb: 128,
    _column: { sb: 128, order: 10, label: "Karma", render: renderUploadRatio }, render: renderPercentage },
  "wanted": { _ignore: true },
  "webseeds": { _ignore: true },
  "webseedsSendingToUs": {}
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
    delete globals.torrentHash[ id ];
  } );

  if( 14 <= globals.version ) { // 2.40
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

function getStatus() {
  return ts[ globals.currentStatus ];
}

function getTorrent( id, setGlobal ) {
  const result = globals.torrentHash[ id ];
  return setGlobal ? globals.currentTorrent = result : result;
}

function getTorrents( ids ) {
  return ids.map( getTorrent );
}

function getRowTorrent( e, setGlobal ) {
  while( e ) {
    if( "TR" === e.tagName ) {
      return getTorrent( e.id || -1, setGlobal );
    }
    e = e.parentNode;
  }
}

function arrayBufferToString( ab ) {
  const CHUNK_SIZE = 65532;

  var s = "";
  var left = ab.byteLength;
  for (var i = 0, l = left; i < l; i += CHUNK_SIZE ) {
    s += String.fromCharCode.apply( null, new Uint8Array( ab, i, Math.min( CHUNK_SIZE, left ) ) );
    left -= CHUNK_SIZE;
  }
  return s;
}

function recycleTorrents( torrents ) {

  const _recycle = function( t, _next ) {
    const r = new XMLHttpRequest();
    Event.observe( r, "load", function( e ) {
      if( 200 !== r.status ) {
        t.update( {
          error: r.status,
          errorString: r.status + " " + r.statusText
        } );
        sendNotification( 1, "Recycling error. Status " + r.status + ": " + r.statusText + ".", getBody( t ) );
        return _next();
      }

      if( !r.response ) {
        t.update( {
          error: 3,
          errorString: "No data in response."
        } );
        sendNotification( 1, "Recycling error. No response data.", getBody( t ) );
        return _next();
      }

      const s = arrayBufferToString( r.response )
      if( !s.startsWith( "d8:announce" ) && !s.startsWith( "d13:announce-list" ) ) {
        t.update( {
          error: 3,
          errorString: "Junk in response."
        } );
        sendNotification( 1, "Recycling error. File is not a torrent.", getBody( t ) );
        return _next();
      }

      globals.removed.pushUnique( t.id );
      doRequest( "torrent-remove", { ids: [ t.id ] }, function( response ) {
        if( !success( response ) ) {
          sendNotification( 1, "Recycling error. Could not remove torrent.", getBody( t ) );
          return _next();
        }
        t.deselect();
        addTorrent( window.btoa( s ), function( response ) {
          if( success( response ) ) {
            const args = getArguments( response );
            args.torrents = [ args[ "torrent-added" ] || args[ "torrent-duplicate" ] ];
            filterTorrents( updateTorrents( response, true ) );
            sortTorrents();
            renderTorrents();
          }
          else {
            sendNotification( 1, "Recycling error. Could not add torrent.", getBody( t ) );
          }
          _next();
        } );
      } );
    } );
    r.open( "GET", globals.shift.settings.torrentLink + getFilePart( t.torrentFile ) );
    r.responseType = "arraybuffer";
    r.send( null );
  }

  const _next = function() {
    torrents.slice().shiftEach( _recycle, function() { getQueuePositions( torrents ) } );
  }

  globals.version < 14 ? _next() : doRequest( "queue-move-bottom", { ids: torrents.ids() }, _next );
}

function handleTorrentActionClick( e ) {
  const action = e.target.id;

  closePopup( e );

  if( !torrentActions[ action ] ) {
    return;
  }

  showWait();

  if( "details" === action ) {
    return globals.functionMap[ "menu_details" ]( e );
  }

  const selected = getSelected();
  const preRequest = function( request ) { return request }
  var postRequest = preRequest;
  var postResponse = null;

  const args = {
    ids: selected.ids()
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
        filterTorrents( updateTorrents( response, true ).each( function( t ) {
          t._node && delete t._node.down( "td.name" ).nomouseover;
        } ) );
      } );
      return;

    case "relocate":
      args.location = persistPath( d.paths.value );
      args.move = d.move.value;
      fetchDownloadDirs( args.ids );
      postResponse = function() {
        fetchDownloadDirs( args.ids, function( response ) {
          const oldPaths = {};
          const result = updateTorrents( response, false, function( torrent ) {
            oldPaths[ torrent.id ] = torrent.downloadDir;
          } ).partition( function( torrent ) {
             return torrent.downloadDir === args.location;
          } );

          const _process = function( torrents, level, title, s ) {
            if( isEmpty( torrents ) ) {
              return;
            }
            sendNotification( level, title, 1 === torrents.length ? getBody( torrents[ 0 ], "\n" + s + " to:\n\"" + args.location + "\"" ) : {
              body: s + "\n" + torrents.map( function( torrent ) {
                return "\"" + oldPaths[ torrent.id ] + torrent.name + "\"";
              } ).join( "\n" ) + "\nto\n\"" + args.location + "\""
            } );
          }

          _process( result[ 0 ], 2, "Relocation successful.", "Relocated" );
          _process( result[ 1 ], 1, "Relocation error.", "Could not relocate" );
        } );
      }
      break;

    case "rename":
      const rename = {
         path: getTargetPath(),
         name: d.fileName.value
      }
      if( -1 === globals.pathDepth ) {
        rename.node = globals.currentFile.node.down( "td.name" );
      }
      renameFiles( [ rename ] );
      return;

    case "trash":
      const partitioned = selected.partition( function( torrent ) {
        return torrent.isMagnet();
      } );
      var selectedMagnetIds = partitioned[ 0 ].ids();

      args.ids = partitioned[ 1 ].ids();
      if( args.ids.length > 0 ) {
        args[ "delete-local-data" ] = true;
        if( selectedMagnetIds.length > 0 ) {
          postResponse = function() {
            doRequest( torrentActions[ action ].method, { ids: selectedMagnetIds }, postTorrentRemove.curry( action ) );
            globals.removed.pushUnique( selectedMagnetIds );
          }
        }
      }
      else {
        args.ids = selectedMagnetIds;
        selectedMagnetIds = [];
      }

    case "remove":
      postRequest = function( request ) {
        globals.removed.pushUnique( args.ids );
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
  e.stop && e.stop();
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
  d._.insert( Array.from( d.buttons.children ) );

  globals.selected = getSelected();
  const dialog = d[ globals.action ];
  const open = dialog && dialog._open;
  if( open && open() ) {
    closePopup( e );
    const l = torrentActions[ globals.action ].label;
    const p = showPopup( "popupDialog" );
    dialog._close && ( p.close = dialog._close );
    p.down( "h1" ).update( l );
    p.down( "span" ).update( globals.action );
    d.torrents.update( "\"" + globals.selected.pluck( "name" ).join( "\",<br>\n\"" ) + "\"" );
    d.action.update( l ).setId( globals.action );
    if( "relocate" === globals.action ) {
      d.relocate.paths.down( "select" ).focus();
    }
    return;
  }
  handleTorrentActionClick( e );
  return true;
}

function selectTorrents( action ) {
  var select = "select visible" === action;
  const visible = select || "deselect visible" === action;
  select = select || "select all" === action;
  globals.torrents.each( function( torrent ) {
    torrent.selected = !visible || visible && torrent.displayed ? select : torrent.selected;
  } );
}

function storeSelection() {
  globals.selectedIds = getSelected().ids();
}

function restoreSelection() {
  globals.torrents.each( function( torrent ) {
    torrent.selected = globals.selectedIds.includes( torrent.id );
  } );
}

const torrentColumns = globals.torrentColumns;

function filterTorrents( torrents ) {
  const f = globals.filters.filter( function( filter ) {
    return Object.isFunction( filter.active ) ? filter.active() : filter.active;
  } ).reverse();

  torrents = torrents || globals.torrents;
  return torrents.filter( function( torrent ) {
    var display = true;
    for( var i = 0, l = f.length; i < l && display; ++i ) {
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
  status = undefined === status ? globals.currentStatus : status;
  if( -1 === status ) {
    return globals.torrents;
  }

  return globals.torrents.filter( function( torrent ) {
    return status === torrent.status;
  } );
}

function getSelected() {
  const selected = filterDisplayed( filterSelected( globals.torrents ) );
  return selected.isEmpty() ? [].pushUnique( globals.currentTorrent ) : selected;
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

const trackerColumns = {
  "menu": {
    label: rLed(),
    render: rLed,
    click: function( e, tracker ) {
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
  return undefined === size ? "?" : renderSize( size );
}

const pathColumns = {
  "path": {},
  "free": { render: renderSizeOk },
  "total": { render: renderSizeOk },
  "count": { label: "#" },
  "menu": { label: "", render: rLed }
}

const ruleColumns = {
  "field": {
    render: function( field ) {
      return renderSelect( "name", "downloadDir" ).setValue( field );
    }
  },
  "matches": {
    render: function( matches ) {
      return rT( { "class": "styled", style: "resize: vertical", placeholder: "Regular expressions go here." } ).insert( matches );
    }
  },
  "labels": {
    render: function( labels ) {
      return renderLabels( labels, true );
    }
  }
}

const Torrent = Class.create( {
  initialize: function( torrent, keys ) {
    Object.extend( this, globals.torrentDefaults );
    this.update( torrent, keys );
  },
  isMagnet: function() {
    return 1.0 > this.metadataPercentComplete && 0.0 === this.percentDone && 0.0 === this.sizeWhenDone && !this.isSeeding();
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
    const isTable = Object.isArray( torrent );
    this._dirty = this._dirty || [];
    keys = keys || Object.keys( torrent );
    for( var i = 0; i < keys.length; ++i ) {
      const k = keys[ i ];
      const o = this[ k ];
      var v = torrent[ isTable ? i : k ];
      if( Object.equals( o, v ) ) {
        continue;
      }

      switch( k ) {
        case "id":
          this[ k ] = v;
          continue;

        case "error":
          if( 0 === v ) {
            if( this.errorString && this.errorString.length ) {
              globals.refreshErrorStrings = true;
              this.errorString = "";
            }
          }
          break;

        case "errorString":
          if( v.length ) {
            globals.errorStrings.pushUnique( v );
          }
          break;

        case "files":
          v.each( function( file, index ) { file.index = index } );
          break;

        case "labels":
          v.each( globals.dynaLabels.pushLabel );
          v = o && o.replace( v ) || v;
          break;

        case "status":
          switch( ts[ v ].label ) {
            case "Seed waiting":
            case "Seeding":
              if( undefined !== o && "Downloading" === ts[ o ].label ) {
                this.done();
              }
          }
          break;
      }
      this[ k ] = v;
      this._dirty.pushUnique( "hashString" === k ? "name" : k );
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
    if( this._selected !== s ) {
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

const TAB_ELEMENTS = "a[href], button, textarea, input, select, led,".split( "," ).join( ":not([disabled])," ).slice( 0, -1 ); // Remove that last ,.
function showPopup( popup, handler, e, keepOpen ) {
  popup = $( popup );
  const popups = $( "popups" );
  const outside = $( "outside" );
  const elements = [ outside, popups, popup ];
  var inputs = [];
  var resizeTimer = 0;

  const _center = function ( e ) {
    e.style.left = window.innerWidth / 2 - e.offsetWidth / 2 + "px";
    e.style.top = window.innerHeight / 2 - e.offsetHeight / 2 + "px";
  }

  // Prevent stacking visually.
  popups.select( ".popup" ).hideAll();

  popups.close = function( e ) {
    if( keepOpen && keepOpen( popup, e ) ) {
      return;
    }
    elements.hideAll().invoke( "stopObserving", "click" );
    popup.close && popup.close( e );
    delete popup.close;
    if( inputs.length ) {
      popup.stopObserving( "keydown" );
    }
    Event.stopObserving( window, "resize" );
  }

  popup.observe( "click", preventBubbling );
  outside.observe( "click", popups.close );

  elements.each( function( e ) { e.style.display = "block" } );

  if( handler ) {
     popup.observe( "click", handler );
  }

  if( popup.hasClassName( "dialog" ) ) {
    inputs = popup.select( TAB_ELEMENTS ).filter( Element.visible );
    if( inputs.length ) {
      const first = inputs.first();
      const last = inputs.last();
      popup.writeAttribute( "tabindex", "0" )
      popup.observe( "keydown", function( e ) {
        if( ( "Tab" === e.key || 9 === e.keyCode ) && document.activeElement === ( e.shiftKey ? first : last ) ) {
          ( e.shiftKey ? last : first ).focus();
          e.stop();
        }
      } );
      popup.focus();
    }

    Event.observe( window, "resize", function() {
      clearTimeout( resizeTimer );
      resizeTimer = setTimeout( function( e ) {
        _center( popup );
      }, 100 );
    } );
  }

  if( e ) {
    popup.style.left = e.pointerX() + "px";
    popup.style.top = Math.min( e.pointerY() - globals.html.scrollTop, window.innerHeight - popup.offsetHeight - 8 ) + "px";
    popup.observe( "click", closePopup );
  }
  else
  {
    _center( popup );
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
  const d = globals.dialogs.add;
  d.paths.replace( d.paths = renderPathSelect() );
  if( torrentRegExp.test( d.url.value ) ) {
    return;
  }
  if( globals.shift.settings.pasteMagnet && navigator.clipboard && navigator.clipboard.readText ) {
    navigator.clipboard.readText().then( function( text ) {
      if( d.url.value = text.match( torrentRegExp ) ) {
        d.isUrl.click();
      }
    } ).catch( function( e ) {
      if( "NotAllowedError" === e.name ) {
        globals.shift.settings.pasteMagnet = false;
      }
    } )
  }
}

function renameFiles( renames ) {
  const torrent = globals.currentTorrent;
  var ids = [];

  renames.shiftEach( function( a, _next ) {
    if( getFilePart( a.path ) === a.name ) {
      return _next();
    }

    a.ids = a.ids || [ torrent.id ];
    ids.pushUnique( a.ids );
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
  }, function() {
    fetchTorrents( [ "id", "files", "name" ], ids, function( response ) {
      if( success( response ) ) {
        filterTorrents( updateTorrents( response ) );
        const body = $( "fileBody" );
        if( !body ) {
          return;
        }
        body.update();
        var property = updateOrder( fileColumns );
        var order = fileColumns[ property ].order;
        if( "name" === property ) {
          property = order ? "name" : "index";
          order = true;
        }
        torrent.files.indexify().sortByProperty( property, order );
        renderFiles( torrent );
      }
    } );
  } );
}

function renderDateTime( seconds ) {
  return seconds > 0 ? new Date( 1000 * seconds ).toJSON().substring( 0, 19 ).replace( "T", " " ) : "-";
}

function renderDateTimeShort( seconds ) {
  if( seconds > 0 ) {
    const s = renderDateTime( seconds );
    seconds *= 1000;
    const now = new Date().getTime()
    return seconds < now - DAY_MS || seconds > now + DAY_MS ? s.substring( 0, 10 ) : s.substring( 11, 19 )
  }
  return "-";
}

function renderFlags( flags, peer, key, cell ) {
  if( cell ) {
    cell.title = flags.toArray().map( function( flag ) { return flag + " = " + peerFlags[ flag ] } ).join( "\n" );
  }
  return flags;
}

function renderMimeTypeColumn( mimeType, torrent, key, cell ) {
  if( cell ) {
    cell.title = mimeType;
    var t = globals.shift.settings.mimeTypeIconTemplate;
    if( !isEmpty( t ) ) {
      var content = rE( "img", {
        "class": "mimeType " + mimeType,
        src: t.resolve( undefined, function( m ) {
          switch( m.substring( 2, m.length - 1 ) ) {
            case "file":
              return globals.mimeTypes[ mimeType ];
            default:
              return m;
          }
        } )
      } );
      cell.update( content );
    }
  }
  return undefined;
}

const pctClassNames = [ "pct0", "pct25", "pct50", "pct75", "pct100" ];

function setPercentageClass( e, percentage, multiplier ) {
  multiplier = multiplier || 1.0;
  percentage *= multiplier;
  percentage = percentage.limit( 0.0, 1.0 );
  for( var i = 0, l = pctClassNames.length; i < l; ++i ) {
    e.toggleClassName( pctClassNames[ i ], i === Math.floor( percentage * ( l - 1 ) ) );
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
  return rgba.match( rgbaRegExp ).map( function( a ) { return +a } );
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
    if( _marked( start ) || _marked( end ) ) {
      return undefined;
    }
    start = getRGBA( start );
    end = getRGBA( end );
    const opacityStep = ( end[ 3 ] * 100 - start[ 3 ] * 100 ) / steps;
    const colors = [];
    const dStep = 1.0 / steps;
    var d = 0;
    var opacity = start[ 3 ] * 100;

    const _d = function( i ) {
      return Math.round( end[ i ] * d + ( 1 - d ) * start[ i ] );
    }

    for( var i = 0; i < steps; ++i ) {
      d += dStep;
      opacity += opacityStep;
      colors.push( c32( _d( 0 ), _d( 1 ), _d( 2 ), opacity / 100 ) );
    }
    return colors;
  }

  availabilityColors =
    availabilityColors ||
    _RGBA() ||
    _HSL( 0, 120 );

  if( !torrent.pieceCount || globals.percentDone === torrent.percentDone ) {
    return canvas;
  }

  canvas.style.imageRendering = cell.getWidth() < globals.pieceCount ? "optimizequality" : "optimizespeed";
  const ctx = canvas.getContext( "2d" );
  const image = ctx.createImageData( globals.pieceCount, 1 );
  const ra = new Uint32Array( image.data.buffer );
  var bitIndex;
  for( var i = 0, l = globals.pieceCount; i < l; ++i ) {
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
  for( var i = 0, l = globals.pieceCount; i < l; ++i ) {
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

function renderInterval( seconds ) {
  return seconds < 300 ? seconds + "s" : Math.floor( seconds / 60 ) + "m";
}

function renderLabel( label, notab, nomod, add ) {
  const css = label.toCSS();
  const style = $S( ".label." + css );
  const notext = style && "unset" === style[ "text-rendering" ];
  add = add || " l" + ( label.hash() & 0xffffff ) % 7;
  const o = { "class": "border " + css, title: label };
  if( !notab ) {
    o.tabindex = 0;
  }
  const l = rS( o, rS( { "class": "label " + css + " " + add }, notext ? "" : rP( {}, label ) ) );
  if( nomod ) {
    return l;
  }
  l.writeAttribute( "draggable", "true" );
  l.observe( "dragstart", function( e ) {
    globals.drag = this;
    this.addClassName( "dragging" );
    globals.dragSource = this.up( "span.labels" );
    this._next = this.nextSibling;
    e.dataTransfer.setData( "text/plain", label );
    e.dataTransfer.dropEffect = "copy";
  } );
    l.observe( "dragend", function( e ) {
      this.removeClassName( "dragging" );
    } )
  return l;
}

function renderLabels( labels, noscroll, notab ) {
  if( labels._node ) {
    return labels.renderLabels();
  }

  labels._node = rS( "labels" );
  if( !noscroll ) {
    labels._node.observe( "wheel", function( e ) {
      e.stop();
      if( !e.deltaY ) {
        return;
      }
      e.deltaY && ( e.currentTarget.scrollLeft += e.deltaY );
    } );
  }
  labels._node._data = labels;

  labels.renderLabels = function( index ) {
    const nodes = this.select( "span.border" );
    nodes.filter( function( n ) { return !labels.includes( n.title ) } ).each( Element.remove );

    this.insert( labels.map( function( l ) {
      return nodes.find( function( n ) { return n.title === l } ) || renderLabel( l, notab )
    } ) );
    if( -1 < index ) {
      nodes[ index ].focus();
    }
    return this;
  }.bind( labels._node )

  return labels.renderLabels();
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
  for( var u = 0; u < 9 && threshold <= size; ++u ) {
    size = size / 1024;
  }
  return ( 0 < size ? size.toFixed( Object.isNumber( decimals ) ? decimals : 2 ) : 0 ) + " " + UNITS[ u ];
}

function renderSizeCell( size, torrent, ignore, cell ) {
  if( cell ) {
    cell.title = size + " B";
  }
  return renderSize( size );
}

function renderSpeed( size ) {
  return renderSize( size, 0 ) + "/s";
}

function renderStatus( status ) {
  return undefined !== status && ts[ status ].label;
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

function renderFilter( label ) {
  const f = rD( { "class": "filter"} ).hide();
  f.insert( rL( label + ":" ) );
  f.insert( rD( { "class" : "filterInput" } ) );
  return f;
}

function renderStatusFilter() {
  const f = renderFilter( "Status" );
  f.down( ".filterInput" ).insert(
    renderSelect( {
      change: function() {
        torrentColumns.status.filter.value = +this.value;
        globals.torrentStatusChanged = true;
        globals.currentStatus = this.value;
        filterTorrents();
        $( "torrentBody" ).select( "tr" ).each( function( row ) {
          row.visible() && row.toggleClassName( "active", false );
          row.select( "td.name.hover" ).invoke( "removeClassName", "hover" );
        } );
        globals.currentIndex = -1;
        const status = getStatus();
        globals.updateFields = status.fields;
        if( status.onChange ) {
          status.onChange();
        }
        else {
          globals.shift.torrentUpdater.default();
        }
        sortTorrents( undefined, true );
        renderTorrents();
      },
      id: "statusSelect",
      options: Object.keys( ts ).map( function( k ) {
        return { value: k, text: ts[ k ].label };
      } ),
      value: globals.currentStatus
    } )
  );
  return f;
}

function renderErrorFilter() {
  const filter = torrentColumns.errorString.filter;
  const select = renderSelect( { id: "errorSelect" } );

  const _render = function( e ) {
    const es = globals.errorStrings = globals.refreshErrorStrings ? globals.torrents.pluckUnique( "errorString" ).compact().sort() : globals.errorStrings;
    globals.refreshErrorStrings = false;
    const options = select.options;
    var i = 0;
    var values = Array.apply( null, options ).pluck( "value" );
    for( var l = es.length; i < l; ++i ) {
      if( !values.includes( "" + es[ i ] ) ) {
        options.add( new Option( es[ i ], es[ i ] ), options[ i ] );
      }
    }
    options.add( filter.renderRefreshOption );
    i = options.length - 1;
    while( --i > 2 ) {
      if( !es.includes( options[ i ].value ) ) {
        options.remove( i );
      }
    }
  }

  select.observe( "focus", function( e ) {
    _render();
    select.stopObserving( "focus" );
  } ).observe( "change", function( e ) {
    if( "refresh" === select.value ) {
      select.value = "";
      globals.refreshErrorStrings = true;
      _render();
    }
    filter.value = select.value;
    filterTorrents();
  } );

  const f = renderFilter( "Error" );
  f.down( ".filterInput" ).insert( select );
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
  const select = renderSelect( { options: defaultOptions, value: filter.comparatorLabel } );
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
  f.down( ".filterInput" ).insert( select ).insert( input );
  return f;
}

function renderSizeFilter() {
  const filter = torrentColumns.sizeWhenDone.filter;
  const select = renderSelect( { options: defaultOptions, value: filter.comparatorLabel } );
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
  f.down( ".filterInput" ).insert( select ).insert( input );
  return f;
}

function renderNameFilter() {
  const filter = torrentColumns.name.filter;
  const input = rI( filter.value );
  const regExpLed = rLed().makeToggle( function( e ) {
    filter.value = input.value.toLowerCase();
    if( filter.isRegExp = this.value ) {
      try {
        filter.value = new RegExp( input.value, "i" );
      }
      catch( ex ) {
        filter.value = noMatchRegExp;
      }
    }
    filterTorrents();
  } );

  input.observe( "change", regExpLed._change );
  input.observe( "blur", regExpLed._change );

  const f = renderFilter( "Name" );
  f.down( ".filterInput" ).insert( input, regExpLed, rL( "RegExp" ) );
  return f;
}

function renderLabelFilter() {
  const filter = torrentColumns.labels.filter;
  const input = rI( filter.value.join( " " ), { id: "labelFilterInput" } );
  input.addFilterLabel = function( e ) {
    const s =  e.target.up( "span.border" ).title.quote();
    this.value = ( this.value.includes( s ) ? this.value.replace( s, "" ) : this.value + " " + s ).trim();
    this.change();
    return this;
  }.bind( input );

  const inputOr = rLed();
  const inputExclude = rLed();

  const _handler = function( e ) {
    filter.value = ( input.value.match( quotedRegExp ) || [] ).without( "" ).map( String.prototype.dequote.uncurry() );
    filter.or = inputOr.value;
    filter.exclude = inputExclude.value;
    filterTorrents();
  }

  input.observe( "change", _handler );
  input.observe( "blur", _handler );
  inputOr.makeToggle( _handler );
  inputExclude.makeToggle( _handler );

  const inputAdd = rLed( true, { id: "addLabel" } );
  const inputRemove = rLed();
  inputAdd.addRadio( inputRemove );

  const f = renderFilter( "Label" );
  f.down( ".filterInput" ).insert( input, inputOr, rL( "Or" ), inputExclude, rL( "Exclude" ), inputAdd, rL( "Add" ), inputRemove, rL( "Remove" ) );

  const l = renderLabels( globals.shift.settings.labels ).setId( "labels" );
  l.observe( "dblclick", input.addFilterLabel );

  const e = labelEditor( globals.dynaLabels );
  const d = e[ 0 ].setId( "dynaLabels" );
  d.observe( "dblclick", input.addFilterLabel );

  d._data.pushLabel = function( l ) {
    if( this.includes( l ) || globals.shift.settings.labels.includes( l ) ) {
      return;
    }
    this.pushUnique( l );
    this._dirty = true;
  }.bind( d._data );
  globals.dynaLabels = d._data;


  const dragover = dragOverLabel.curry( true );
  l.observe( "dragenter", dragEnterLabel );
  l.observe( "dragover", dragover.bind( l ) );
  d.observe( "dragenter", dragEnterLabel );
  d.observe( "dragover", dragover.bind( d ) );

  const dragleave = function( e ) {
    e.stop();
    const n = globals.drag;
    if( !n ) {
      return;
    }
  }
  l.observe( "dragleave", dragleave.bind( l ) );
  d.observe( "dragleave", dragleave.bind( d ) );

  f.insert( l, rL( "New:" ).setId( "newLabel" ), e[ 2 ], e[ 4 ], e[ 1 ].setId( "trashLabel" ), d );

  return f;
}

function addTorrent( data, handler, target, start, notify ) {
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
    if( undefined !== start ) {
      args[ "paused" ] = !start;
    }
    if( data.includes( ":" ) ) {
      delete args[ "metainfo" ];
      args[ "filename" ] = decodeURIComponent( data ).replace( "&amp;".toRegExp(), "&" );
    }
    const req = doRequest( "torrent-add", args, handler );
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

function fixLabels( add, s, t, _next ) {
  if( !t || add === Array.prototype.includes.call( t.labels, s ) ) {
    return _next && _next();
  }

  const index = add ? -1 : t.labels.indexOf( s ).limit( -1, t.labels.length - 2 );

  fixTorrents( { ids: [ t.id ], labels: t.labels[ add ? "pushUnique" : "remove" ]( s ) }, function( response ) {
    updateTorrents( response );
    filterTorrents();
    sortTorrents();
    if( t.labels._node ) {
      t.labels.renderLabels( index );
    }
    else {
      globals.torrentColumns.labels.renderAdvanced( t );
    }
    _next && _next();
  } );
}

const renderers = {
  "downloadSpeed": renderSpeed,
  "uploadSpeed": renderSpeed,
  "downloadedBytes": renderSize,
  "uploadedBytes": renderSize,
  "download-dir-free-space": renderSize
}

const updaters = {
  "port-is-open": function( e, value ) {
    e.removeClassName( "checking" );
    const s = value ? "Open" : "Closed";
    e.addClassName( "port-" + s.toLowerCase() );
    e.writeAttribute( "title", s ).value = value;
  }
}

function updateFields( object ) {
  for( var k in object ) {
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

function getErrorData( ids ) {
  if( globals.currentStatus > 0 ) {
    return;
  }

  ids = ids || globals.torrents.filter( function( torrent ) {
    return 0 === torrent.status && 0 !== torrent.error;
  } ).ids();

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

function updateTorrents( response, refresh ) {
  const torrents = [];
  const ids = []; // Ids of torrents to be updated
  const eids = []; // Ids of torrents with errors
  const mids = []; // Ids of magnets for special handling
  const lts = []; // Torrents that may need to be processed by LabelMatic.

  const args = getArguments( response );
  if( !args || isEmpty( args.torrents ) ) {
    return [];
  }

  var t = args.torrents[ 0 ];
  const table = Object.isArray( t );
  const keys = table ? args.torrents.shift() : Object.keys( t );
  const _id = table ? keys.indexOf( "id" ) : "id";
  args.torrents.each( function( torrent ) {
    const id = torrent[ _id ];
    if( undefined === id ) {
      console.error( "Torrent.id should never be undefined!" );
    }

    if( globals.removed.includes( id ) ) {
      return;
    }

    var t = getTorrent( id );
    if( t ) {
      t.update( torrent, keys );
      if( 0 === t.status && 0 < t.error && isEmpty( t.errorString ) ) {
        eids.push( t.id )
      }
    }
    else {
      t = new Torrent( torrent, keys );
      globals.torrents.push( t );
      globals.torrentHash[ t.id ] = t;
      !globals.init && lts.push( t );
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
      t._dirty.pushUnique( keys );
    }
  } );

  globals.magnets.pushUnique( mids );

  getFieldData( ids );
  getMagnetData( mids );
  getErrorData( eids );
  if( 16 <= globals.version && globals.shift.settings.labelMaticEnabled ) { // 3.00
    applyLabelMaticRules( globals.rules, lts );
  }

  return torrents;
}

function updateOrder( columns, property ) {
  const noReverse = undefined === property;
  var c;

  if( !property ) {
    for( var k in columns ) {
      if( undefined !== columns[ k ].order ) {
        property = k;
        break;
      }
    }
  }

  if( !property ) {
    for( var k in columns ) {
      c = columns[ k ];
      if( undefined !== c.defaultOrder ) {
        c.order = c.defaultOrder;
        return k;
      }
    }
    return null;
  }

  for( var k in columns ) {
    c = columns[ k ];
    if( k === property ) {
      c.order = globals.shiftKey ? true : undefined === c.order ? false : noReverse === c.order;
      delete globals.shiftKey;
    }
    else {
      delete c.order;
    }
  }
  return property;
}

function sortTorrents( property, full ) {
  full = full || false;

  const torrents = globals.torrents;
  if( isEmpty( torrents ) ) {
    return;
  }

  const columns = getStatus().columns;
  property = updateOrder( columns, property ) || updateOrder( columns, "percentDone" );

  const column = torrentColumns[ property ];
  torrents.indexify().sortByProperty( property, column.order, [ "labels" ].includes( property ) );

  const _set = function( e ) {
    const _p = e.hasClassName( property );
    e.toggleClassName( "asc", _p && column.order ).toggleClassName( "desc", _p && !column.order );
  }
  $$( "#torrentTable col" ).each( _set );
  $$( "#torrentTable th" ).each( _set );

  const body = $( "torrentBody" );
  if( null === body ) {
    return;
  }

  var unchanged = true;
  var reversed = true;

  if( !full ) {
    for( var i = 0, l = torrents.length; i < l; ++i ) {
      var _i = torrents[ i ]._i;
      unchanged = unchanged && _i === i;
      reversed = reversed && _i === torrents.length - i;
      if( !unchanged && !reversed ) {
        break;
      }
    }

    if( unchanged ) {
      return;
    }
    full = full || reversed;
  }

  if( !full ) {
    const _t = [];
    var d = 0;
    for( var i = 0, l = torrents.length; i < l; ++i ) {
      _t.push( torrents[ i ]._i );
    }

    for( var i = 0, l = _t.length; i < l && d < l / 16; ++i ) {
      if( _t[ i ] !== i ) {
        d++;
        for( var j = i + 1; j < l; ++j ) {
          _t[ j ]++;
        }
      }
    }
    full = full || l / 16 <= d;
  }

  const _n = function( n ) {
    n.visible() && n.down( "td.name" ).removeClassName( "hover" );
    return n;
  }

  if( full ) {
    for( var i = 0, l = torrents.length; i < l; ++i ) {
      var n = torrents[ i ]._node;
      if( n ) {
        body.appendChild( _n( n ) );
      }
    }
    return;
  }

  const nodes = body.childNodes;
  for( var i = 0, l = torrents.length; i < l; ++i ) {
    var torrent = torrents[ i ];
    var n = torrent._node;
    if( n && torrent._i !== i ) {
      for( var j = i + 1, end = Math.min( torrent._i, torrents.length ); j < end; ++j ) {
        torrents[ j ]._i++;
      }
      body.insertBefore( _n( n ), nodes[ i ] );
    }
  }
}

function renderTorrentRow( torrent ) {
  torrent._node = renderRow( torrent, torrentColumns, torrent.id ).hide();
  torrent._node.zzz = true;
  return torrent._node;
}

function renderTorrents() {
  const body = $( "torrentBody" );

  if( !body ) {
    return;
  }

  if( globals.dynaLabels._dirty ) {
    delete globals.dynaLabels._dirty;
    globals.dynaLabels.renderLabels();
  }

  const ids = []; // Ids of torrents to be updated
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
      for( var i = 0, l = torrent._dirty.length; i < l; ++i ) {
        const k = torrent._dirty[ i ];
        const c = torrentColumns[ k ];
        if( !c || false === c._column ) {
          continue;
        }
        renderCell( torrent, c, k, row.down( "." + k ), function() { return k.capitalize() + " " + torrent.id } );
      }
      var r;
      for( var i = 0, l = torrent._dirty.length; i < l; ++i ) {
        const k = torrent._dirty[ i ];
        const c = torrentColumns[ k ];
        if( !c || false === c._column ) {
          continue;
        }
        if( r = torrentColumns[ k ].renderAdvanced ) {
          r( torrent, c, k, row, row.down( "." + k ) );
        }
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

  const _head = function( c, k ) {
    return rS( { id: "l_" + k, "class": k } ).insert( undefined === c.label ? k.capitalize() : c.label );
  }

  const t = renderTableElements();
  t.table = rTable( id, t );
  if( columnDefinitions ) {
    const header = rR( { "class": "header" } );
    t.header.insert( header );
    keys = keys || Object.keys( columnDefinitions );
    for( var i = 0, l = keys.length; i < l; ++i ) {
      const k = keys[ i ];
      const c = columnDefinitions[ k ];
      if( c && false !== c._column ) {
        t.columns.insert( rCol( k ) );
        const cell = rH( { id: "h_" + k, "class": k } ).insert( _head( c, k ) );
        click = c.header && c.header.click || click;
        click && cell.observe( "click", click );
        header.insert( cell );
      }
    }
    updateOrder( columnDefinitions );
  }
  target && target.insert( t.table );
  renderer && renderer( t );
  return t.table;
}

function updateElement( e, content ) {
  if( undefined === content || e.currentHTML === content ) {
    return;
  }
  e.currentHTML = content;
  if( ( Object.isString( content ) && "<" !== content[ 0 ] ) || Object.isNumber( content ) ) {
    var n = e.firstChild;
    while( n ) {
      if( n.TEXT_NODE === n.nodeType ) {
        n.textContent = content;
        return;
      }
      if( n.ELEMENT_NODE === n.nodeType ) {
        if( "I" === n.tagName ) {
          n.parentNode.removeChild( n );
        }
      }
      n = n.nextSibling;
    }
    e.textContent = content;
  }
  else {
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

  const newCell = undefined === cell;
  cell = cell || rC( Object.extend( { "class": k }, d.attributes ), "" );
  updateElement( cell, Object.isFunction( render ) ? render( content, o, k, cell ) : content );
  return newCell ? cell : undefined;
}

function renderRow( object, columnDefinitions, row, renderer ) {
  const newRow = !Object.isElement( row );
  if( newRow ) {
    row = rR( undefined === row ? undefined : { id: row } );
  }

  for( var k in columnDefinitions ) {
    var cell = newRow ? undefined : row.down( "." + k );
    cell = renderCell( object, columnDefinitions[ k ], k, cell );
    row.insert( cell );
    columnDefinitions[ k ].renderAdvanced && columnDefinitions[ k ].renderAdvanced( object, columnDefinitions[ k ], k, row, cell );
  }
  return newRow && renderer ? renderer( row ) : row;
}

function showTorrentTable() {
  const torrent = globals.currentTorrent;
  var torrentTable = showContent( "torrentTable" );
  if( torrentTable ) {
    torrent && centerVertically( torrent._node );
    torrentTable.select( "td.name.hover" ).invoke( "removeClassName", "hover" );
    return;
  }

  torrentTable = getTable( "torrentTable", globals.content, torrentColumns, globals.columnKeys, function( t ) {
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

    const _te = function( e, setGlobal ) {
      e.stop();
      const cell = e.findElement( "td" );
      const row = cell && cell.up( "tr" ) || e.findElement( "tr" );
      return {
        cell: cell,
        row: row,
        column: row && globals.torrentColumnHash[ row.childElements().indexOf( cell ) ],
        torrent: row && getTorrent( row.id, setGlobal )
      }
    }

    const _xe = function( e, te ) {
      if( te.column && te.column[ e.type ] ) {
        return te.column[ e.type ]( e, te.torrent, te );
      }
      var node = e.target;
      while( t.body !== node ) {
        for( var i = 0, l = node.classList && node.classList.length; i < l; ++i ) {
          var c = torrentColumns[ node.classList[ i ] ];
          if( c && c[ e.type ] ) {
            return c && c[ e.type ]( e, te.torrent, te );
          }
        }
        node = node.parentNode;
      }
      return false;
    }

    t.body.observe( "click", function( e ) {
      const rows = $( "torrentBody" ).select( "tr" ).filter( Element.visible );
      rows.invoke( "toggleClassName", "active", false );
      const te = _te( e, true );
      if( !te.row ) {
        return;
      }
      te.row.toggleClassName( "active", true );
      if( !( globals.shift.settings.deleteTorrentLabelByKey && $( e.target ).up( "span.labels" ) ) ) {
        te.row.down( "led" ).focus();
      }
      globals.currentIndex = rows.indexOf( te.row );

      if( !_xe( e, te ) ) {
        globals.select = te.torrent.toggleSelect().selected;
      }
    } ).observe( "dblclick", function( e ) {
      const te = _te( e, true );
      if( !_xe( e, te ) ) {
        globals.functionMap[ te.torrent.isMagnet() ? "menu_trackers" : "menu_files" ]( e );
      }
    } ).observe( "mousedown", function( e ) {
      t.mousedown = 1;
    } ).observe( "mousemove", function( e ) {
      if( t.mousedown && 0 !== e.buttons ) {
        if( t.mousedown > 3 ) {
          _te( e ).torrent.select();
        }
        t.mousedown++;
      }
    } ).observe( "mouseup", function( e ) {
      t.mousedown = 0;
    } ).observe( "mouseover", function( e ) {
      const te = _te( e );
      if( !_xe( e, te ) ) {
      }
    } );

    const c = rD( { id: "filterContainer" } ).hide();
    const h = rH( { id: "filterContainerCell" } ).insert( c );
    t.header.insert( rR().insert( h ) );

    const _show = function() {
      [ c, h ].invoke( sh( Array.from( c.children ).filter( Element.visible ).length ) );
    }

    for( var k in torrentColumns ) {
      const column = torrentColumns[ k ];
      const f = column.filter;
      if( f ) {
        if( f._node ) {
          c.insert( f._node );
        }
        else if( f.render ) {
          c.insert( f._node = f.render() );
        }
        else {
          continue;
        }

        const l = rLed( f.visible ).makeToggle( function( e ) {
          e && e.stop();
          const f = torrentColumns[ this.up().id.substring( 2 ) ].filter;
          f._node[ sh( f.visible = this.value ) ]();
          _show();
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

function setTorrentsColumnsVisible() {
  var columnCount = 0;
  for( var c in torrentColumns ) {
    const style = torrentColumns[ c ].style;
    if( c in getStatus().columns ) {
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

function getPathPart( name, depth ) {
  return name.split( "/" ).setLength( depth + 1 ).join( "/" );
}

function getBasePart( name ) {
  return name.substring( 0, name.lastIndexOf( "/" ) + 1 );
}

function getFilePart( name ) {
  return name.substring( name.lastIndexOf( "/" ) + 1 );
}

function getTargetPath( file, depth ) {
  file = file || globals.currentFile;
  depth = undefined === depth ? globals.pathDepth : depth;
  return -1 === depth ? file.name : getPathPart( file.name, depth );
}

function getEditableFileName() {
  return getFilePart( getTargetPath() );
}

function getSelectedFiles( files, id, depth ) {
  const path = getPathPart( files.find( function( file ) {
    return file.index === id;
  } ).name, depth );

  return files.filter( function( file ) {
    return path === getPathPart( file.name, depth );
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

  ( "none" === priority ? [ "files-unwanted" ] : [ "files-wanted", "priority-" + priority ] ).each( function( selector ) {
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
  var _send;
  const _sendNotification = function( level, title, options ) {
    if( Notification.permission !== "granted" ) {
      return;
    }
    options = options || {};
    options.icon = options.icon || globals.icon;
    if( level <= globals.shift.settings.notificationLevel ) {
      _send && _send( title, options );
    }
  }
  if( "Notification" in window ) {
    _send = function( title, options ) {
        const notification = new Notification( title, options );
    };
    sendNotification = _sendNotification;
  } else if( "mozNotification" in navigator ) { // Gecko < 22
    _send = function( title, options ) {
        const notification = navigator.mozNotification.createNotification( title, options.body, options.icon );
        notification.show();
    };
    sendNotification = _sendNotification;
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
  base = base && base.resolve( torrent );
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

function getId( row ) {
  if( !row || undefined === row.id ) {
    return undefined;
  }
  const id = row.id.split( "_" );
  id[ 1 ] = +id[ 1 ];
  return id;
}

function setFileRowPriority( row, priority ) {
  if( !row ) {
    return;
  }

  const findFileRow = function( row ) {
    while( row && "f" !== getId( row )[ 0 ] ) {
      row = row.next();
    }
    return row;
  }

  const id = getId( row )
  const torrent = globals.currentTorrent;
  const isFile = "f" === id[ 0 ];
  const selected = isFile ? [ id[ 1 ] ] : getSelectedFiles( torrent.files, id[ 1 ], +id[ 2 ] );
  if( selected ) {
    if( !priority ) {
      const l = findFileRow( row ).down( "led" );
      priority = l.value && "normal" === l.className ? "none" : "normal";
    }
    setFilesPriority( torrent.id, selected, priority );
  }
}

function renderFiles( torrent ) {
  const s = globals.shift.settings;
  var folderLink = s.folderLinkEnabled && s.folderLink;
  if( 1.0 !== torrent.percentDone && globals.shift.session[ "incomplete-dir-enabled" ] ) {
    folderLink = s.incompleteFolderLinkEnabled && s.incompleteFolderLink;
  }
  folderLink = folderLink && folderLink.resolve( torrent );

  const fbody = $( "fileBody" ).observe( "click", function( e ) {
    const target = e.findElement( "led" );
    if( !target ) {
      return;
    }
    const row = target.up( "tr" );
    const id = getId( row )

    const isFile = "f" === id[ 0 ];
    const folder = $( "popupFile" ).down( "li#folder" );
    folder[ sh( !isFile ) ]();
    if( !isFile ) {
      folder.down( "led" ).setValue( row.closed ? "open" : "close" );
    }

    showPopup( "popupFile", function( e ) {
      const torrent = globals.currentTorrent;
      globals.action = e.findElement( "li" ).id;

      const d = globals.dialogs[ globals.action ];
      switch( globals.action ) {
        case "folder":
          row.closed = !row.closed;
          row.down( "led" ).value = row.closed ? "close" : "open";
          getSelectedFiles( torrent.files, id[ 1 ], +id[ 2 ] ).each( function( fileIndex ) {
            $( "f_" + fileIndex )[ sh( !row.closed ) ]();
          } );
          break;

        case "rename":
          e.currentTarget.stopObserving( "click" ).hide();
          globals.currentFile = torrent.files.find( function( file ) {
            return file.index === id[ 1 ];
          } );
          globals.pathDepth = isFile ? -1 : +id[ 2 ];
          d.fileName.value = getFilePart( getTargetPath( globals.currentFile, globals.pathDepth ) );
          showPopup( "popupRename" );
          d.fileName.focus();
          break;

        default:
          setFileRowPriority( row, globals.action );
      }
    }, e )
  } ).observe( "dblclick", function( e ) {
    setFileRowPriority( e.findElement( "tr" ) );
  } );
  var currentNode = fbody.down();
  const dummyNode = null === currentNode ? rR() : null;

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
    const fileParts = file.name.split( "/" );

    const fileStyle = fileParts.length > 1 ? _indent( fileParts.length - 1 ) : "";

    const folderNodes = [];
    for( var i = 0, l = fileParts.length - 1; i < l; ++i ) {
      if( fileParts[ i ] === lastFileParts[ i ] ) {
        continue;
      }
      const rowId = "d_" + file.index + "_" + i;
      row = $( rowId );
      if( row && file.folderNodes ) {
        file.folderNodes.remove( row );
      }
      else {
        row = rR( { id: rowId } ).insert( rC( {}, rLed( "open" ) ) );
        if( folderNodes.length ) {
          row.insert( rC( { colspan: 2 } ) );
        }
        else {
          row.insert( rC().insert( renderPercentDone( torrent.percentDone ) ), rC().insert( renderSize( torrent.sizeWhenDone ) ) );
        }
        row.insert( rC( { "class": "name", style: _indent( i ) } ).insert( rFolder( folderLink, fileParts, i, index ) ) );
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
      if( globals.shift.settingsChanged || isDone( file ) ) {
        file.node.down( "td.name" ).update( rFile( file, torrent ) );
      }
    }
    else {
      file.filePercentDone = 0 === file.length ? 1 : file.bytesCompleted / file.length;
      file.node = rR( { id: "f_" + file.index } )
        .insert( rC( {}, rLed( getPriority( file ) ) ) )
        .insert( setPercentageClass( rC( "filePercentDone", renderPercentage( file.filePercentDone ) ), file.filePercentDone ) )
        .insert( rC( { "class": "length", title: file.length + " B" }, renderSize( file.length ) ) )
        .insert( rC( { "class": "name", style: fileStyle }, rFile( file, torrent ) ) );
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
      const cell = rH( { id: "filePieces", colspan: "4" } );
      t.header.insert( { top: rR().insert( cell ) } );
      cell.insert( renderPieces( torrent.pieces, cell ) );
    }
    for( var i = 0, l = torrent.files.length; i < l; ++i ) {
      torrent.files[ i ].folderNodes = [];
    }
    renderFiles( torrent );
  },
  function( e ) {
    var property = updateOrder( fileColumns, this.id.substring( 2 ) );
    var order = fileColumns[ property ].order;
    if( "name" === property ) {
      property = order ? "name" : "index";
      order = true;
    }
    torrent.files.indexify().sortByProperty( property, order );
    renderFiles( torrent );
  } );

  if( torrent.pieces ) {
    renderPieces( torrent.pieces, $( "filePieces" ) );
  }

  torrent.files.each( function( file ) {
    const row = $( "f_" + file.index );
    const fileStat = torrent.fileStats[ file.index ];
    const updateBytes = fileStat.bytesCompleted !== file.bytesCompleted;
    const updatePriority = fileStat.priority !== file.priority;
    const updateWanted = fileStat.wanted !== file.wanted;

    Object.extend( file, fileStat );
    if( updateBytes ) {
      if( globals.shift.settingsChanged || isDone( file ) ) {
        file.node.down( "td.name" ).update( rFile( file, torrent ) );
      }
      file.filePercentDone = 0 === file.length ? 1 : fileStat.bytesCompleted / file.length;
      updateElement( setPercentageClass( row.down( "td.filePercentDone" ), file.filePercentDone ), renderPercentage( file.filePercentDone ) );
    }
    if( updatePriority || updateWanted ) {
      row.down( "led" ).value = getPriority( fileStat );
    }
  } );
}

function showPeers( torrent ) {
  var peerDiv = $( "peerDiv" );
  if( !peerDiv ) {
    peerDiv = rD( { id: "peerDiv" } );
    peerDiv.addClassName( "torrent" );
    globals.content.insert( peerDiv );
  }

  const peersFromTable = getTable( "peersFromTable", peerDiv, peersFromColumns, undefined, function( t ) {
    renderKeyValuePairs( t.body, torrent.peersFrom, null, false );
    t.table.addClassName( "peersFrom keyvalue" );
  } );
  updateKeyValuePairs( torrent.peersFrom );

  const peerTable = getTable( "peerTable", peerDiv, peerColumns, undefined, undefined, function( e ) {
    renderPeers( e.target.id.substring( 2 ) || undefined );
  } );

  const renderPeers = function( property ) {
    const peerBody = peerTable.down( "tbody" );
    if( undefined === property ) {
      const currentPeers = torrent.peers.pluck( "address" );
      peerBody.childElements().each( function( row ) {
        if( !currentPeers.includes( row.id.substring( 2 ) ) ) {
          row.remove();
        }
      } );
    }
    property = updateOrder( peerColumns, property );
    var order = peerColumns[ property ].order;
    const nodes = peerBody.childNodes;
    torrent.peers.indexify().sortByProperty( property, order ).each( function( peer, i ) {
      const id = "p_" + peer.address;
      peerBody.insertBefore( renderRow( peer, peerColumns, $( id ) || id ), nodes[ i ] );
    } );
  }

  renderPeers();
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
        if( column && column.click ) {
          column.click( e, id );
        }
      }
    } );

    const tl = undefined === torrent.trackerList;
    const trackerArea = rT( "styled " + ( tl ? "add" : "list" ) );
    trackerArea.value = torrent.trackerList || "" ;

    const p = Object.entries( {
      "popupTrackerUpdate": function( e ) {
        globals.action = e.target.id;
        switch( globals.action ) {
          case "update":
            fixTorrents( { ids: [ torrent.id ], trackerList: trackerArea.value.match( trackerRegExp ).filter( function( v, i, a ) {
              return i === a.indexOf( v );
            } ).join( "\n\n" ) }, function( response ) {
              if( success( response ) ) {
                fetchTorrents( [ "id", "trackerList" ], [ torrent.id ], function( response ) {
                  if( success( response ) ) {
                    trackerArea.value = updateTorrents( response )[ 0 ].trackerList;
                  }
                } )
              }
            } );
        }
      },
      "popupTrackerAdd": function( e ) {
        globals.action = e.target.id;
        switch( globals.action ) {
          case "add":
            addTrackers( [ torrent.id ], trackerArea.value, function() {
              trackerArea.value = "";
            } );
        }
      }
    } )[ tl ? 1 : 0 ];

    const trackerLed = rLed().observe( "click", function( e ) {
      showPopup( p[ 0 ], p[ 1 ], e );
    } );
    t.footer.insert( rR().insert( rC().insert( trackerLed ) ).insert( rC( { colspan: 8 } ).insert( trackerArea ) ) );
  }, function( e ) {
    renderTrackers( e.target.id.substring( 2 ) || undefined );
  } );

  const renderTrackers = function( property ) {
    const trackerBody = trackerTable.down( "tbody" );
    if( undefined === property ) {
      const currentTrackers = torrent.trackerStats.ids();
      trackerBody.childElements().each( function( row ) {
        if( !currentTrackers.includes( +row.id.substring( 2 ) ) ) {
          row.remove();
        }
      } );
    }

    property = updateOrder( trackerColumns, property );
    var order = trackerColumns[ property ].order;
    const nodes = trackerBody.childNodes;
    const _tier = function( i ) {
      trackerBody.insertBefore( rR( "tier" ).insert( rC( { colspan: Object.keys( trackerColumns ).length } ) ), nodes[ i ] );
    }

    var tier = 0;
    var index = 0;
    torrent.trackerStats.indexify().sortByProperty( property, order ).each( function( tracker ) {
      const id = "t_" + tracker.id;
      if( tier !== tracker.tier ) {
        index && _tier( index++ );
        tier = tracker.tier;
      }
      trackerBody.insertBefore( renderRow( tracker, trackerColumns, $( id ) || id ), nodes[ index++ ] );
    } );

    var row = trackerBody.lastElementChild;
    while( row && "tier" === row.className ) {
      var tier = row;
      row = row.previousElementSibling;
      tier.parentNode.removeChild( tier );
    }

    if( !nodes[ index ] ) {
      _tier();
    }
  }

  renderTrackers();

  const webseedTable = getTable( "webseedTable", trackerDiv, webseedColumns, undefined, function( t ) {
    torrent.webseeds.each( function( webseed ) {
      t.body.insert( rR().insert( rC().insert( rD().insert( webseed ) ) ) );
    } )
  } );

  globals.oldTrackerStats = torrent.trackerStats;
}

function renderFooter( click, noScreenshotModeCheck ) {
  const clipboardLed = rLed().makeToggle().addClassName( "clipboard" );
  clipboardLed.copy = function( data ) {
    if( this.value ) {
      copyObjectToClipboard( data );
    }
  };
  return rR().insert( rC(), rC().insert( rB( {}, function() {
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
    t.table.addClassName( "torrent keyvalue" );
    torrent._dirty = [];
    globals.percentDone = null;
    globals.pieceCount = torrent.pieceCount;
    renderKeyValuePairs( t.body, torrent, "d_", torrentFields );

    const moveLed = rLed( true, { id: "d_move", title: "Move" } ).makeToggle();
    t.table.down( "#d_downloadDir" ).insert( { top: moveLed } );

    t.footer.insert( renderFooter( function( clipboard ) {
      showWait();
      const data = getKeyValuePairs( torrent, "d_", torrentFields );
      if( clipboard.value ) {
        const t = Object.extend( Object.clone( torrent ), data );
        Object.without( t, Object.keys( t ).filter( function( k ) { return "_" === k[ 0 ] } ) );
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
              return doRequest( "torrent-set-location", { ids: [ torrent.id ], location: data[ f ], move: moveLed.value }, _update );
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
    if( k[ 0 ] === "_" ) {
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
    else if( Object.isString( o ) ) {
      v = ( cell.down( "input" ) || cell.down( "div.pathselect" ) ).value;
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
    else {
      continue;
    }
    if( null !== v && v !== object[ k ] ) {
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
    if( k[ 0 ] === "_" || f && f._ignore ) {
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
    if( f && false === f.render ) {
      content = undefined;
    }
    else if( f && f.render ) {
      content = f.render( content, valueCell );
    }
    else if( f && f.values ) {
      if( !ro ) {
        content = renderSelect( { options: f.values, focus: lock.curry( fields, k ) } );
        content.value = o;
      }
    }
    else if( Object.isArray( o ) ) {
      content = renderSelect( { options: normalizeOptions( o ), value: o[ 0 ] } );
    }
    else if( Object.isBoolean( o ) ) {
      content = rLed( o );
      if( ro ) {
        content.setReadOnly();
      }
      else {
        content.makeToggle( function() { lock( fields, k ) } );
      }
    }
    else if( !Object.isNumber( o ) && !Object.isString( o ) ) {
      return;
    }

    if( ro ) {
      valueCell.setReadOnly();
    }
    else if( f && f.renderAdvanced ) {
      content = f.renderAdvanced( o, content );
    }
    else if( createInput && !Object.isElement( content ) ) {
      content = rI( content, { focus: lock.curry( fields, k ) } );
    }
    if( undefined !== content ) {
      valueCell.insert( content );
    }
  } );
}

function updateKeyValuePairs( object, idPrefix, fields, unlock ) {
  idPrefix = idPrefix || "";
  Object.keys( object ).sort().each( function( k ) {
    const f = fields ? fields[ k ] : false === fields ? false : null;
    if( unlock && f && f.locked ) {
      delete f.locked;
    }
    if( k[ 0 ] === "_" || f && ( f._ignore || f.locked ) ) {
      return;
    }

    const sss = globals.shift.settings.screenshotMode && f && f.sss;
    const o = sss ? true === sss ? k.capitalize() : sss( object[ k ] ) : object[ k ];

    const ro = false === f || f && f._ro;
    const valueCell = $( idPrefix + k );

    if( !valueCell && !( f && f.setValue ) ) {
      return;
    }

    var content = o;
    if( f && f.setValue ) {
      f.setValue( content, cell );
      return;
    }
    else if( f && f.render ) {
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
      updateElement( valueCell, content );
    }
    else if( !Object.isElement( content ) ) {
      const input = valueCell.down( "input" );
      input ? input.value = content : updateElement( valueCell, content );
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
          doRequest( "session-set", data, function( response ) {
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

function toRule( field, matches, labels ) {
  if( Array.isArray( field ) ) {
    return toRule.apply( null, field );
  }
  return {
    field: field || "name",
    matches: matches || [],
    labels: labels || []
  }
}

const shiftFields = {
  "dark": {
    getValue: function() {
      return $( "darkLed" ).value;
    },
    _ignore: true
  },
  "labelMaticRules": {
    getValue: function( cell ) {
      return this.value.map( function( rule ) {
        return Object.pluck( rule, "field", "matches", "labels" );
      } );
    },
    render: false,
    renderAdvanced: function( rules, content ) {
      rules = this.value = globals.rules;
      return getTable( "ruleTable", undefined, ruleColumns, undefined, function( t ) {
        const _adjust = function( a ) {
          a.style.height = "auto";
          a.style.height = a.scrollHeight + "px";
        }
        t.columns.lastChild.setSpan( 2 );
        t.header.down( "tr" ).lastChild.setSpan( 2 );

        const _render = function() {
          rules.each( function( rule ) {
            t.body.insert( renderRow( rule, ruleColumns, rule._node, function( r ) {
              rule._node = r;
              r._data = rule;
              r.down( "select" ).observe( "change", function( e ) {
                rule.field = e.target.value;
              } );
              const m = r.down( "textarea" );
              m._data = rule.matches;
              m.value = rule.matches.join( "\n" );
              m.observe( "keydown", function( e ) { _adjust( m ) } );
              m.observe( "change", function( e ) {
                rule.matches.replace( m.value.split( "\n" ) );
              } );
              return r.insert( rC().insert( rB( "Delete", function( e ) {
                rule._node.remove()
                rules.remove( rule );
              } ) ) );
            } ).addClassName( "rule" ) );
          } );
        };
        _render();

        t.footer.insert( rR().insert( rC().setSpan( 4 ).insert( rB( "Add", function( e ) {
          rules.push( toRule() );
          _render();
        } ) ) ) );
        setTimeout( function() {
          $( "ruleTable" ).select( "textarea" ).each( _adjust );
        }, 10 );
      } ).addClassName( "styled" );
    },
    value: []
  },
  "labels": {
    getValue: function( cell ) {
      return this.value;
    },
    render: false,
    renderAdvanced: labelEditor
  },
  "localStorageEnabled": { _ro: true },
  "paths": {
    getValue: function( cell ) {
      return this.value;
    },
    render: false,
    renderAdvanced: function( paths, content ) {
      const self = this;
      paths = self.value = [].concat( paths ).pushUnique( globals.shift.session[ "download-dir" ] ).compact();
      paths = globals.shift.settings.screenshotMode ? paths.map( function( p, i ) { return "Path" + i } ) : paths;
      const _new = function( p ) { return { path: p, count: 0 } }
      paths = paths.map( _new );
      const pathHash = paths.reduce( function( r, p ) { r[ p.path ] = p; return r }, {} );
      const pathTable = getTable( "pathTable", undefined, pathColumns ).addClassName( "styled" );
      const body = $( pathTable.down( "tbody" ) ).observe( "click", function( e ) {
        if( "LED" === e.target.tagName ) {
          e.stop();
          const led = e.target;
          const p = paths[ body.indexOf( led.up( "tr" ) ) ].path;
          globals.torrents.each( function( t ) {
            if( p === t.downloadDir ) {
              t.selected = led.value;
            }
          } );
        }
      } );

      const _render = function() {
        paths.each( function( path ) {
          const row = path.node = renderRow( path, pathColumns, path.node );
          row.down( "led" )[ sh( path.count ) ]().makeToggle();
          body.insert( row );
        } );
      };
      _render();

      $( pathTable.down( "tfoot" ) ).insert( rR().insert( rC().setSpan( 5 )
      .insert( rB( "Edit Paths", function() {
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
          paths.pushUnique( values.map( function( p ) {
            return Object.isString( p ) ? _new( p ) : p;
          } ) ) ;
          _render();
          self.value.setLength( 0 ).pushUnique( paths.pluck( "path" ) );
        }
        showPopup( "popupPaths" );
      } ) )
      .insert( rB( "Scrape Paths", function() {
        paths.each( function( p ) { p.count = 0 } );
        fetchDownloadDirs( undefined, function ( response ) {
          updateTorrents( response ).each( function( torrent ) {
            const k = torrent.downloadDir;
            ( pathHash[ k ] = pathHash[ k ] || paths.squeak( _new( k ) ) ).count++;
          } );
          paths.pushUnique( Object.values( pathHash ) );
          _render();
          self.value.setLength( 0 ).pushUnique( paths.pluck( "path" ) );
        } )
      } ) )
      .insert( rB( "Free Space", function() {
        paths.pluck( "path" ).shiftEach( function( path, _next ) {
          doRequest( "free-space", { "path": path }, function( response ) {
            const args = getArguments( response );
            const path = pathHash[ args.path ];
            path.free = args[ "size-bytes" ];
            path.total = args[ "total_size" ];
            _next();
          } );
        }, _render );
      } ) ) ) );

      return pathTable;
    },
    value: []
  },
  "styleSheet": {
    renderAdvanced: function( styleSheets, content ) {
      return [ content, rLed( globals.shift.settings.dark, { id: "darkLed" } ).makeToggle(), "Dark" ];
    }
  },
  "trackers": {
    getValue: function( cell ) {
      return $( "trackers_add" ).value;
    },
    render: false,
    renderAdvanced: function( trackers, content ) {
      return [
        rT( { id: "trackers_remove", "class": "styled", style: "resize: vertical", placeholder: "Remove" } ).hide(),
        rT( { id: "trackers_add", "class": "styled", style: "resize: vertical", placeholder: "Add" } ).insert( trackers )
      ]
    }
  }
}

function fetchTrackers( _callback, id, _next ) {
  fetchTorrents( [ "id", globals.version < 17 ? "trackers" : "trackerList" ], [ id ], function( response ) {
    if( success( response ) ) {
      _callback( getArguments( response ).torrents[ 0 ], _next );
    }
    else {
      _next();
    }
  } );
}

function matchTrackers( trackers, list ) {
  return result = trackers.reduce( function( r, tracker ) {
    list.includes( tracker.announce ) && r.push( [ tracker.id, tracker.announce ] );
    return r;
  }, [] );
}

function addTrackers( ids, add, _done ) {
  ids = isEmpty( ids ) ? globals.torrents.ids() : ids;

  add = add.match( trackerRegExp );
  if( isEmpty( add ) ) {
    return _done( "Error: No trackers to add." );
  }

  if( globals.version < 17 ) {
    fixTorrents( { ids: ids, trackerAdd: add }, function( response ) {
      if( success( response ) ) {
        return _done();
      }

      ids.shiftEach( fetchTrackers.curry( function( torrent, _next ) {
        const trackers = add.withoutArray( matchTrackers( torrent.trackers, add ).pluck( 1 ) );
        if( !trackers.length ) {
          return _next();
        }
        fixTorrents( { ids: [ torrent.id ], trackerAdd: add.withoutArray( trackers.pluck( 1 ) ) }, _next );
      } ), _done );
    } );
  }
  else {
    modifyTrackerList( ids, add, undefined, _done );
  }
}

function removeTrackers( ids, remove, _done ) {
  ids = isEmpty( ids ) ? globals.torrents.ids() : ids;

  remove = remove.match( trackerRegExp );
  if( isEmpty( remove ) ) {
    return _done( "Error: No trackers to remove." );
  }

  if( globals.version < 17 ) {
    fixTorrents( { ids: ids, trackerRemove: remove }, function( response ) {
      if( success( response ) ) {
        return _done();
      }
      ids.shiftEach( fetchTrackers.curry( function( torrent, _next ) {
        const trackers = matchTrackers( torrent.trackers, remove );
        if( !trackers.length ) {
          return _next();
        }
        fixTorrents( { ids: [ torrent.id ], trackerRemove: trackers.pluck( 0 ) }, _next );
      } ), _done );
    } );
  }
  else {
    modifyTrackerList( ids, undefined, remove, _done );
  }
}

function modifyTrackerList( ids, add, remove, _done ) {
  ids = isEmpty( ids ) ? globals.torrents.ids() : ids;

  add = add && add.match( trackerRegExp );
  remove = remove && remove.match( trackerRegExp );
  if( globals.version < 17 ) {
    if( isEmpty( add ) || isEmpty( remove ) || add.length !== remove.length ) {
      return _done( "Error: Tracker add/remove empty or mismatch." );
    }

    const replace = remove.zip( add );
    fixTorrents( { ids: ids, trackerReplace: replace }, function( response ) {
      if( success( response ) ) {
        return _done();
      }
      const map = replace.reduce( function( r, e ) {
        r[ e[ 0 ] ] = e[ 1 ];
        return r;
      }, {} )
      ids.shiftEach( fetchTrackers.curry( function( torrent, _next ) {
        const trackers = matchTrackers( torrent.trackers, replace.pluck( 0 ) );
        if( !trackers.length ) {
          return _next();
        }
        fixTorrents( { ids: [ torrent.id ], trackerReplace: trackers.each( function( tracker ) {
          tracker[ 1 ] = map[ tracker[ 1 ] ];
        } ) }, _next );
      } ), _done );
    } );
  }
  else {
    ids.shiftEach( fetchTrackers.curry( function( torrent, _next ) {
      const trackers = torrent.trackerList.split( "\n" );
      const l = trackers.length;
      if( add ) {
        add.length && trackers.pushUnique( add );
        if( undefined === remove && l <= trackers.length ) {
          return _next();
        }
      }
      if( remove ) {
        remove.length && Array.prototype.without.apply( trackers, remove );
        if( undefined === add && trackers.length <= l ) {
          return _next();
        }
      }
      fixTorrents( { ids: [ torrent.id ], trackerList: trackers.join( "\n" ) }, _next );
    } ), _done );
  }
}

function renderTrackerCell( cell ) {
  const tb = rB( "trackers on all torrents" );
  const ta = cell.down( "textarea#trackers_add" );
  const tr = cell.down( "textarea#trackers_remove" );
  const elements = [ tb, ta, tr ];

  const tm = rS();

  const _done = function( result ) {
    tm.update( result );
    elements.invoke( "enable" );
  }

  const x = {
    "add_trackers": {
      click: function( e ) {
        ta.show();
        tr.hide();
        tr.insert( { after: ta } );
      },
      action: function( e ) {
        addTrackers( [], ta.value, _done );
      }
    },
    "remove_trackers": {
      click: function( e ) {
        ta.hide();
        tr.show();
        ta.insert( { after: tr } );
      },
      action: function( e ) {
        removeTrackers( [], tr.value, _done );
      }
    },
    "replace_trackers": {
      click: function( e ) {
        ta.show();
        tr.show();
        tr.insert( { after: ta } );
      },
      action: function( e ) {
        modifyTrackerList( [], ta.value, tr.value, _done );
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

  cell.insert( tb.observe( "click", function( e ) {
    e.stop();
    elements.invoke( "disable" );
    x[ first.getRadio().id ].action( e );
  } ) );

  cell.insert( tm );

  first.click();
}

function setQueuePositionBy( property ) {
  const batchIds = [];
  const batchTotal = [];
  var _requeue = [];
  showWait();

  showPopup( "popupProgress" );
  const d = globals.dialogs.progress;
  d.bar.max = 1;
  d.bar.value = 0;

  const _msg = function( s ) {
    d.message.update( s ? s + ", better not close Shift." : "" );
  }
  _msg( "Calculating moves" );

  const _q = function( t ) {
    return undefined === t.queuePosition ? _requeue.length : t.queuePosition;
  }

  const fields = [ "id", "queuePosition", property ];

  fetchTorrents( fields, undefined, function( response ) {
    updateTorrents( response );
    _requeue = globals.torrents.map( function( t ) {
      return Object.copyNestedProperties( t, {}, fields );
    } ).sortByProperty( "queuePosition" ).sortByProperty( property );

    var t = _requeue[ 0 ];
    var pos = _q( t );
    var maxQueuePosition = pos;
    var ids = [ t.id ];
    for( var i = 1, l = _requeue.length; i < l; ++i ) {
      t = _requeue[ i ];
      pos = _q( t );
      if( maxQueuePosition < pos ) {
        batchIds.push( ids );
        ids = [];
      }
      maxQueuePosition = pos;
      ids.push( t.id );
    }
    batchIds.push( ids );

    d.bar.max = batchIds.length;

    globals.cancel = function( e ) {
      batchIds.length = 0;
    }

    batchIds.shiftEach( function( ids, _next ) {
      d.bar.value = d.bar.max - batchIds.length;
      _msg( batchIds.length && batchIds.length + " move(s) left" );
      Array.prototype.splice.apply( batchTotal, [ batchTotal.length, 0 ].concat( ids ) );
      doRequest( "queue-move-bottom", { ids: batchTotal }, _next );
    }, showDone );
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
    for( i = 0, l = a.length; i < l; ++i ) {
      const s = a[ i ].animationName;
      if( s && s.includes( "fullcircle" ) ) {
        a[ i ].currentTime = new Date().getTime() % 3600000;
        break;
      }
    }
  }
}

function rulesToTorrent( rules, t ) {
  t.labels = t.labels || [];
  rules.each( function( rule ) {
    rule._regs.each( function( r ) {
      if( r.test( t[ rule.field ] ) ) {
        t.labels.pushUnique( rule.labels );
      }
    } );
  } );
  return t;
}

function applyLabelMaticRules( rules, torrents ) {
  if( isEmpty( rules ) ) {
    return;
  }

  const fields = [ "id", "labels" ].pushUnique( rules.pluckUnique( "field" ) );
  rules.each( function( rule ) {
    rule._regs = rule.matches.map( function( m ) { return new RegExp( m, "i" ) } );
  } )

  const ids = torrents.filter( function( t ) {
    return fields.find( function( field ) {
      return isEmpty( t[ field ] );
    } )
  } ).ids();

  const _apply = function( torrents ) {
    torrents.reduce( function( r, t ) {
      t.labels = t.labels || [];
      const l = t.labels.length;
      rules.each( function( rule ) {
        rule._regs.each( function( r ) {
          if( r.test( t[ rule.field ] ) ) {
            t.labels.pushUnique( rule.labels );
          }
        } );
      } );
      if( l != t.labels.length ) {
        r.push( t );
      }
      return r;
    }, [] ).shiftEach( fixLabels.curry( true, [] ) );
  }

  if( isEmpty( ids ) ) {
    _apply( updateTorrents( torrents ) );
  }
  else {
    fetchTorrents( fields, ids, function( response ) {
      _apply( updateTorrents( response ) );
    } );
  }
}

function showShiftTable() {
  if( showContent( "shiftTable" ) ) {
    return;
  }

  getTable( "shiftTable", globals.content, shiftColumns, undefined, function( t ) {
    t.table.addClassName( "keyvalue" );
    renderKeyValuePairs( t.body, globals.shift.settings, "s_", shiftFields );

    var e;

    const labels = 16 <= globals.version; // 3.00
    if( labels ) {
      if( e = t.body.down( "td#s_labelMaticEnabled" ) ) {
        e.insert( rB( "Activate now", function( e ) {
          applyLabelMaticRules( shiftFields.labelMaticRules.value, globals.torrents );
        } ) );
      }
      if( e = t.body.down( "td#s_labels" ) ) {
        e.down( "span.labels" ).setId( "shiftLabels" );
      }
    }

    t.body.down( "td#s_minSeeders" ).insert( rB( "Stop seeding", function() {
      const minSeeders = $( "s_minSeeders" ).down( "input" ).value;
      fetchTorrents( [ "id", "trackerStats" ], filterStatus( globals.version < 14 ? 8 : 6 ).ids(), function( response ) {
        var torrents = getArguments( response ).torrents;

        if( isEmpty( torrents ) ) {
          return;
        }

        const keys = torrents[ 0 ];
        if( Array.isArray( keys ) ) {
          torrents = torrents.reduce( function( r, t, i ) {
            if( 1 < i ) {
              const o = {};
              for( var i = 0, l = keys.length; i < l; ++i ) {
                o[ keys[ i ] ] = t[ i ];
              }
              r.push( o );
            }
            return r
          }, [] );
        }

        torrents = torrents.filter( function( torrent ) {
          const stats = torrent.trackerStats;
          for( var i = 0, l = stats.length; i < l; ++i ) {
            if( minSeeders <= stats[ i ].seederCount ) {
              return true;
            }
          }
          return false;
        } );
        doRequest( "torrent-stop", { ids: torrents.ids() }, updateTorrents )
      } );
      return;
    } ) );

    if( 10 <= globals.version ) { // 2.10
      renderTrackerCell( t.body.down( "td#s_trackers" ) );
    }

    if( 14 <= globals.version ) { // 2.40
      t.body.insert( rR().insert( rC().insert( "Set queue positions" ), rC( { id: "s_queuePositions" } ).insert( rB( "Date", setQueuePositionBy.curry( "addedDate" ) ) ) ) );
    }

    _clear = function( local ) {
      if( confirm( "Are you sure you want to delete all settings in " + ( local ? "localStorage" : "the cookie" ) + "?" ) ) {
        store( {}, true, local );
      }
    }

    t.body.insert( rR().insert( rC().insert( "Clear local " ), e = rC( { id: "s_clearStorage" } ) ) );
    e.insert( rB( "Cookie", _clear.curry( false ) ), rB( "Storage", _clear.curry( true ) ) );

    t.footer.insert( renderFooter( function( clipboard ) {
      const d = globals.shift.defaultSettings;
      const s = globals.shift.settings;
      var data = getKeyValuePairs( s, "s_", shiftFields );
      if( globals.shift.settingsChanged = !isEmpty( data ) ) {
        const deactivated = false === data.screenshotMode;
        data = deactivated ? { screenshotMode: false } : data;
        Object.extend( s, data );
        clipboard.copy( s );
        if( data.styleSheet || undefined !== data.dark ) {
          setStylesheet( data.styleSheet[ 0 ], data.dark );
        }
        deactivated && updateKeyValuePairs( s, "s_", shiftFields );
        data = Object.diff( s, d );
        for( k in data ) {
          if( undefined === d[ k ] ) {
            delete data[ k ];
          }
        }
        store( data );
        labels &&  $( "labels" )._data.replace( s.labels ).renderLabels(); // Update in main torrents view.
        if( s.notificationLevel > 0 ) {
          if( data.notificationLevel > 0 && "granted" !== Notification.permission ) {
            Notification.requestPermission();
          }
          sendNotification( 3, "Shift settings Changed.", { body: prettify( data ) } );
        }
        renderDoneSound();
      }
      playDoneSound();
    }, true ) );
    $( t.footer ).down( "button.apply" ).insert( { after: rB( "Revert", function( e ) {
      e && e.stop();
      doRequest( { url: "shift.json", evalJSON: "force", method: "get", onSuccess: function( response ) {
        const d = globals.shift.defaultSettings = response.responseJSON;
        const s = globals.shift.settings;
        const rd = {};
        const rs = {};

        const _a = function( a ) {
          return Object.isArray( a ) ? a.join( ", " ) : a;
        }

        const fields = Object.keys( s ).pushUnique( Object.keys( d ) ).sort().reduce( function( r, k ) {
          if( !Object.equals( d[ k ], s[ k ] ) ) {
            rs[ k ] = _a( s[ k ] );
            rd[ k ] = _a( d[ k ] );
            r[ k ] = { _ro: true };
          }
          return r;
        }, {} );

        const x = $( "revertTable" ).down( "tbody" ).update();
        const y = rE( "tbody" );
        renderKeyValuePairs( x, rs, "_x_", fields );
        renderKeyValuePairs( y, rd, "_y_", fields );

        const keys = Object.keys( fields );
        const z = y.select( "td:last-child" );
        globals.dialogs.revert.value = x.select( "tr" ).reduce( function( r, row, index ) {
          const cells = row.select( "td" );
          const l = rLed( true );
          cells[ 0 ].insert( { after: rC().insert( l ) } );
          const l2 = rLed();
          l.addRadio( l2 );
          row.insert( rC().insert( l2 ), z[ index ] );
          const k = keys[ index ];
          r[ k ] = { led: l, d: d[ k ], s: s[ k ] };
          return r;
        }, {} );
        showPopup( "popupRevert" );
      } } );
    } ) } );
  } );
}

function showContent( content ) {
  var result = false;
  if( content ) {
    content = $( content );
  }
  if( content ) {
    content.wasVisible = content.visible();
    content.show();
  }
  globals.content.childElements().without( content ).hideAll();
  return content;
}

var menuSelected = null;

// Returns true if a new menu item was selected.
function menuSelect( item ) {
  const menuId = createId( "menu_", item );
  if( menuSelected ) {
    if( menuSelected.id === menuId ) {
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

function renderDialogPopup( id, header ) {
  return renderPopup( id ).addClassName( "dialog" ).insert( rE( "h1", {}, header ) );
}

function renderMenuItems( items, render ) {
  return items.map( function( item ) {
    return rE( "li", { id: item.toLowerCase(), tabindex: 0 } ).insert( render ? render( item ) : item );
  } );
}

function renderMenuPopup( id, items, render ) {
  return renderPopup( id ).insert( rE( "menu" ).insert( renderMenuItems( items, render ) ) );
}

function renderReloadDate( d ) {
  if( !d ) {
    return "";
  }
  var s = d.toISOString();
  return s.substring( 0, 10 ) + " " + s.substring( 11, 19 );
}

function renderPage() {
  const rCancel = function( style, text ) {
    return rB( { "class": style, value: text || "Cancel" }, closePopup );
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
        const search = d.search.value.toRegExp( isRegExp );

        var replace = d.replace.value;
        if( isRegExp && 0 === replace.length ) {
          for( var i = 1, l = ( d.search.value + "|" ).toRegExp().exec( "" ).length; i < l; ++i ) {
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
        const search = d.search.value.toRegExp( d.isRegExp.value );

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
    _: document.createDocumentFragment(), // Stash to keep eventhandlers.
    action: rB( { "class": "action", value: "Action" }, handleTorrentActionClick ),
    add: {
      file: rI( "", { type: "file", multiple: "multiple", change: function( e ) {
        _file( e );
        d.add.fileName.value = Array.from( e.currentTarget.files ).pluck( "name" ).join( ";" );
      } } ).hide(),
      isFile: rLed(),
      fileName: rI( "", { click: _browse, focus: _file } ).setReadOnly(),
      browse: rB( { id: "browse", "class": "add", value: "Browse", focus: _file }, _browse ),
      isUrl: rLed(),
      url: rI( "", { change: _url, focus: _url, keypress: _url } ),
      paths: rI(),
      start: rLed().makeToggle().setValue( globals.shift.session[ "start-added-torrents" ] ),
      uploading: rB( { "class": "add", value: "Uploading" }, function( e ) {
        e && e.stop();
        showPopup( "popupUpload" );
      } ),
      add: rB( { "class": "add", value: "Add" }, function( e ) {
        e.stop();
        closePopup( e );
        const d = globals.dialogs.add;
        const file = d.isFile.getRadio() === d.isFile;
        const input = d[ file ? "fileName": "url" ];
        if( input.value.length ) {
          upload( file ? Array.from( d.file.files ) : [ input.value ], persistPath( d.paths.value ), d.start.value );
          input.value = "";
        }
      } )
    },
    additional: rD( "additional" ),
    buttons: rD( "buttons" ),
    batchrename: {
      search: rI( "", { change: a.batchrename._preview } ),
      searchPreview: rS( "example" ),
      isRegExp: rLed( false, { title: "Regular Expression" } ).makeToggle( a.batchrename._preview ),
      replace: rI( "", { change: a.batchrename._preview } ),
      replacePreview: rS( "example" ),
      rename: rB( { "class": "rename", id: "batchrename", value: "Rename" }, function( e ) {
        e.stop();
        closePopup( e );
        const p = d.batchrename;
        if( p.replace.value === p.search.value ) {
          return;
        }

        const search = p.search.value.toRegExp( p.isRegExp.value );
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
      paths: rD( { id: "paths", "class": "styled", contentEditable: "true", spellcheck: "false" } )
      .observe( "keydown", function( e ) {
        e.stopPropagation();
        switch( e.keyCode ) {
        case 13: // Enter
          e.stop();
          document.execCommand( "insertHTML", false, "\n" );
          break;
        case 27: // Esc
          closePopup( e );
        }
      } ),
      apply: rB( { "class": "paths" }, function( e ) {
        e.stop();
        closePopup( e );
        if( globals.shift.settings.screenshotMode ) {
          return;
        }
        const callback = globals.dialogs.paths.callback;
        callback && callback( $( "paths" ).textContent.split( "\n" ).grep( /([^\s])/ ).invoke( "trim" ).uniq() );
      } ),
      callback: undefined
    },
    progress: {
      message: rS( { id: "progress_message" } ),
      bar: rE( "progress", { id: "progress_bar", max: 100, value: 0 }, "" ).insert( rD().insert( rS() ) ),
      finished: rLed( true ).makeToggle(),
      close: rCancel().update( "Close" ),
      cancel: rB( "Cancel", function( e ) {
        closePopup( e );
        globals.cancel && globals.cancel( e );
        delete globals.cancel;
      } )
    },
    relocate: {
      _open: function() {
        const t = globals.currentTorrent;
        if( !t.downloadDir ) {
          fetchDownloadDirs( [ t.id ], function( response ) {
            updateTorrents( response );
            const s = d.relocate.paths && d.relocate.paths.down( "select" );
            if( s ) {
              if( !s.includes( t.downloadDir ) ) {
                s.add( rO( t.downloadDir ) );
              }
              s.value = t.downloadDir;
            }
          } );
        }
        d.additional.update();
        const c = d.relocate;
        d.additional.insert( rL( "To" ), c.paths = renderPathSelect( t.downloadDir ) );
        d.buttons.insert( c.move.setValue( true ), c.moveLabel, c.substitute, d.cancel, d.action );
        return true;
      },
      paths: null,
      move: rLed( true ).makeToggle(),
      moveLabel: rL( " Move" ),
      substitute: rB( { id: "substitute", "class": "action", value: "Substitute" }, function( e ) {
        e.stop();
        closePopup();
        d.substitute.search.value = d.substitute.replace.value = globals.selected[ 0 ].downloadDir;
        d.substitute.search.change();
        d.substitute.selection.value = 1 < globals.selected.length;
        showPopup( "popupSubstitute" );
      } )
    },
    substitute: {
      search: rI().observe( "change", a.substitute._preview ),
      searchPreview: rS( "example" ),
      isRegExp: rLed( false, { title: "Regular Expression" } ).makeToggle().observe( "click", a.substitute._preview ),
      replace: rI().observe( "change", a.substitute._preview ),
      replacePreview: rS( "example" ),
      move: rLed( true ).makeToggle(),
      selection: rLed().makeToggle(),
      relocate: rB( { "class": "action", value: "Relocate" }, function( e ) {
        e.stop();
        closePopup();
        d.relocate._open();
        const p = showPopup( "popupDialog" );
        p.close = d.relocate.close;
      } ),
      substitute: rB( { "class": "substitute", id: "substitute", value: "Substitute" }, function( e ) {
        e.stop();
        closePopup();
        const p = globals.dialogs.substitute;
        if( p.replace.value === p.search.value ) {
          return;
        }

        const search = p.search.value.toRegExp( p.isRegExp.value );
        const replace = p.replace.value;
        var torrents = p.selection.value ? globals.selected : globals.torrents;

        const move = p.move.value;
        const _replace = function() {
          const _searcher = globals.actions.substitute._searcher( search );
          torrents.partitionBy( "downloadDir" ).shiftEach( function( batch, _next ) {
            if( !batch.find( _searcher ) ) {
              return _next();
            }
            doRequest( "torrent-set-location", { ids: batch.ids(), location: batch[ 0 ].downloadDir.replace( search, replace ), move: move }, _next );
          }, function() {
            fetchDownloadDirs( torrents.ids() );
          } );
        }

        var ids = torrents.filter( function( t ) { return !t.downloadDir } ).ids();
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
      _confirm: function( trash, confirm ) {
        d.buttons.insert( d.remove.trash.setValue( trash ), d.remove.trashLabel, d.cancel, d.action );
        return confirm;
      },
      _open: function() {
        return d.remove._confirm( false, globals.shift.settings.confirmRemove );
      },
      trash: rLed( true, { readonly: "readonly" } ),
      trashLabel: rL( "Trash" )
    },
    rename: {
      fileName: rI( "", { keydown: function( e ) {
        e.stopPropagation();
        switch( e.keyCode ) {
          case 13: // Enter
            const button = getVisible( "button.apply" );
            button && button.click();
            break;
          case 27: // Esc
            closePopup( e );
        }
      }
      } ),
      rename: rB( { "class": "apply", id: "rename", value: "Rename" }, handleTorrentActionClick )
    },
    revert: {
      table: rTable( "revertTable" ),
      revert: rB( { "class": "apply", id: "revert", value: "Revert" }, function( e ) {
        e.stop();
        closePopup();
        const v = globals.dialogs.revert.value;
        updateKeyValuePairs( Object.extend( globals.shift.settings, Object.keys( v ).reduce( function( r, k ) {
          const o = v[ k ];
          r[ k ] = o.led.value ? o.s : o.d;
          return r;
        }, {} ) ), "s_", shiftFields, true );
      } )
    },
    torrents: rD( "torrents" ),
    trash: {
      _open: function() {
        return d.remove._confirm( true, globals.shift.settings.confirmTrash );
      }
    },
    upload: {
      uploads: rD( { id: "uploads" } ).observe( "dblclick", function( e ) {
        const l = e.findElement( "div.upload" );
        l && l.item.clear( true );
      } ),
      keep: rLed().makeToggle(),
      silent: rLed().makeToggle().toggle(),
      start: rLed().makeToggle().setValue( globals.shift.session[ "start-added-torrents" ] ),
      add: rB( { "class": "upload", value: "Add" }, showAddPopup ),
      close: rCancel( "upload", "Close" ),
      clear: rB( { "class": "upload", value: "Clear" }, function( e ) {
        e.stop();
        const uploadsElement = $( "uploads" );
        uploadsElement.select( "div.upload" ).each( function( div ) {
          const led = div.down( "led" );
          if( led.hasClassName( "added" ) || led.hasClassName( "duplicate" ) ) {
            div.item && div.item.clear( true );
          }
        } );
        if( uploadsElement.empty() ) {
          closePopup( e );
        }
      } )
    }
  }
  d._.insert = Element.insert.curry( d._ );

  d.add.isFile.addRadio( d.add.isUrl ).click();

  d.remove.insert = Object.values( d.remove );
  d.rename.insert = Object.values( d.rename );

  d.revert.table.down( "colgroup" ).insert( [ "key", "local", "value", "remote", "value" ].map( rCol ) );
  d.revert.table.down( "thead" ).insert( rE( "tr" ).insert( [ "Key", "", "Local (Cookie)", "", "Remote" ].map( function( h ) { return rH().insert( h ) } ) ) );

  const popups = rD( { id: "popups" } ).insert(
    renderDialogPopup( "popupAbout", "Shift / Transmission" )
      .insert(
        "<h2>By Killemov</h2>Version: " +
        globals.shift.version + " / " + globals.shift.session.version +
        "<p>Shift is a minimalistic approach to maximum control of your Transmission.</p>" +
        "<p>Shift is currently targeted at Mozilla Firefox 4+<br>" +
        "with degraded and untested functionality for other or older browsers.<br><br>" +
        "Shift is built on prototype.js. ( V" + Prototype.Version + " - Hacked! )</p>" )
      .insert( rD().insert( $( "license" ).show() ).insert( rCancel( "about", "Close" ) ) )
  ).insert(
    renderDialogPopup( "popupAdd", "Add a torrent" )
      .insert( rI( "", { type: "file", multiple: "multiple" } ).hide() )
      .insert( rD().insert( d.add.isFile, rL( "File" ), d.add.fileName, d.add.browse ) )
      .insert( rD().insert( d.add.isUrl, rL( "Url" ), d.add.url ) )
      .insert( rD().insert( rL( "Dir", { "class": "add", id: "dir" } ), d.add.paths ) )
      .insert( rD().insert( d.add.start, rL( "Start", { id: "start" } ), d.add.uploading, rCancel( "add" ), d.add.add ) )
  ).insert(
    renderDialogPopup( "popupBatchRename", "Batch Rename" )
      .insert( rD().insert( rL( "Search" ), d.batchrename.search, d.batchrename.isRegExp ) )
      .insert( rD().insert( rL( "Example" ), d.batchrename.searchPreview ) )
      .insert( rD().insert( rL( "Replace" ), d.batchrename.replace ) )
      .insert( rD().insert( rL( "Example" ), d.batchrename.replacePreview ) )
      .insert( rD().insert( rCancel( "rename" ), d.batchrename.rename ) )
  ).insert(
    renderDialogPopup( "popupDialog", "Confirm" )
      .insert( "Are you sure you want to <span></span> the following torrent(s)" )
      .insert( d.torrents )
      .insert( d.additional )
      .insert( d.buttons.insert( d.cancel, d.action ) )
  ).insert(
    renderDialogPopup( "popupPaths", "Paths" )
      .insert( d.paths.paths )
      .insert( rD().insert( rCancel( "paths" ), d.paths.apply ) )
  ).insert(
    renderDialogPopup( "popupProgress", "Progress" )
      .insert( rD().insert( d.progress.message ) )
      .insert( rD().insert( d.progress.bar ) )
      .insert( rD().insert( d.progress.finished , " Reopen when finished ", d.progress.close, d.progress.cancel ) )
  ).insert(
    renderDialogPopup( "popupSubstitute", "Batch substitute paths" )
      .insert( rD().insert( rL( "Search" ), d.substitute.search, d.substitute.isRegExp ) )
      .insert( rD().insert( rL( "Example" ), d.substitute.searchPreview ) )
      .insert( rD().insert( rL( "Replace" ), d.substitute.replace ) )
      .insert( rD().insert( rL( "Example" ), d.substitute.replacePreview ) )
      .insert( rD().insert( rL(), d.substitute.move, rL( " Move " ), d.substitute.selection, rL( " Selection only" ), d.substitute.relocate, rCancel( "substitute" ), d.substitute.substitute ) )
  ).insert(
    renderDialogPopup( "popupReload", "Reloaded" )
      .insert( rD( "reloaded" ).insert( "Shift was exited at<br>" + renderReloadDate( rd ) ) )
      .insert( rD().insert( rCancel( "reloaded" ).update( "Ok" ) ) )
  ).insert(
    renderDialogPopup( "popupRename", "Rename" )
      .insert( rD().insert( rL( "Name" ), d.rename.fileName ) )
      .insert( rD().insert( rCancel( "rename" ), d.rename.rename ) )
  ).insert(
    renderDialogPopup( "popupRevert", "Revert" )
      .insert( rD( { "class": "scroll" } ).insert( d.revert.table ) )
      .insert( rD().insert( rCancel( "revert" ), d.revert.revert ) )
  ).insert(
    renderDialogPopup( "popupUpload", "Uploading" )
      .insert( d.upload.uploads )
      .insert( rD().insert( d.upload.keep, rL( "Keep" ), d.upload.silent, rL( "Silent" ), d.upload.start, rL( "Start" ), d.upload.add, d.upload.close, d.upload.clear ) )
  ).insert(
    renderMenuPopup( "popupFile", [ "folder" ].concat( filePriorityKeys ), rLed )
  ).insert(
    renderMenuPopup( "popupFiles", [ "Rename" ] )
  ).insert(
    renderMenuPopup( "popupGeneral", [ "Select Visible", "Deselect Visible", "Select All", "Deselect All", "Store Selection", "Restore Selection", "Reset" ] )
  ).insert(
    renderMenuPopup( "popupQueue", [ "Top", "Up", "Down", "Bottom" ] )
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
  $( "popupFile" ).down( "menu" ).insert( renderMenuItems( fileMenuItems ) );
  $( "popupTorrent" ).down( "li#remove" ).insert( { before: rD( "space" ) } );

  globals.popups = {
    "popups": popups
  };

  popups.select( ".popup" ).each( function( popup ) {
    globals.popups[ popup.id ] = popup;
  } );

  const header = rD( { id: "header" } );
  header
    .insert( rD( { id: "stats" } )
    .insert( rL( "Dl/Ul: " ) )
    .insert( rS( { id: "downloadSpeed" }, "0 Bs" ) ).insert( " / " )
    .insert( rS( { id: "uploadSpeed" }, "0 Bs" ) ).insert( rE( "br" ) )
    .insert( rL( "Total: " ) )
    .insert( rS( { id: "downloadedBytes" }, "0 B" ) ).insert( " / " )
    .insert( rS( { id: "uploadedBytes" }, "0 B" ) ).insert( rE( "br" ) )
    .insert( rL( "Free: " ) )
    .insert( rS( { id: "download-dir-free-space" }, "0 B" ) )
    .observe( "dblclick", function() {
      const f = $( "filterContainer" );
      const _r = function( s, d ) {
        globals.body.removeClassName( s ).addClassName( d );
      }
      globals.headerState++;
      globals.headerState %= 3;
      switch( globals.headerState ) {
        case 1:
          _r( "normal", "fixed" );
        break;
        case 2:
          _r( "fixed", "box" );
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
          _r( "box", "normal" );
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
      [ "Peers", "peerDiv", [ "id", "peers", "peersFrom" ], showPeers ],
      [ "Trackers", "trackerDiv", [ "id", "trackerStats" ], showTrackers ],
      [ "Details", "detailsTable", globals.torrentDetailsUpdateKeys, showDetails ]
    ].map( function( a ) {
      return rM( a[ 0 ], function( handler ) {
        globals.menu.active = a[ 1 ];
        globals.menu.main.hideAll();
        globals.menu.torrent.showAll();
        const torrent = globals.currentTorrent;
        if( globals.oldTorrent !== torrent ) {
          globals.oldTorrent = torrent;
          globals.content.select( ".torrent" ).invoke( "remove" );
        }
        if( torrent.pieces ) { // A field not used in list view.
          handler();
        }
        else {
          fetchTorrents( globals.torrentFieldKeys, [ torrent.id ], function( response ) {
            updateTorrents( response );
            handler();
          } );
        }
      }.curry( function( menu, tableId, fields, renderer ) {
        if( !menuSelect( menu ) ) {
          return;
        }
        showWait();
        const table = showContent( tableId );
        if( !( table && table.wasVisible ) ) {
          const torrent = globals.currentTorrent;
          globals.shift.torrentUpdater.mod( { fields: fields, ids: [ torrent.id ] }, function( response ) {
            updateTorrents( response );
            renderer( torrent );
            showDone();
          } );
          document.body.scrollTop = 0;
          document.documentElement.scrollTop = 0;
        }
      }.curry( a[ 0 ], a[ 1 ], a[ 2 ], a[ 3 ] ) ) );
    } ),
    session: [
      rM( "Shift", function() {
        if( menuSelect( "shift" ) ) {
          globals.menu.active = "shiftTable";
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
    group.invoke( "addClassName", "sub" ).hideAll();
  } );

  header.insert( rE( "menu", { id: "menu" } )
    .insert( rM( "Torrents", function() {
      if( menuSelect( "torrents" ) ) {
        globals.menu.active = "torrentTable";
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
        globals.menu.active = "sessionTable";
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
  return { body: ( torrent.hashString ? torrent.hashString + "\n" : "" ) + torrent.name + ( s || "" ) };
}

function notifyUpload( response ) {
  const args = getArguments( response );
  var t;
  if( t = args[ "torrent-added" ] ) {
    sendNotification( 3, "Torrent added.", getBody( t ) );
    return 1;
  }

  if( t = args[ "torrent-duplicate" ] ) {
    sendNotification( 2, "Duplicate torrent.", getBody( t ) );
    return 2;
  }

  return 0;
}

const _uploads = [];

function upload( uploads, target, start ) {
  const preLoad = true;
  const d = globals.dialogs && globals.dialogs.upload;
  d.start.setValue( start );

  if( isEmpty( uploads ) ) {
    return;
  }

  const _upload = function( u ) {
    u.update( "uploading" );
    u.node && u.node.scrollIntoView( false );

    // Upload the item first to see if Transmission can handle it.
    addTorrent( u.result || u.url, function( response ) {
      var replaceMagnet = globals.shift.settings.replaceMagnet;
      if( success( response ) ) {
        const args = getArguments( response );
        args.torrents = [ args[ "torrent-added" ] || args[ "torrent-duplicate" ] ];
        if( replaceMagnet = replaceMagnet && args[ "torrent-duplicate" ] && u.result ) {
          const t = globals.torrentHash[ args.torrents[ 0 ].id ];
          if( replaceMagnet = replaceMagnet && t.isMagnet() ) {
            doRequest( "torrent-remove", { ids: [ t.id ] }, function( response ) {
              u.update( success( response ) ? "loaded" : "duplicate" );
            } );
          }
        }
        else {
          filterTorrents( updateTorrents( response, true ) );
        }
      }
      else {
        // Transmisssion could not handle the item. Parse it for URL extraction.
        const textReader = _reader( function() {
          upload( textReader.result.match( torrentRegExp ), target, start );
        } );
        textReader.readAsText( u );
        u.update( "processing" );
        return _next();
      }

      switch( notifyUpload( response ) ) {
        case 1:
          u.update( "added" );
          if( u.url && u.url.startsWith( "magnet:" ) ) {
            globals.magnets.push( t.id );
          }
          break;

        case 2:
          !replaceMagnet && u.update( "duplicate" );
          break;
      }
      _next();
    }, target, start, function( request ) {
      u.request = request;
    } );
  }

  const _url = function( s ) {
    var name = decodeURIComponent( s );
    return {
      url: s,
      name: name.startsWith( "magnet:" ) ? magnetNameRegExp.exec( name )[ 1 ] : getFilePart( name )
    }
  }

  const uploadsElement = $( "uploads" );
  const uploading = !isEmpty( _uploads );
  uploads.each( function( u ) {
    if( _uploads.find( function( existing ) {
      return u === existing.url || u.name === existing.name;
    } ) ) {
      return;
    }
    const isUrl = !u.name;
    u = isUrl ? _url( u ) : u;
    uploadsElement.insert( _uploads.squeak( function( u ) {
      u.clear = function( clearNode ) {
        _uploads.remove( this );
        this.request && this.request.transport && this.request.transport.abort && this.request.transport.abort();
        delete this.request;
        delete this.name;
        delete this.result;
        delete this.update;
        delete this.url
        if( clearNode ) {
          delete this.clear;
          delete this.node.item;
          this.node.remove();
          delete this.node;
          !d.silent.value && showPopup( "popupUpload" );
        }
      }.bind( u );
      u.update = function( status ) {
        this.status = status;
        this.node.down( "led" ).value = status;
      }.bind( u );
      u.node = rD( "upload" ).insert( rLed( false ), u.name );
      u.node.item = u;
      return u;
    } ( u ) ).node );
    isUrl && u.update( "loaded" );
  } );

  uploadsElement.show();
  showPopup( "popupUpload" );

  if( uploading ) {
    return;
  }

  const _reader = function( onLoad ) {
    return Event.observe( new FileReader(), "load", onLoad );
  }

  const _load = function( file, onLoad ) {
    if( "loaded" === file.status ) {
      return onLoad( file );
    }

    file.update( "loading" );
    const r = _reader( function( e ) {
      file.update( "loaded" );
      file.result = e.target.result;
      onLoad( file )
    } );
    r.readAsDataURL( file );
  }

  const _next = function() {
    if( isEmpty( _uploads ) ) {
      sortTorrents();
      renderTorrents();
      return;
    }

    var u = _uploads.find( function( u ) {
      return "uploading" === u.status;
    } );

    if( !u ) {
      u = _uploads.find( function( u ) {
        return "loaded" === u.status;
      } );
      u && _upload( u );
    }

    for( var i = 0; i < _uploads.length; ++i ) {
      u = _uploads[ i ];
      var clearNode = false;
      switch( u.status ) {
        case "added":
          clearNode = true;
        case "duplicate":
          _uploads.remove( u );
          !d.keep.value && u.clear( clearNode );
          break;
        case undefined:
          _load( u, preLoad ? _next : _upload );
          return;
      }
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
    soundDone = riffwave( audioWave );
  }
  s.doneSound = new Audio( soundDone );
  s.doneSound.setId( "doneSound" );
}

function renderTitle() {
  const s = globals.shift;
  if( s.settings.showSpeedTitle && s.sessionStats ) {
    document.title = renderers[ "downloadSpeed" ]( s.sessionStats.downloadSpeed ) + " \u25BC\u25B2 " + renderers[ "uploadSpeed" ]( s.sessionStats.uploadSpeed );
  }
  else {
    document.title = "Shift " + s.version + " / Transmission " + s.session.version;
  }
}

function getVisible( selector ) {
  return globals.body.select( selector ).filter( Element.visible ).find( function( e ) { return e.offsetParent } ) || null;
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

function handleKeyDown( e ) {
  const kc = e.keyCode;
  if( 27 !== kc && ( e.isComposing || 229 === kc || [ "BUTTON", "TEXTAREA" ].includes( e.target.tagName ) ) ) {
    return true;
  }

  if( e.ctrlKey && ( kc < 49 || 57 < kc ) ) { // 1..9
    return true;
  }

  var keys = globals.keys[ globals.tableKeys.find( function( id ) {
    const t = $( id );
    return t && t.visible();
  } ) ];

  var action = keys && keys[ kc ] || globals.keys[ "default" ][ kc ];
  if( action ) {
    preventDefault( e );
    return action( e );
  }
  console.log( e );
}

function handleKeyUp( e ) {
  if( undefined !== globals.select && 32 === e.keyCode ) { // Space
    delete globals.select;
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
    s.resolve( undefined, function( m ) {
      var kv = m.substring( 2, m.length - 1 ).split( "." );
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

  var s = window.location.href;
  const i = s.indexOf( "uri=" );
  if( -1 !== i ) {
    globals.body.update( "Uploading ..." );
    addTorrent( decodeURIComponent( s.substring( i + 4 ) ).match( torrentRegExp )[ 0 ], function( response ) {
      const n = notifyUpload( response );
      if( 0 === n ) {
        s = "Error. Status " + r.status + ": " + r.statusText + ".";
        sendNotification( 1, s, { body: s } );
      }
      globals.body.insert( [ response.statusText, " added!", " duplicate!" ][ n ] );

      setTimeout( function() {
        window.history.back();
        window.close();
      }, 2000 );
    } );
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

    const d = e.dataTransfer;
    if( d && !isEmpty( d.files ) ) {
      const files = Array.from( d.files );
      return upload( isEmpty( files ) ? [ t.getData( "URL" ) ] : files );
    }

    if( !globals.drag ) {
      return;
    }

    const s = d.getData( "text" );
    const source = globals.dragSource;
    const target = $( e.target );

    if( "labelFilterInput" === target.id ) {
      return target.addFilterLabel( { target: { title: s } } );
    }

    if( target.hasClassName( "trash" ) ) {
      var labels;
      switch( source.id ) {
        case "labels":
          labels = globals.shift.settings.labels.remove( s );
          store( globals.shift.settings );
          const other = $( "shiftLabels" );
          other && other._data.replace( labels ).renderLabels();
          break;

        case "dynaLabels":
          labels = globals.dynaLabels.remove( s );
          break

        case "shiftLabels":
          labels = source._data.remove( s );
          break

        default:
          return fixLabels( false, s, getRowTorrent( source ) );
      }
      return labels.renderLabels();
    }

    if( "shiftLabels" === source.id ) {
      const row = target.up( "tr.rule" );
      if( row ) {
        row.down( "span.labels" )._data.pushUnique( s ).renderLabels();
      }
    }

    const l = target.up( "span.labels" );
    if( l ) {
      if( l === source ) {
        l._data.remove( s ).splice( l.indexOf( globals.drag ), 0, s );

        switch( l.id ) {
          case "dynaLabels":
            return;

          case "labels":
            store( globals.shift.settings );
            const other = $( "shiftLabels" );
            other && other._data.replace( globals.shift.settings.labels ).renderLabels();
            return;

          case "shiftLabels":
            return;

        }
        l.insertBefore( globals.drag, globals.drag._next );
      }
      else {
      }
      return;
    }

    getRowTorrent( target, true );
    getSelected().shiftEach( fixLabels.curry( $( "addLabel" ).value, s ) );
    delete globals.drag;
  } );

  doRequest( { url: "shift.json", evalJSON: "force", method: "get", onSuccess: function( response ) {
    const d = globals.shift.defaultSettings = response.responseJSON;
    const s = globals.shift.settings = function() {
      const j = function( s ) {
        return s && window.atob( s ).evalJSON() || {};
      }
      return Object.extend( Object.extend( Object.extend( {}, d ), j( localStorage.getItem( STORE_KEY ) ) ), j( retrieve( STORE_KEY ) ) );
    } ();

    for( var k in d ) {
      var o = d[ k ];
      var t = s[ k ];
      if( Object.isArray( o ) ) {
        switch( k ) {
          case "labelMaticRules":
            o.each( function( r1 ) {
              if( !t.find( function( r2 ) {
                return Object.equals( r1, r2 );
              } ) ) {
                t.push( o );
              }
            } );

          case "labels":
            continue;
        }
        t.pushUnique( o );
      }
    }

    globals.rules = s.labelMaticRules && s.labelMaticRules.map( toRule ) || [];

    for( var k in s ) {
      if( undefined === d[ k ] ) {
        delete s[ k ];
      }
    }

    setStylesheet();
    window.matchMedia && window.matchMedia( darkMedia ).addEventListener( "change", setStylesheet );
    renderDoneSound();
    registerMagnetHandler();

    extractTemplateFields( globals.shift.settings );

    if( !isEmpty( globals.shift.settings.mimeTypeIconTemplate ) ) {
      doRequest( { url: "mime.types", method: "get", onSuccess: function( response ) {
        var m;
        while( ( m = mimeTypeMapRegExp.exec( response.responseText ) ) !== null ) {
          if( m.index === mimeTypeMapRegExp.lastIndex ) {
            mimeTypeMapRegExp.lastIndex++;
          }
          globals.mimeTypes[ m[ 1 ] ] = m[ 2 ];
        }
      } } );
    }
  } } );

  // Get first time session data and initialize page.
  doRequest( "session-get", {}, function( response ) {
    function _remove() {
      const fields = Array.from( arguments );
      fields.each( function( field ) {
        const f = field.split( "." );
        const k = f.shift();
        var o = torrentFields;
        switch( k ) {
        case "session":
          o = sessionFields;
          break;
        case "shift":
          o = globals.shift.settings;
          break;
        default:
          f.unshift( k );
        }
        Object.without( o, f.join( "." ) );
      } )
    }

    globals.shift.session = getArguments( response );
    globals.version = +globals.shift.session[ "rpc-version" ];
    if( globals.version < 18 ) { // 4.10
      _remove( "files.beginPiece", "files.endPiece", "sequentialDownload" );
    }
    if( globals.version < 17 ) { // 4.00
      _remove( "availability", "file-count", "group", "percentComplete", "primary-mime-type", "shift.mimeTypeIconTemplate", "trackerList", "trackerStats.sitename" );
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
    }
    if( globals.version < 10 ) { // 2.10
      delete shiftFields.trackers;
      delete globals.shift.settings.trackers;
    }
    if( globals.version < 6 ) { // 1.70
      torrentActionLabels.remove( "Relocate" );
    }

    const _status = function( l, b, f ) {
      for( var i = 0; i < l; ++i ) {
        b & 1 << i && f( ts[ i - 1 ] );
      }
    }.curry( Object.keys( ts ).length );

    for( var k in torrentFields ) {
      const v = torrentFields[ k ];
      globals.torrentFieldKeys.push( k );
      v._ro = v._ro || !v.edit;
      if( !v._ignore && !v.nup ) {
        globals.torrentDetailsUpdateKeys.push( k );
      }
      v._column && ( torrentColumns[ k ] = v._column );
      v.sb && _status( v.sb, function( s ) { s.fields.push( k ) } );
      delete v.sb;
      v.static && globals.staticFields.push( k );
      undefined !== v.value && ( globals.torrentDefaults[ k ] = v.value );
    }

    Object.sort( torrentColumns, "order" );
    for( var k in torrentColumns ) {
      globals.columnKeys.push( k );
      const v = torrentColumns[ k ];
      delete v.order;
      globals.torrentColumnHash.push( v );
      globals.filters.push( v.filter );
      v.sb && _status( v.sb, function( s ) { s.columns[ k ] = v } );
      delete v.sb;
    }

    globals.filters.pack().sortByProperty( "cost", true );
    globals.updateFields = getStatus().fields;

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

    if( globals.version < 14 ) { // 2.40
      Object.copyNestedProperties( {
        "-1": ts[ "-1" ],
        1: ts[ 1 ],
        2: ts[ 2 ],
        4: ts[ 4 ],
        8: ts[ 6 ],
        16: ts[ 0 ]
      }, Object.clear( ts ) );
    }

    globals.sortProperty = updateOrder( torrentColumns );

    Object.copyNestedProperties( torrentFields, torrentColumns, Object.keys( torrentColumns ), [ "sss" ] );

    renderTitle();
    renderPage();

    var keys = globals.keys[ "torrentTable" ];
    globals.torrentStatusKeyHash = Object.entries( ts ).reduce( function( r, e ) {
      const kc = e[ 1 ].keyCode;
      const a = r[ kc ] || [];
      a.unshift( e[ 0 ] );
      keys[ kc ] = keys[ 65 ]; // a ->
      r[ kc ] = a;
      return r;
    }, {} );

    Object.values( globals.keys ).each( function( m ) {
      Object.keys( m ).each( function( k ) {
        const v = m[ k ];
        if( Object.isNumber( v ) ) {
          m[ k ] = m[ v ]
        }
        else if( Object.isString( v ) ) {
          var f = globals.functionMap[ v ];
          if( f ) {
            return m[ k ] = f;
          }
          f = function( id, e ) {
            const headers = $( id ).select( "th" ).filter( Element.visible ).filter( function( column ) {
              return column.id.startsWith( "h_" ) && "h_menu" !== column.id;
            } );
            const h = headers[ ( ( e.keyCode - 39 ) % 10 ).limit( 0, headers.length - 1 ) ]; // 1..9,0
            if( e.ctrlKey ) {
              const l = h.down( "led" );
              l && l.click();
            }
            else {
              globals.shiftKey = e.shiftKey;
              h.click();
            }
          }.curry( v );

          k = +k; // Numerical object keys are silently converted to strings.
          $R( k, k + 9 ).each( function( k ) { m[ k ] = f } );
        }
      } );
    } );

    globals.tableKeys = Object.keys( globals.keys ).without( "default" );

    if( rd && globals.shift.settings.showExitMessage ) {
      showPopup( "popupReload" );
    }
    updateFields( globals.shift.session );

    fetchTorrents( [ "id", "status" ], undefined, function( response ) {
      updateTorrents( response );

      // Get full update for visible torrents and start periodical updaters.
      fetchTorrents( globals.staticFields.concat( globals.updateFields ), filterStatus().ids(), function( response ) {
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
          Object.copyNestedProperties( args, po.arguments )
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
      showTorrentTable();
      setTorrentsColumnsVisible();
      delete globals.init;
    } );
  } );
} );

Event.observe( window, "beforeunload", function() {
  const date = new Date();
  date.setTime( date.getTime() + 31 * DAY_MS );
  document.cookie = RELOAD_KEY + Date.now() + "; expires=" + date + "; SameSite=strict";
} );
