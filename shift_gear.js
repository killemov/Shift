/**
 * Shift: a Transmission web interface.
 *
 * © 2024 Killemov.
 *
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/ or send a
 * letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 *
 * Here are some example functions to demonstrate how to easily add functionality without hacking the
 * main shift.js source. It is advised to move changes already made to shift.js here if possible.
 */

document.observe( "dom:loaded", function() {

  // Mark top-level file/folder for manipulation on the file system.
  const _mark = rM( "Mark", function( e ) {
    closePopup();

    const PRE = "_rm_";
    const selected = getSelected();

    const _rename = function() {
      renameFiles( selected.map( function( t ) {
        var n = t.files[ 0 ].name.substringTo( "/" );
        return n.startsWith( PRE ) ? null : { ids: [ t.id ], path: n, name: PRE + n };
      } ).compact() );
    }

    const ids = selected.filter( function( t ) { return !t.files } ).pluck( "id" );
    if( !ids.length ) {
      return _rename();
    }

    fetchTorrents( [ "id", "files" ], ids, function( response ) {
      if( success( response ) ) {
        updateTorrents( response );
        _rename();
      }
    } );
  } );

  // Deselect large files.
  const _minimize = rM( "Minimize", function( e ) {
    closePopup();

    const _MAX = 268435456; // 256 MB
    const selected = getSelected();
    const ids = selected.pluck( "id" );

    selected.shiftEach( function( t, _next ) {
      const _deselect = function() {
        const unwanted = t.files.map( function( f, index ) { return _MAX < f.length ? index : null } ).compact();
        if( unwanted.length ) {
          fixTorrents( { ids: [ t.id ], "files-unwanted": unwanted }, _next );
        }
      }

      if( t.files && t.files.length ) {
        _deselect();
      }
      else {
        fetchTorrents( [ "id", "files" ], [ t.id ], function( response ) {
          if( success( response ) ) {
            updateTorrents( response );
            _deselect();
          }
        } );
      }
    }, function() {
      fetchTorrents( [ "id", "sizeWhenDone" ], ids, function( response ) {
        if( success( response ) ) {
          filterTorrents( updateTorrents( response ) );
        }
      } );
    } );
  } );

  // Wait for existence of an element.
  const _wait = function( e, init ) {
    if( $( e ) ) {
      return init();
    }
    setTimeout( _wait, 1000, e, init );
  }

  // Insert elements into main torrent view.
  _wait( "torrentTable", function() {
    const e = $( "relocate" );
    if( !e ) {
      return;
    }
    e.insert( { after: _mark } );
    e.insert( { after: _minimize } );
  } );
} );
